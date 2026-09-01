import assert from "node:assert/strict"
import test from "node:test"
import { createRadioSeed, InMemoryRadioRepository } from "@blocktek/radio-core"
import { buildServer } from "../src/server.js"

const baseConfig = {
  API_HOST: "127.0.0.1",
  API_PORT: 4000,
  WEB_BASE_URL: "http://localhost:3000",
  AI_PROVIDER: "development" as const,
  AI_PROVIDER_URL: undefined,
  AI_PROVIDER_API_KEY: undefined,
  MIDNIGHT_NETWORK: "unconfigured",
  RADIO_STREAM_URL: undefined,
  RADIO_STREAM_NAME: "Signal / Main",
  RADIO_STREAM_ENABLED: false,
}

test("radio routes expose explicit not-configured state and deterministic queue", async () => {
  const app = buildServer(baseConfig)
  const [stations, channels, nowPlaying, queue, programmes, schedule, ready] = await Promise.all([
    app.inject({ method: "GET", url: "/api/v1/radio/stations" }),
    app.inject({ method: "GET", url: "/api/v1/radio/channels" }),
    app.inject({ method: "GET", url: "/api/v1/radio/now-playing" }),
    app.inject({ method: "GET", url: "/api/v1/radio/queue" }),
    app.inject({ method: "GET", url: "/api/v1/radio/programmes" }),
    app.inject({ method: "GET", url: "/api/v1/radio/schedule" }),
    app.inject({ method: "GET", url: "/api/v1/health/ready" }),
  ])

  assert.equal(stations.json().data[0].status, "NOT_CONFIGURED")
  assert.equal(channels.json().data[0].stream, null)
  assert.equal(nowPlaying.json().data.status, "NOT_CONFIGURED")
  assert.equal(nowPlaying.json().data.track, null)
  assert.deepEqual(queue.json().data.map((item: { position: number }) => item.position), [1, 2, 3])
  assert.equal(queue.json().data[0].track.dataStatus, "DEMO")
  assert.equal(programmes.json().data[0].dataStatus, "DEMO")
  assert.equal(schedule.json().data[0].programme.title, "Development Signal")
  assert.equal(ready.json().persistence, "not-configured")
  assert.equal(ready.json().redis, "not-required")
  await app.close()
})

test("configured stream health is separate from browser playback and metadata", async () => {
  const repository = new InMemoryRadioRepository(createRadioSeed({
    streamUrl: "https://radio.example.test/live",
    streamName: "Test stream",
    streamEnabled: true,
  }))
  const app = buildServer(baseConfig, {
    radioRepository: repository,
    streamProbe: async () => "reachable",
  })

  const response = await app.inject({ method: "GET", url: "/api/v1/radio/now-playing" })
  const data = response.json().data
  assert.equal(response.statusCode, 200)
  assert.equal(data.status, "LIVE")
  assert.equal(data.stream.health, "reachable")
  assert.equal(data.track, null)
  assert.equal(data.metadataStatus, "UNKNOWN")
  await app.close()
})
