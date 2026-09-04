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

export const contributionStates = [
  "DRAFT",
  "SUBMITTED",
  "PRIVACY_VERIFICATION_PENDING",
  "PRIVACY_VERIFIED",
  "EDITORIAL_REVIEW",
  "APPROVED",
  "PROGRAMMABLE",
  "BROADCAST",
  "REJECTED",
  "EXPIRED",
  "REVOKED",
] as const
export const contributionStateSchema = z.enum(contributionStates)
export type ContributionState = z.infer<typeof contributionStateSchema>

export const contributionContentTypes = ["AUDIO", "PODCAST", "PROGRAMME", "TEXT"] as const
export const contributionContentTypeSchema = z.enum(contributionContentTypes)
export type ContributionContentType = z.infer<typeof contributionContentTypeSchema>

export const privacyVerificationStatuses = ["PENDING", "VERIFIED", "REJECTED", "EXPIRED", "REVOKED"] as const
export const privacyVerificationStatusSchema = z.enum(privacyVerificationStatuses)
export type PrivacyVerificationStatus = z.infer<typeof privacyVerificationStatusSchema>

export const editorialStatuses = ["PENDING", "VERIFIED", "REJECTED", "REVOKED"] as const
export const editorialStatusSchema = z.enum(editorialStatuses)
export type EditorialStatus = z.infer<typeof editorialStatusSchema>

export type ApprovedContributionMetadata = {
  contributionId: string
  contentType: ContributionContentType
  title: string
  description: string
  editorialStatus: "VERIFIED"
  programmingEligible: true
  contentReference: string | null
}

export type Contribution = {
  id: string
  contentType: ContributionContentType
  title: string
  description: string
  contentReference: string | null
  state: ContributionState
  privacyStatus: PrivacyVerificationStatus
  editorialStatus: EditorialStatus
  programmingEligible: boolean
  contentCommitment: string
  createdAt: string
  updatedAt: string
}

export type PrivacyVerification = {
  id: string
  contributionId: string
  claimType: string
  disclosedAttributes: string[]
  status: PrivacyVerificationStatus
  proofReference: string
  verificationReference: string | null
  expiresAt: string | null
  createdAt: string
}

export type EditorialReview = {
  id: string
  contributionId: string
  status: EditorialStatus
  verificationReference: string | null
  reason: string | null
  createdAt: string
}

export type ContributionAuditEvent = {
  id: string
  contributionId: string
  event: string
  actorRole: "SYSTEM" | "CONTRIBUTOR" | "EDITOR" | "ADMIN"
  reference: string | null
  createdAt: string
}

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

export const aiStatuses = ["AI_NOT_CONFIGURED", "AI_AVAILABLE", "AI_UNAVAILABLE", "AI_GENERATING", "AI_GENERATED", "AI_VALIDATION_FAILED", "AI_FALLBACK"] as const
export const aiStatusSchema = z.enum(aiStatuses)
export type AiStatus = z.infer<typeof aiStatusSchema>
export const programmingModes = ["DETERMINISTIC", "AI_ASSISTED", "AI_PROGRAMMED"] as const
export const programmingModeSchema = z.enum(programmingModes)
export type ProgrammingMode = z.infer<typeof programmingModeSchema>

export type MediaAsset = {
  id: string
  title: string
  artist: string
  album: string | null
  path: string
  kind: string
  durationSeconds: number | null
  artworkUrl: string | null
  genre?: string | null
  mood?: string | null
  explicit?: boolean
  programmeEligible?: boolean
  enabled: boolean
}

export type AiDecision = {
  id: string
  requestType: string
  provider: string | null
  model: string | null
  validationStatus: "ACCEPTED" | "REJECTED" | "FALLBACK"
  rejectionReason: string | null
  explanation: string
  proposal: unknown
  latencyMs: number
  createdAt: string
  fallbackProvider?: string | null
  approvedMediaIds?: string[]
  mode?: ProgrammingMode
}

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

export type BroadcastHealth = {
  configured: boolean
  sourceAvailable: boolean
  broadcastEngineRunning: boolean
  icecastRunning: boolean
  streamReachable: boolean
  listenerUrlAvailable: boolean
  lastError: string | null
  checkedAt: string
}

export type BroadcastCurrentItem = {
  id: string
  title: string
  artist: string
  album: string | null
  artworkUrl: string | null
  programme: string | null
  startedAt: string
  source: "music" | "programme" | "podcast" | "broadcast" | "fallback"
}

export type BroadcastState = {
  status: "RUNNING" | "STOPPED" | "DEGRADED" | "NOT_CONFIGURED"
  sessionId: string | null
  mount: string | null
  current: BroadcastCurrentItem | null
  health: BroadcastHealth
}

export type DisclosureResult = {
  reveal: string[]
  hide: string[]
  policy: "eligibility-only"
}

export type MidnightStatus = {
  configured: boolean
  status: "NOT_CONFIGURED" | "CONFIGURED" | "CONNECTING" | "CONNECTED" | "DEGRADED" | "UNAVAILABLE"
  network: string
  networkId: string | null
  walletConfigured: boolean
  contractConfigured: boolean
  proofConfigured: boolean
  connected: boolean
  contractAddress: string | null
  capabilities: string[]
  detail: string
}
