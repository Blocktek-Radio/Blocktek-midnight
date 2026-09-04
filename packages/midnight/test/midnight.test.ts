import assert from "node:assert/strict"
import test from "node:test"
import { UnconfiguredMidnightAdapter, canonicalize, contentCommitment, eligibilityDisclosure } from "../src/index.js"

test("unconfigured Midnight adapter cannot claim proof verification", async () => {
  const adapter = new UnconfiguredMidnightAdapter()
  assert.equal(adapter.status().status, "NOT_CONFIGURED")
  await assert.rejects(adapter.verifyEligibility({}), /not configured/)
})

test("eligibility disclosure hides identity fields", () => {
  const disclosure = eligibilityDisclosure()
  assert.ok(disclosure.hide.includes("Name"))
  assert.ok(disclosure.reveal.includes("Verified contributor"))
})

test("content commitments are canonical and change with bound metadata", () => {
  const input = { contentType: "AUDIO" as const, title: " Signal ", description: "A contribution", contentReference: "media-1", metadata: { genre: "ambient" } }
  assert.equal(contentCommitment(input), contentCommitment({ ...input, title: "Signal" }))
  assert.notEqual(contentCommitment(input), contentCommitment({ ...input, description: "A different contribution" }))
  assert.equal(canonicalize({ b: 2, a: 1 }), '{"a":1,"b":2}')
})
