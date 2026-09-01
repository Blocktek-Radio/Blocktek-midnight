import { z } from "zod"

export const submissionStates = [
  "DRAFT",
  "SUBMITTED",
  "PROOF_PENDING",
  "VERIFIED",
  "UNDER_REVIEW",
  "APPROVED",
  "REJECTED",
  "BROADCAST",
  "ARCHIVED",
] as const

export const submissionStateSchema = z.enum(submissionStates)
export type SubmissionState = z.infer<typeof submissionStateSchema>

export const programmeRequestSchema = z.object({
  theme: z.string().trim().min(2).max(120),
  mood: z.string().trim().min(2).max(80),
  durationMinutes: z.number().int().min(5).max(180),
  audience: z.string().trim().min(2).max(120),
})
export type ProgrammeRequest = z.infer<typeof programmeRequestSchema>

export const selectionMetadataSchema = z.object({
  themeRelevance: z.number().min(0).max(1),
  listenerPreferenceMatch: z.number().min(0).max(1),
  freshness: z.number().min(0).max(1),
  overallSelectionScore: z.number().min(0).max(1),
})

export const generatedProgrammeSchema = programmeRequestSchema.extend({
  title: z.string().min(1),
  tracks: z.array(z.object({
    id: z.string().min(1),
    title: z.string().min(1),
    artist: z.string().min(1),
    durationSeconds: z.number().int().positive(),
  })),
  introduction: z.string().min(1),
  selectionMetadata: selectionMetadataSchema,
  source: z.enum(["provider", "development-fallback"]),
})
export type GeneratedProgramme = z.infer<typeof generatedProgrammeSchema>

export type Station = {
  id: string
  name: string
  description: string
  status: "online" | "offline" | "not-configured"
}

export type Channel = {
  id: string
  stationId: string
  name: string
  genre: string
  streamUrl: string | null
}

export type NowPlaying = {
  channelId: string
  programmeTitle: string
  trackTitle: string
  artist: string
  startedAt: string
  durationSeconds: number
  streamConfigured: boolean
}

export type QueueItem = {
  position: number
  title: string
  artist: string
  durationSeconds: number
}

export type DisclosureResult = {
  reveal: string[]
  hide: string[]
  policy: "eligibility-only"
}

export type MidnightStatus = {
  configured: false
  status: "NOT_CONFIGURED"
  network: string
  capabilities: string[]
}
