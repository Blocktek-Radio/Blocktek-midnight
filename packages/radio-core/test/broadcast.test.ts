import assert from "node:assert/strict"
import test from "node:test"
import { selectBroadcastItem } from "../src/index.js"

const item = { id: "track-1", title: "Signal", artist: "BlockTek", album: null, artworkUrl: null, programme: null, startedAt: "2026-01-01T00:00:00.000Z", source: "music" as const, path: "/media/signal.mp3" }
test("deterministic broadcast selection prefers queued media and annotates programme", () => {
  assert.equal(selectBroadcastItem({ startTime: "", endTime: "", title: "Night Signal" }, item, null)?.programme, "Night Signal")
  assert.equal(selectBroadcastItem(null, null, item)?.id, "track-1")
})
