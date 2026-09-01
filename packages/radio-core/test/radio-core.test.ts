import assert from "node:assert/strict"
import test from "node:test"
import { takeUntilDuration, totalDurationSeconds } from "../src/index.js"

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
