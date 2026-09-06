import assert from "node:assert/strict"
import { createHmac } from "node:crypto"
import test from "node:test"
import type { FastifyRequest } from "fastify"
import { actorFromRequest } from "../src/auth.js"
import { loadConfig } from "../src/config.js"

const request = (headers: Record<string, string>) => ({ headers }) as unknown as FastifyRequest

test("trusted proxy rejects unsigned actor headers", () => {
  const config = loadConfig({ BLOCKTEK_AUTH_MODE: "trusted-proxy", BLOCKTEK_AUTH_SHARED_SECRET: "a".repeat(32) })
  assert.equal(actorFromRequest(request({ "x-blocktek-actor": "user-1", "x-blocktek-role": "CONTRIBUTOR" }), config), null)
})

test("trusted proxy accepts a fresh signed actor assertion", () => {
  const secret = "a".repeat(32)
  const config = loadConfig({ BLOCKTEK_AUTH_MODE: "trusted-proxy", BLOCKTEK_AUTH_SHARED_SECRET: secret })
  const timestamp = Date.now().toString()
  const actor = "user-1"
  const role = "CONTRIBUTOR"
  const signature = createHmac("sha256", secret).update(`${timestamp}.${actor}.${role}`).digest("hex")
  assert.deepEqual(actorFromRequest(request({
    "x-blocktek-actor": actor,
    "x-blocktek-role": role,
    "x-blocktek-auth-timestamp": timestamp,
    "x-blocktek-auth-signature": signature,
  }), config), { id: actor, role })
})
