import assert from "node:assert/strict"
import test from "node:test"
import { HttpMidnightAdapter, UnconfiguredMidnightAdapter, canonicalize, contentCommitment, eligibilityDisclosure, type EligibilityProofRequest, type MidnightConfig } from "../src/index.js"

test("unconfigured Midnight adapter cannot claim proof verification", async () => {
  const adapter = new UnconfiguredMidnightAdapter()
  assert.equal(adapter.status().status, "NOT_CONFIGURED")
  await assert.rejects(adapter.verifyEligibility({} as EligibilityProofRequest), /not configured/)
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

test("configured verifier rejects expired or empty proof references", async () => {
  const config: MidnightConfig = { network: "preprod", networkId: "preprod", nodeUrl: "https://node.example", indexerUrl: "https://indexer.example", proofServerUrl: "http://proof.example", zkConfigUrl: "file:///managed", contractAddress: "contract", walletConfigured: true }
  const originalFetch = globalThis.fetch
  globalThis.fetch = async () => new Response(JSON.stringify({ status: "VERIFIED", verificationReference: "ref", expiresAt: "2000-01-01T00:00:00.000Z" }), { status: 200 })
  try {
    await assert.rejects(new HttpMidnightAdapter(config, "https://verifier.example").verifyEligibility({ contributionId: "id", claimType: "eligible", contentCommitment: "commitment", proofReference: "proof", disclosedAttributes: [], expiresAt: null }), /expired/)
    globalThis.fetch = async () => new Response(JSON.stringify({ status: "VERIFIED", verificationReference: "  ", expiresAt: null }), { status: 200 })
    await assert.rejects(new HttpMidnightAdapter(config, "https://verifier.example").verifyEligibility({ contributionId: "id", claimType: "eligible", contentCommitment: "commitment", proofReference: "proof", disclosedAttributes: [], expiresAt: null }), /empty verification reference/)
  } finally {
    globalThis.fetch = originalFetch
  }
})
