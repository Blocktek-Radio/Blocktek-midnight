import type { Stream, StreamHealth } from "@blocktek/types"

export type StreamProbe = (url: string) => Promise<StreamHealth>

export async function probeStream(url: string, timeoutMs = 3000): Promise<StreamHealth> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(url, { method: "HEAD", redirect: "follow", signal: controller.signal })
    if (response.ok) return "reachable"
    // Icecast may reject HEAD with 400 even while a mount is actively streaming.
    const fallback = await fetch(url, { headers: { range: "bytes=0-0" }, redirect: "follow", signal: controller.signal })
    await fallback.body?.cancel()
    return fallback.ok || fallback.status === 206 ? "reachable" : "unreachable"
  } catch {
    return "unreachable"
  } finally {
    clearTimeout(timeout)
  }
}

export async function checkStream(stream: Stream | null, probe: StreamProbe = probeStream): Promise<Stream | null> {
  if (!stream?.url || !stream.enabled) return null
  const health = await probe(stream.url)
  return { ...stream, health, checkedAt: new Date().toISOString() }
}
