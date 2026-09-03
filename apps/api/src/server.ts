import cors from "@fastify/cors"
import Fastify from "fastify"
import { AiProgrammingService, contextHash, createAiProviderManager, defaultStationProfile, type BroadcastContext } from "@blocktek/ai"
import { eligibilityDisclosure, UnconfiguredMidnightAdapter } from "@blocktek/midnight"
import { createRadioSeed, InMemoryRadioRepository, radioStatusForStream, type RadioRepository } from "@blocktek/radio-core"
import { programmeRequestSchema, submissionStateSchema, type AiDecision, type Channel, type SubmissionState, type Stream } from "@blocktek/types"
import { z } from "zod"
import { loadConfig, type ApiConfig } from "./config.js"
import { transitionSubmission } from "./submission.js"
import { checkStream, type StreamProbe } from "./stream.js"
import type { AiDecisionStore } from "./db/repository.js"

const transitionBodySchema = z.object({ to: submissionStateSchema })
const submissionBodySchema = z.object({
  title: z.string().trim().min(3).max(160),
  body: z.string().trim().min(10).max(20000),
  evidenceAttached: z.boolean().default(false),
})
const scheduleQuerySchema = z.object({
  from: z.string().datetime({ offset: true }).optional(),
  to: z.string().datetime({ offset: true }).optional(),
})

type Submission = {
  id: string
  title: string
  body: string
  evidenceAttached: boolean
  state: SubmissionState
  createdAt: string
}

export type ServerDependencies = {
  radioRepository?: RadioRepository
  streamProbe?: StreamProbe
  aiDecisionStore?: AiDecisionStore
}

