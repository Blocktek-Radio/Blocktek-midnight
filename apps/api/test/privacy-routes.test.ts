import assert from "node:assert/strict"
import test from "node:test"
import type { MidnightAdapter } from "@blocktek/midnight"
import { buildServer } from "../src/server.js"

const headers = { "x-blocktek-actor": "contributor-a", "x-blocktek-role": "CONTRIBUTOR" }
const editorHeaders = { "x-blocktek-actor": "editor-a", "x-blocktek-role": "EDITOR" }
const adapter: MidnightAdapter = {
  status: () => ({ configured: true, status: "CONFIGURED", network: "testnet", networkId: "testnet", walletConfigured: true, contractConfigured: true, proofConfigured: true, connected: false, contractAddress: "configured-only", capabilities: [], detail: "test adapter" }),
  verifyEligibility: async () => ({ status: "VERIFIED", verificationReference: "verification-1", expiresAt: null, detail: "verified" }),
}

test("contribution API enforces the privacy and editorial lifecycle", async () => {
  const app = buildServer({ WEB_BASE_URL: "http://localhost:3000", AI_PROVIDER: "development", AI_PROGRAMMING_MODE: "DETERMINISTIC", RADIO_STREAM_NAME: "Signal / Main", RADIO_STREAM_ENABLED: false, RADIO_BROADCAST_ENABLED: false, MIDNIGHT_NETWORK: "testnet", BLOCKTEK_AUTH_MODE: "development" }, { midnightAdapter: adapter })
  const created = await app.inject({ method: "POST", url: "/api/v1/contributions", headers, payload: { title: "Community interview", description: "A recorded interview for the editorial team", contentType: "AUDIO", contentReference: "media-1" } })
  assert.equal(created.statusCode, 201)
  const id = created.json().data.id
  const proof = await app.inject({ method: "POST", url: `/api/v1/contributions/${id}/prove-eligibility`, headers, payload: { claimType: "eligible_contributor", proofReference: "proof-reference", disclosedAttributes: ["eligibility"] } })
  assert.equal(proof.statusCode, 200)
  const review = await app.inject({ method: "POST", url: `/api/v1/contributions/${id}/editorial-review`, headers: editorHeaders, payload: { status: "VERIFIED", reason: "Meets policy" } })
  assert.equal(review.statusCode, 200)
  const approved = await app.inject({ method: "POST", url: `/api/v1/contributions/${id}/approve`, headers: editorHeaders })
  assert.equal(approved.statusCode, 200)
  assert.equal(approved.json().data.state, "PROGRAMMABLE")
  const privateStatus = await app.inject({ method: "GET", url: `/api/v1/midnight/verification/${id}`, headers })
  assert.equal(privateStatus.statusCode, 200)
  assert.equal("proofReference" in (privateStatus.json().data.verification || {}), false)
  const other = await app.inject({ method: "GET", url: `/api/v1/contributions/${id}`, headers: { "x-blocktek-actor": "contributor-b", "x-blocktek-role": "CONTRIBUTOR" } })
  assert.equal(other.statusCode, 404)
  await app.close()
})

test("private contribution routes remain disabled without authentication", async () => {
  const app = buildServer({ WEB_BASE_URL: "http://localhost:3000", AI_PROVIDER: "development", AI_PROGRAMMING_MODE: "DETERMINISTIC", RADIO_STREAM_NAME: "Signal / Main", RADIO_STREAM_ENABLED: false, RADIO_BROADCAST_ENABLED: false, MIDNIGHT_NETWORK: "unconfigured", BLOCKTEK_AUTH_MODE: "unconfigured" })
  const response = await app.inject({ method: "GET", url: "/api/v1/contributions" })
  assert.equal(response.statusCode, 503)
  await app.close()
})
