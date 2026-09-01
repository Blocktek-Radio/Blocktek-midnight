import cors from "@fastify/cors"
import Fastify from "fastify"
import { generateProgramme } from "@blocktek/ai"
import { eligibilityDisclosure, UnconfiguredMidnightAdapter } from "@blocktek/midnight"
import { programmeRequestSchema, submissionStateSchema, type SubmissionState } from "@blocktek/types"
import { z } from "zod"
import { channels, nowPlaying, queue, stations } from "./data.js"
import { loadConfig, type ApiConfig } from "./config.js"
import { transitionSubmission } from "./submission.js"

const transitionBodySchema = z.object({ to: submissionStateSchema })
const submissionBodySchema = z.object({
  title: z.string().trim().min(3).max(160),
  body: z.string().trim().min(10).max(20000),
  evidenceAttached: z.boolean().default(false),
})

type Submission = {
  id: string
  title: string
  body: string
  evidenceAttached: boolean
  state: SubmissionState
  createdAt: string
}

export function buildServer(config: ApiConfig = loadConfig()) {
  const app = Fastify({ logger: { level: process.env.LOG_LEVEL || "info" } })
  const midnight = new UnconfiguredMidnightAdapter()
  const submissions = new Map<string, Submission>()

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
    mode: "development",
    integrations: {
      radioStream: Boolean(config.RADIO_STREAM_URL),
      aiProvider: config.AI_PROVIDER,
      midnight: midnight.status().status,
    },
  }))

  app.get("/api/v1/health/ready", async (_request, reply) => {
    return reply.send({
      status: "degraded",
      ready: true,
      persistence: "not-configured",
      redis: "not-configured",
      midnight: midnight.status().status,
    })
  })

  app.get("/api/v1/radio/stations", async () => ({ data: stations }))
  app.get("/api/v1/radio/channels", async () => ({ data: channels }))
  app.get("/api/v1/radio/now-playing", async () => ({ data: nowPlaying() }))
  app.get("/api/v1/radio/queue", async () => ({ data: queue }))
  app.get("/api/v1/radio/programmes", async () => ({
    data: [{ id: "development-signal", title: "Development Signal", channelId: "signal-01", status: "DEMO" }],
  }))

  app.post("/api/v1/ai/programmes", async (request) => {
    const input = programmeRequestSchema.parse(request.body)
    return { data: await generateProgramme(input, { ...process.env, AI_PROVIDER: config.AI_PROVIDER, AI_PROVIDER_URL: config.AI_PROVIDER_URL, AI_PROVIDER_API_KEY: config.AI_PROVIDER_API_KEY }) }
  })

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

  return app
}
