import assert from "node:assert/strict"
import test from "node:test"
import { checkStream } from "../src/stream.js"

const stream = {
  id: "stream-1",
  channelId: "channel-1",
  name: "Test stream",
  url: "https://radio.example.test/live",
  enabled: true,
  health: "unknown" as const,
  checkedAt: null,
  dataStatus: "REAL" as const,
}

test("stream checks preserve configured identity and record reachable health", async () => {
  const checked = await checkStream(stream, async (url) => {
    assert.equal(url, stream.url)
    return "reachable"
  })
  assert.equal(checked?.health, "reachable")
  assert.ok(checked?.checkedAt)
  assert.equal(checked?.url, stream.url)
})

test("disabled and missing streams do not probe", async () => {
  assert.equal(await checkStream(null, async () => "reachable"), null)
  assert.equal(await checkStream({ ...stream, enabled: false }, async () => "reachable"), null)
  assert.equal(await checkStream({ ...stream, url: null }, async () => "reachable"), null)
})
