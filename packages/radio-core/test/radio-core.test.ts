import assert from "node:assert/strict"
import test from "node:test"
import { createRadioSeed, InMemoryRadioRepository, orderQueue, programmeStatus, radioStatusForStream, takeUntilDuration, totalDurationSeconds } from "../src/index.js"

const tracks = [
  { durationSeconds: 180 },
  { durationSeconds: 240 },
  { durationSeconds: 300 },
]

test("calculates queue duration", () => {
  assert.equal(totalDurationSeconds(tracks), 720)
})

test("takes complete tracks up to programme duration", () => {
  assert.deepEqual(takeUntilDuration(tracks, 7), tracks.slice(0, 2))
})

test("derives radio status from stream health instead of configuration alone", () => {
  assert.equal(radioStatusForStream(null), "NOT_CONFIGURED")
  assert.equal(radioStatusForStream({ enabled: true, url: "https://radio.example.test/live", health: "unknown" }), "CONNECTING")
  assert.equal(radioStatusForStream({ enabled: true, url: "https://radio.example.test/live", health: "reachable" }), "LIVE")
  assert.equal(radioStatusForStream({ enabled: true, url: "https://radio.example.test/live", health: "unreachable" }), "OFFLINE")
})

test("classifies programmes by their schedule window", () => {
  const now = new Date("2026-09-01T12:00:00.000Z")
  assert.equal(programmeStatus("2026-09-01T11:00:00.000Z", "2026-09-01T13:00:00.000Z", now), "CURRENT")
  assert.equal(programmeStatus("2026-09-01T13:00:00.000Z", "2026-09-01T14:00:00.000Z", now), "UPCOMING")
  assert.equal(programmeStatus("2026-09-01T09:00:00.000Z", "2026-09-01T11:00:00.000Z", now), "PAST")
})

test("orders the deterministic seed queue and exposes demo provenance", async () => {
  const seed = createRadioSeed({ now: new Date("2026-09-01T12:00:00.000Z") })
  const repository = new InMemoryRadioRepository(seed)
  const queue = orderQueue(await repository.getQueue(), 2)
  assert.deepEqual(queue.map((item) => item.track.id), ["track-001", "track-002"])
  assert.equal(queue[0]?.track.dataStatus, "DEMO")
})
