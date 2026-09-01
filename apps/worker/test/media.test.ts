import assert from "node:assert/strict"
import test from "node:test"
import { discoverMedia } from "../src/media.js"

test("media discovery is deterministic and can provide an explicit test tone", async () => {
  const items = await discoverMedia("/path/that/does/not/exist", undefined, true)
  assert.equal(items[0]?.id, "development-test-tone")
  assert.equal(items[0]?.source, "fallback")
})