export function buildServer(config: ApiConfig = loadConfig(), dependencies: ServerDependencies = {}) {
  const app = Fastify({ logger: { level: process.env.LOG_LEVEL || "info" } })
  const midnight = new UnconfiguredMidnightAdapter()
  const submissions = new Map<string, Submission>()
  const radioRepository = dependencies.radioRepository || new InMemoryRadioRepository(createRadioSeed({
    streamUrl: config.RADIO_PUBLIC_STREAM_URL || config.RADIO_STREAM_URL || undefined,
    streamName: config.RADIO_STREAM_NAME,
    streamEnabled: config.RADIO_STREAM_ENABLED,
  }))
  const streamProbe = dependencies.streamProbe
  const streamCache = new Map<string, { stream: Stream; expiresAt: number }>()
  const aiService = new AiProgrammingService({ manager: config.AI_PROGRAMMING_MODE === "DETERMINISTIC" ? undefined : createAiProviderManager(process.env), timeoutMs: config.AI_TIMEOUT_MS, mode: config.AI_PROGRAMMING_MODE })
  const memoryDecisions: AiDecision[] = []
  const decisionStore = dependencies.aiDecisionStore || { save: async (decision: AiDecision) => { memoryDecisions.unshift(decision); memoryDecisions.splice(20) }, list: async (limit = 20) => memoryDecisions.slice(0, limit), get: async (id: string) => memoryDecisions.find((item) => item.id === id) || null }

  async function checkedStream(stream: Stream | null): Promise<Stream | null> {
    if (!stream) return null
    const cached = streamCache.get(stream.url || "")
    if (cached && cached.expiresAt > Date.now()) return cached.stream
    const checked = await checkStream(stream, streamProbe)
    if (checked) streamCache.set(checked.url || "", { stream: checked, expiresAt: Date.now() + 15_000 })
    return checked
  }

  async function checkedChannels(): Promise<Channel[]> {
    const channels = await radioRepository.getChannels()
    return Promise.all(channels.map(async (channel) => ({ ...channel, stream: await checkedStream(channel.stream) })))
  }

  app.register(cors, { origin: config.WEB_BASE_URL })

  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof z.ZodError) {
      return reply.code(400).send({ error: "VALIDATION_ERROR", details: error.issues })
    }
    app.log.error({ err: error }, "request failed")
    return reply.code(500).send({ error: "INTERNAL_ERROR" })
  })

  app.get("/api/v1/health", async () => ({
    status: "ok",
    service: "blocktek-api",
    version: "v1",
    mode: config.DATABASE_URL ? "production" : "development",
    integrations: {
      radioStream: Boolean(config.RADIO_STREAM_ENABLED && (config.RADIO_PUBLIC_STREAM_URL || config.RADIO_STREAM_URL)),
      aiProvider: config.AI_PROVIDER,
      aiStatus: (await aiService.status()).status,
      midnight: midnight.status().status,
      broadcast: config.RADIO_BROADCAST_ENABLED ? "enabled" : "not-configured",
      redis: "optional",
    },
  }))

  app.get("/api/v1/health/ready", async (_request, reply) => {
    const persistence = await radioRepository.health()
    const ready = persistence.status !== "unavailable"
    const broadcast = await radioRepository.getBroadcastState()
    return reply.send({
      status: persistence.status === "ready" ? "ok" : "degraded",
      ready,
      persistence: persistence.status,
      redis: "not-required",
      broadcastEngine: broadcast.status === "RUNNING" || broadcast.status === "DEGRADED" ? "running" : config.RADIO_BROADCAST_ENABLED ? "not-running" : "not-required",
      icecast: broadcast.health.icecastRunning ? "running" : config.RADIO_BROADCAST_ENABLED ? "not-reachable" : "not-required",
      midnight: midnight.status().status,
    })
  })

  app.get("/api/v1/radio/stations", async () => {
    const station = await radioRepository.getStation()
    const channels = await checkedChannels()
    return { data: station ? [{ ...station, status: radioStatusForStream(channels[0]?.stream || null) }] : [] }
  })
  app.get("/api/v1/radio/channels", async () => ({ data: await checkedChannels() }))
  app.get("/api/v1/radio/now-playing", async () => {
    const current = await radioRepository.getNowPlaying()
    const channels = await checkedChannels()
    const channel = channels.find((item) => item.id === current.channelId) || channels[0]
    return { data: { ...current, channelId: channel?.id || current.channelId, stream: channel?.stream || null, status: radioStatusForStream(channel?.stream || null), metadataStatus: current.metadataStatus } }
  })
  app.get("/api/v1/radio/status", async () => {
    const channels = await checkedChannels()
    const stream = channels[0]?.stream || null
    const broadcast = await radioRepository.getBroadcastState()
    return { data: {
      status: radioStatusForStream(stream),
      stream: { configured: Boolean(stream?.url && stream.enabled), reachable: stream?.health === "reachable", url: stream?.url || null },
      broadcast: { ...broadcast, health: { ...broadcast.health, streamReachable: stream?.health === "reachable" } },
    } }
  })
  app.get("/api/v1/radio/stream", async () => {
    const channels = await checkedChannels()
    return { data: channels[0]?.stream || null }
  })
  app.get("/api/v1/radio/queue", async () => ({ data: await radioRepository.getQueue() }))
  app.get("/api/v1/radio/programmes", async () => ({ data: await radioRepository.getProgrammes() }))
  app.get("/api/v1/radio/schedule", async (request) => {
    const query = scheduleQuerySchema.parse(request.query)
    return { data: await radioRepository.getSchedule(query.from ? new Date(query.from) : undefined, query.to ? new Date(query.to) : undefined) }
  })

  app.get("/api/v1/ai/status", async () => ({ data: await aiService.status() }))

  async function generateAiProgramme(input: ReturnType<typeof programmeRequestSchema.parse>) {
    const nowPlaying = await radioRepository.getNowPlaying()
    const queue = await radioRepository.getQueue(8)
    const media = await radioRepository.getMediaAssets()
    const context: BroadcastContext = { now: new Date().toISOString(), currentProgramme: nowPlaying.programme?.title || null, currentTrackId: nowPlaying.track?.id || null, recentTrackIds: nowPlaying.track ? [nowPlaying.track.id] : [], recentArtists: nowPlaying.track ? [nowPlaying.track.artist.name] : [], upcomingTrackIds: queue.map((item) => item.track.id).slice(0, 8), availableMedia: media.map(({ id, title, artist, album, durationSeconds, genre, mood, kind, enabled, programmeEligible }) => ({ id, title, artist, album, durationSeconds, genre, mood, kind, enabled, programmeEligible })), station: defaultStationProfile, mode: config.AI_PROGRAMMING_MODE, request: input }
    const result = config.AI_PROGRAMMING_MODE === "DETERMINISTIC"
      ? await aiService.generate({ ...context, mode: "DETERMINISTIC" })
      : await aiService.generate(context)
    await decisionStore.save(result.decision, contextHash(context))
    if (result.status === "AI_GENERATED") await decisionStore.enqueue?.(result.decision.id, result.acceptedMediaIds, input.theme)
    return result
  }

  app.post("/api/v1/ai/programmes", async (request) => {
    const input = programmeRequestSchema.parse(request.body)
    const result = await generateAiProgramme(input)
    return { data: result.programme, aiStatus: result.status, decision: result.decision }
  })
  app.post("/api/v1/ai/playlist", async (request) => { const input = programmeRequestSchema.parse(request.body); const result = await generateAiProgramme(input); return { data: result.programme, aiStatus: result.status, decision: result.decision } })
  app.get("/api/v1/ai/decisions", async (request) => { const query = z.object({ limit: z.coerce.number().int().min(1).max(100).default(20) }).parse(request.query); return { data: await decisionStore.list(query.limit) } })
  app.get("/api/v1/ai/decisions/:id", async (request, reply) => { const item = await decisionStore.get((request.params as { id: string }).id); return item ? { data: item } : reply.code(404).send({ error: "NOT_FOUND" }) })

  app.get("/api/v1/midnight/status", async () => ({ data: midnight.status() }))
  app.get("/api/v1/verification/disclosure", async () => ({ data: eligibilityDisclosure() }))

  app.post("/api/v1/submissions", async (request, reply) => {
    const input = submissionBodySchema.parse(request.body)
    const id = `submission-${submissions.size + 1}`
    const submission: Submission = {
      ...input,
      id,
      state: "SUBMITTED",
      createdAt: new Date().toISOString(),
    }
    submissions.set(id, submission)
    return reply.code(201).send({
      data: submission,
      notice: "DEVELOPMENT ONLY: identity, evidence encryption, authentication, and durable storage are not configured.",
    })
  })

  app.get("/api/v1/submissions/:id", async (request, reply) => {
    const { id } = request.params as { id: string }
    const submission = submissions.get(id)
    if (!submission) return reply.code(404).send({ error: "NOT_FOUND" })
    return reply.send({ data: submission })
  })

  app.post("/api/v1/submissions/:id/transitions", async (request, reply) => {
    const { id } = request.params as { id: string }
    const submission = submissions.get(id)
    if (!submission) return reply.code(404).send({ error: "NOT_FOUND" })
    const { to } = transitionBodySchema.parse(request.body)
    try {
      submission.state = transitionSubmission(submission.state, to)
    } catch (error) {
      return reply.code(409).send({ error: "INVALID_TRANSITION", message: error instanceof Error ? error.message : "Invalid transition" })
    }
    return reply.send({ data: submission })
  })

  app.addHook("onClose", async () => { await radioRepository.close() })
  return app
}
