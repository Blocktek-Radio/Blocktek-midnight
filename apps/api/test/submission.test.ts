import assert from "node:assert/strict"
import test from "node:test"
import { canTransition, transitionSubmission } from "../src/submission.js"

test("submission workflow requires verification and editorial review", () => {
  assert.equal(canTransition("SUBMITTED", "PROOF_PENDING"), true)
  assert.equal(canTransition("SUBMITTED", "BROADCAST"), false)
  assert.equal(transitionSubmission("UNDER_REVIEW", "APPROVED"), "APPROVED")
})

test("archived submissions are terminal", () => {
  assert.equal(canTransition("ARCHIVED", "BROADCAST"), false)
  assert.throws(() => transitionSubmission("ARCHIVED", "BROADCAST"), /Invalid submission transition/)
})
