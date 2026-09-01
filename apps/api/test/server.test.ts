import assert from "node:assert/strict"
import test from "node:test"
import { buildServer } from "../src/server.js"

test("health and radio routes expose explicit development status", async () => {
  const app = buildServer({
    API_HOST: "127.0.0.1",
    API_PORT: 4000,
    WEB_BASE_URL: "http://localhost:3000",
    AI_PROVIDER: "development",
    AI_PROVIDER_URL: undefined,
    AI_PROVIDER_API_KEY: undefined,
    MIDNIGHT_NETWORK: "unconfigured",
    RADIO_STREAM_URL: undefined,
  })
  const health = await app.inject({ method: "GET", url: "/api/v1/health" })
  assert.equal(health.statusCode, 200)
  assert.equal(health.json().integrations.midnight, "NOT_CONFIGURED")

  const programme = await app.inject({
    method: "POST",
    url: "/api/v1/ai/programmes",
    payload: { theme: "Web3 Builders", mood: "Late Night", durationMinutes: 30, audience: "Developers" },
  })
  assert.equal(programme.statusCode, 200)
  assert.equal(programme.json().data.source, "development-fallback")
  await app.close()
})
