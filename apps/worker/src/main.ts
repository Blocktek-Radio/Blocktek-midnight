import { spawn, type ChildProcess } from "node:child_process"
import { mkdir } from "node:fs/promises"
import { join } from "node:path"
import { selectBroadcastItem, type BroadcastQueueItem } from "@blocktek/radio-core"
import { discoverMedia } from "./media.js"
import { BroadcastStore } from "./store.js"

const env = process.env
const bool = (value: string | undefined) => value?.toLowerCase() === "true"
const log = (message: string, data?: Record<string, unknown>) => console.log(JSON.stringify({ service: "blocktek-worker", message, ...data, at: new Date().toISOString() }))

type Runtime = { process: ChildProcess | null; stopping: boolean; sessionId: string | null; store: BroadcastStore | null; currentIndex: number; itemTimer: NodeJS.Timeout | null }

async function run() {
  if (!bool(env.RADIO_BROADCAST_ENABLED)) { log("broadcast not configured", { reason: "RADIO_BROADCAST_ENABLED is false" }); return }
  if (!env.DATABASE_URL || !env.ICECAST_SOURCE_PASSWORD) { log("broadcast not configured", { reason: "DATABASE_URL and ICECAST_SOURCE_PASSWORD are required" }); return }
  if (!env.ICECAST_HOST) { log("broadcast not configured", { reason: "ICECAST_HOST is required" }); return }

  const mediaRoot = env.MEDIA_ROOT || "/opt/blocktek-radio/media"
  await mkdir(mediaRoot, { recursive: true })
  const items = await discoverMedia(mediaRoot, env.FALLBACK_AUDIO_PATH, bool(env.RADIO_TEST_TONE_ENABLED))
  if (!items.length) { log("no media configured", { mediaRoot, fallback: env.FALLBACK_AUDIO_PATH || null }); return }

  const mount = env.ICECAST_MOUNT || "/live"
  const playlistPath = join("/tmp", "blocktek-playlist.txt")
  // The playlist is generated from operator-supplied files and is never committed.
  const { writeFile } = await import("node:fs/promises")
  await writeFile(playlistPath, items.filter((item) => !item.path.startsWith("tone://")).map((item) => `file '${item.path.replaceAll("'", "'\\''")}'`).join("\n"))

  const store = new BroadcastStore(env.DATABASE_URL)
  await store.syncMediaAssets(items)
  const sessionId = await store.startSession(env.RADIO_STATION_ID || "blocktek-main", mount)
  const runtime: Runtime = { process: null, stopping: false, sessionId, store, currentIndex: -1, itemTimer: null }

  const sourceUrl = `icecast://${encodeURIComponent(env.ICECAST_SOURCE_USER || "source")}:${encodeURIComponent(env.ICECAST_SOURCE_PASSWORD)}@${env.ICECAST_HOST}:${env.ICECAST_PORT || "8000"}${mount}`
  const args = items.some((item) => item.path.startsWith("tone://")) && items.length === 1
    ? ["-hide_banner", "-loglevel", "warning", "-re", "-f", "lavfi", "-i", "sine=frequency=440:sample_rate=44100", "-ac", "2", "-c:a", "libmp3lame", "-b:a", env.RADIO_AUDIO_BITRATE || "128k", "-content_type", "audio/mpeg", "-ice_name", env.RADIO_STATION_NAME || "BlockTek Radio", "-f", "mp3", sourceUrl]
    : ["-hide_banner", "-loglevel", "warning", "-re", "-stream_loop", "-1", "-f", "concat", "-safe", "0", "-i", playlistPath, "-vn", "-c:a", "libmp3lame", "-b:a", env.RADIO_AUDIO_BITRATE || "128k", "-content_type", "audio/mpeg", "-ice_name", env.RADIO_STATION_NAME || "BlockTek Radio", "-f", "mp3", sourceUrl]
  const startItem = async (): Promise<BroadcastQueueItem | null> => {
    runtime.currentIndex = (runtime.currentIndex + 1) % items.length
    const programmeTitle = await store.currentProgrammeTitle()
    const item = selectBroadcastItem(programmeTitle ? { startTime: "", endTime: "", title: programmeTitle } : null, items[runtime.currentIndex], null)
    if (item) { item.startedAt = new Date().toISOString(); await store.event(sessionId, "track_started", item); log("track started", { id: item.id, title: item.title, source: item.source }) }
    return item
  }
  const scheduleNextItem = async () => {
    if (runtime.stopping) return
    const item = await startItem()
    const durationSeconds = Math.max(15, item?.durationSeconds || Number(env.RADIO_METADATA_INTERVAL_SECONDS || 180))
    runtime.itemTimer = setTimeout(() => { void scheduleNextItem() }, durationSeconds * 1000)
  }
  await scheduleNextItem()
  const child = spawn("ffmpeg", args, { stdio: ["ignore", "ignore", "pipe"] })
  runtime.process = child
  child.stderr?.on("data", (chunk: Buffer) => log("audio process", { output: chunk.toString().trim().slice(0, 500) }))
  child.on("error", async (error) => { log("audio process failed", { error: error.message }); if (runtime.sessionId) await store.event(sessionId, "track_failed", null, error.message) })
  child.on("exit", (code, signal) => {
    log("audio process exited", { code, signal })
    if (!runtime.stopping) void store.stopSession(sessionId, `audio process exited (${code ?? signal ?? "unknown"})`)
      .finally(async () => { await store.close(); process.exit(1) })
  })
  const shutdown = async (signal: string) => {
    if (runtime.stopping) return
    runtime.stopping = true
    if (runtime.itemTimer) clearTimeout(runtime.itemTimer)
    log("broadcast stopping", { signal })
    child.kill("SIGTERM")
    await store.stopSession(sessionId)
    await store.close()
    process.exit(0)
  }
  process.once("SIGTERM", () => void shutdown("SIGTERM"))
  process.once("SIGINT", () => void shutdown("SIGINT"))
}

void run().catch((error) => { log("broadcast worker failed", { error: error instanceof Error ? error.message : String(error) }); process.exitCode = 1 })
