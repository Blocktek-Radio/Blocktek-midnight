import { spawn, type ChildProcess } from "node:child_process"
import { mkdir } from "node:fs/promises"
import { selectBroadcastItem, type BroadcastQueueItem } from "@blocktek/radio-core"
import { discoverMedia } from "./media.js"
import { BroadcastStore } from "./store.js"

const env = process.env
const bool = (value: string | undefined) => value?.toLowerCase() === "true"
const log = (message: string, data?: Record<string, unknown>) => console.log(JSON.stringify({ service: "blocktek-worker", message, ...data, at: new Date().toISOString() }))

async function runTrack(item: BroadcastQueueItem, sourceUrl: string): Promise<{ code: number | null; signal: NodeJS.Signals | null }> {
  const input = item.path.startsWith("tone://") ? ["-f", "lavfi", "-i", "sine=frequency=440:sample_rate=44100"] : ["-i", item.path]
  const child: ChildProcess = spawn("ffmpeg", ["-hide_banner", "-loglevel", "warning", "-re", ...input, "-vn", "-ac", "2", "-c:a", "libmp3lame", "-b:a", env.RADIO_AUDIO_BITRATE || "128k", "-content_type", "audio/mpeg", "-ice_name", env.RADIO_STATION_NAME || "BlockTek Radio", "-f", "mp3", sourceUrl], { stdio: ["ignore", "ignore", "pipe"] })
  child.stderr?.on("data", (chunk: Buffer) => log("audio process", { output: chunk.toString().trim().slice(0, 500) }))
  return new Promise((resolve, reject) => { child.on("error", reject); child.on("exit", (code, signal) => resolve({ code, signal })) })
}

async function run() {
  if (!bool(env.RADIO_BROADCAST_ENABLED)) { log("broadcast not configured", { reason: "RADIO_BROADCAST_ENABLED is false" }); return }
  if (!env.DATABASE_URL || !env.ICECAST_SOURCE_PASSWORD || !env.ICECAST_HOST) { log("broadcast not configured", { reason: "DATABASE_URL, ICECAST_SOURCE_PASSWORD, and ICECAST_HOST are required" }); return }
  const mediaRoot = env.MEDIA_ROOT || "/opt/blocktek-radio/media"; await mkdir(mediaRoot, { recursive: true })
  const items = await discoverMedia(mediaRoot, env.FALLBACK_AUDIO_PATH, bool(env.RADIO_TEST_TONE_ENABLED)); if (!items.length) { log("no media configured", { mediaRoot }); return }
  const store = new BroadcastStore(env.DATABASE_URL); await store.syncMediaAssets(items); const mount = env.ICECAST_MOUNT || "/live"; const sessionId = await store.startSession(env.RADIO_STATION_ID || "blocktek-main", mount)
  const sourceUrl = `icecast://${encodeURIComponent(env.ICECAST_SOURCE_USER || "source")}:${encodeURIComponent(env.ICECAST_SOURCE_PASSWORD)}@${env.ICECAST_HOST}:${env.ICECAST_PORT || "8000"}${mount}`
  let stopping = false; let currentIndex = -1
  const nextItem = async () => { const aiItem = await store.claimNextAiItem(); if (aiItem) return aiItem; currentIndex = (currentIndex + 1) % items.length; const programmeTitle = await store.currentProgrammeTitle(); return selectBroadcastItem(programmeTitle ? { startTime: "", endTime: "", title: programmeTitle } : null, items[currentIndex], null) }
  const shutdown = async (signal: string) => { if (stopping) return; stopping = true; log("broadcast stopping", { signal }); await store.stopSession(sessionId); await store.close() }
  process.once("SIGTERM", () => void shutdown("SIGTERM")); process.once("SIGINT", () => void shutdown("SIGINT"))
  try {
    while (!stopping) { const item = await nextItem(); if (!item) throw new Error("no playable broadcast item"); item.startedAt = new Date().toISOString(); await store.event(sessionId, "track_started", item); log("track started", { id: item.id, title: item.title, source: item.source, programme: item.programme }); const result = await runTrack(item, sourceUrl); if (item.programme) await store.completeAiItem(item); if (stopping) break; if (result.code !== 0) throw new Error(`audio process exited (${result.code ?? result.signal ?? "unknown"})`) }
  } catch (error) { const message = error instanceof Error ? error.message : String(error); log("broadcast worker failed", { error: message }); await store.stopSession(sessionId, message); await store.close(); process.exitCode = 1 }
}
void run().catch((error) => { log("broadcast worker failed", { error: error instanceof Error ? error.message : String(error) }); process.exitCode = 1 })
