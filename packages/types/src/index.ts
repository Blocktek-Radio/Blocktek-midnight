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

export const radioStatuses = ["LIVE", "CONNECTING", "OFFLINE", "NOT_CONFIGURED"] as const
export const radioStatusSchema = z.enum(radioStatuses)
export type RadioStatus = z.infer<typeof radioStatusSchema>

export const dataStatuses = ["REAL", "DEMO", "UNKNOWN", "NOT_CONFIGURED", "OFFLINE"] as const
export const dataStatusSchema = z.enum(dataStatuses)
export type DataStatus = z.infer<typeof dataStatusSchema>

export const streamHealthStatuses = ["configured", "reachable", "unreachable", "unknown"] as const
export const streamHealthSchema = z.enum(streamHealthStatuses)
export type StreamHealth = z.infer<typeof streamHealthSchema>

export type Artist = {
  id: string
  name: string
}

export type Album = {
  id: string
  title: string
  artworkUrl: string | null
}

export type Track = {
  id: string
  title: string
  artist: Artist
  album: Album | null
  durationSeconds: number
  artworkUrl: string | null
  dataStatus: DataStatus
}

export type Stream = {
  id: string
  channelId: string
  name: string
  url: string | null
  enabled: boolean
  health: StreamHealth
  checkedAt: string | null
  dataStatus: DataStatus
}

export type Station = {
  id: string
  name: string
  description: string
  status: RadioStatus
  dataStatus: DataStatus
}

export type Channel = {
  id: string
  stationId: string
  name: string
  genre: string
  description: string
  stream: Stream | null
  dataStatus: DataStatus
}

export type PlaylistItem = {
  position: number
  track: Track
}

export type Playlist = {
  id: string
  channelId: string
  name: string
  description: string
  items: PlaylistItem[]
  dataStatus: DataStatus
}

export type QueueItem = {
  position: number
  track: Track
  scheduledAt: string | null
}

export type ProgrammeStatus = "CURRENT" | "UPCOMING" | "PAST"

export type Programme = {
  id: string
  channelId: string
  title: string
  description: string
  host: string | null
  startTime: string
  endTime: string
  status: ProgrammeStatus
  dataStatus: DataStatus
}

export type Schedule = {
  id: string
  programmeId: string
  channelId: string
  startTime: string
  endTime: string
  programme: Programme
  dataStatus: DataStatus
}

export type NowPlaying = {
  status: RadioStatus
  channelId: string
  track: Track | null
  programme: Programme | null
  startedAt: string | null
  stream: Stream | null
  metadataStatus: DataStatus
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
