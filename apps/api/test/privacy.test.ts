import assert from "node:assert/strict"
import test from "node:test"
import type { MidnightAdapter } from "@blocktek/midnight"
import { InMemoryPrivacyStore } from "../src/privacy.js"

const contributor = { id: "contributor-a", role: "CONTRIBUTOR" as const }
const editor = { id: "editor-a", role: "EDITOR" as const }
const midnight: MidnightAdapter = {
  status: () => ({ configured: true, status: "CONFIGURED", network: "testnet", networkId: "testnet", walletConfigured: true, contractConfigured: true, proofConfigured: true, connected: false, contractAddress: "real-when-configured", capabilities: [], detail: "test adapter" }),
  verifyEligibility: async () => ({ status: "VERIFIED", verificationReference: "verified-reference", expiresAt: null, detail: "verified by injected adapter" }),
}

test("contribution cannot become programmable before proof and editorial approval", async () => {
  const store = new InMemoryPrivacyStore()
  const created = await store.create({ contentType: "AUDIO", title: "Field recording", description: "A public editorial description", contentReference: "media-1", metadata: {} }, contributor)
  assert.equal(created.state, "PRIVACY_VERIFICATION_PENDING")
  await assert.rejects(store.approve(created.id, editor), /required/)
  const verified = await store.verify(created.id, { claimType: "eligible_contributor", proofReference: "wallet-proof-reference", disclosedAttributes: ["eligibility"], expiresAt: null }, contributor, midnight)
  assert.equal(verified.contribution.state, "PRIVACY_VERIFIED")
  await assert.rejects(store.review(created.id, { status: "VERIFIED", reason: null }, contributor), /editorial role/)
  await store.review(created.id, { status: "VERIFIED", reason: "Meets editorial policy" }, editor)
  const approved = await store.approve(created.id, editor)
  assert.equal(approved.state, "PROGRAMMABLE")
  assert.equal(approved.programmingEligible, true)
  assert.deepEqual((await store.privacyStatus(created.id, contributor)).verification?.disclosedAttributes, ["eligibility"])
  assert.equal("proofReference" in ((await store.privacyStatus(created.id, contributor)).verification || {}), false)
})

test("contributors cannot read one another's records", async () => {
  const store = new InMemoryPrivacyStore()
  const created = await store.create({ contentType: "TEXT", title: "Private owner", description: "Description for editorial review", contentReference: null, metadata: {} }, contributor)
  assert.equal(await store.get(created.id, { id: "contributor-b", role: "CONTRIBUTOR" }), null)
})
