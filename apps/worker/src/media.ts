import { readdir, stat } from "node:fs/promises"
import { execFile } from "node:child_process"
import { join, relative } from "node:path"
import { promisify } from "node:util"
import type { BroadcastQueueItem } from "@blocktek/radio-core"

const AUDIO_EXTENSIONS = new Set([".mp3", ".ogg", ".opus", ".wav", ".flac", ".m4a", ".aac"])
const execFileAsync = promisify(execFile)

async function probeDuration(path: string): Promise<number | undefined> {
  try {
    const { stdout } = await execFileAsync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", path])
    const duration = Number(String(stdout).trim())
    return Number.isFinite(duration) && duration > 0 ? duration : undefined
  } catch {
    return undefined
  }
}

export async function discoverMedia(root: string, fallbackPath: string | undefined, testTone: boolean): Promise<BroadcastQueueItem[]> {
  const paths: string[] = []
  async function visit(directory: string) {
    try {
      for (const entry of await readdir(directory, { withFileTypes: true })) {
        const path = join(directory, entry.name)
        if (entry.isDirectory()) await visit(path)
        else if (AUDIO_EXTENSIONS.has(entry.name.slice(entry.name.lastIndexOf(".")).toLowerCase())) paths.push(path)
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error
    }
  }
  await visit(root)
  if (fallbackPath && fallbackPath !== root) {
    try {
      const fallbackStat = await stat(fallbackPath)
      if (fallbackStat.isDirectory()) {
        if (!fallbackPath.startsWith(root)) await visit(fallbackPath)
      } else if (AUDIO_EXTENSIONS.has(fallbackPath.slice(fallbackPath.lastIndexOf(".")).toLowerCase())) {
        paths.push(fallbackPath)
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error
    }
  }
  paths.sort((a, b) => a.localeCompare(b))
  const files = await Promise.all(paths.map(async (path, index): Promise<BroadcastQueueItem> => ({
      id: `media-${index + 1}`,
      title: relative(root, path),
      artist: "BlockTek Radio Library",
      album: null,
      artworkUrl: null,
      programme: null,
      startedAt: new Date().toISOString(),
      source: path.includes("fallback") ? "fallback" : "music",
      path,
      durationSeconds: await probeDuration(path),
    })))
  if (!files.length && testTone) files.push({ id: "development-test-tone", title: "Development Test Tone", artist: "BlockTek Radio", album: null, artworkUrl: null, programme: null, startedAt: new Date().toISOString(), source: "fallback", path: "tone://440" })
  return files
}
