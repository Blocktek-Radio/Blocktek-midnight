import assert from "node:assert/strict"
import test from "node:test"
import { UnconfiguredMidnightAdapter, eligibilityDisclosure } from "../src/index.js"

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
