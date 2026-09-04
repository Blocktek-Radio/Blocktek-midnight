import { boolean, index, integer, jsonb, pgTable, primaryKey, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core"

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}

export const stations = pgTable("stations", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  ...timestamps,
})

export const channels = pgTable("channels", {
  id: text("id").primaryKey(),
  stationId: text("station_id").notNull().references(() => stations.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  genre: text("genre").notNull(),
  description: text("description").notNull(),
  ...timestamps,
}, (table) => ({ stationIdx: index("channels_station_id_idx").on(table.stationId) }))

export const artists = pgTable("artists", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  ...timestamps,
})

export const albums = pgTable("albums", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  artworkUrl: text("artwork_url"),
  ...timestamps,
})

export const tracks = pgTable("tracks", {
  id: text("id").primaryKey(),
  artistId: text("artist_id").notNull().references(() => artists.id),
  albumId: text("album_id").references(() => albums.id),
  title: text("title").notNull(),
  durationSeconds: integer("duration_seconds").notNull(),
  artworkUrl: text("artwork_url"),
  ...timestamps,
}, (table) => ({ artistIdx: index("tracks_artist_id_idx").on(table.artistId) }))

export const streams = pgTable("streams", {
  id: text("id").primaryKey(),
  channelId: text("channel_id").notNull().references(() => channels.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  url: text("url"),
  enabled: boolean("enabled").notNull().default(false),
  ...timestamps,
}, (table) => ({ channelIdx: uniqueIndex("streams_channel_id_unique").on(table.channelId) }))

export const playlists = pgTable("playlists", {
  id: text("id").primaryKey(),
  channelId: text("channel_id").notNull().references(() => channels.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description").notNull(),
  ...timestamps,
}, (table) => ({ channelIdx: index("playlists_channel_id_idx").on(table.channelId) }))

export const playlistItems = pgTable("playlist_items", {
  playlistId: text("playlist_id").notNull().references(() => playlists.id, { onDelete: "cascade" }),
  trackId: text("track_id").notNull().references(() => tracks.id),
  position: integer("position").notNull(),
  ...timestamps,
}, (table) => ({
  primaryKey: primaryKey({ columns: [table.playlistId, table.position] }),
  playlistIdx: index("playlist_items_playlist_id_idx").on(table.playlistId),
}))

export const programmes = pgTable("programmes", {
  id: text("id").primaryKey(),
  channelId: text("channel_id").notNull().references(() => channels.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description").notNull(),
  host: text("host"),
  ...timestamps,
}, (table) => ({ channelIdx: index("programmes_channel_id_idx").on(table.channelId) }))

export const schedules = pgTable("schedules", {
  id: text("id").primaryKey(),
  programmeId: text("programme_id").notNull().references(() => programmes.id, { onDelete: "cascade" }),
  channelId: text("channel_id").notNull().references(() => channels.id, { onDelete: "cascade" }),
  startTime: timestamp("start_time", { withTimezone: true }).notNull(),
  endTime: timestamp("end_time", { withTimezone: true }).notNull(),
  ...timestamps,
}, (table) => ({
  channelTimeIdx: index("schedules_channel_time_idx").on(table.channelId, table.startTime, table.endTime),
}))

export const mediaAssets = pgTable("media_assets", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  artist: text("artist").notNull(),
  album: text("album"),
  path: text("path").notNull(),
  kind: text("kind").notNull(),
  durationSeconds: integer("duration_seconds"),
  artworkUrl: text("artwork_url"),
  enabled: boolean("enabled").notNull().default(true),
  contributionId: text("contribution_id"),
  privacyVerified: boolean("privacy_verified").notNull().default(true),
  editorialApproved: boolean("editorial_approved").notNull().default(true),
  ...timestamps,
}, (table) => ({ kindIdx: index("media_assets_kind_enabled_idx").on(table.kind, table.enabled) }))

export const contributors = pgTable("contributors", {
  id: text("id").primaryKey(),
  ...timestamps,
})

export const contributions = pgTable("contributions", {
  id: text("id").primaryKey(),
  contributorId: text("contributor_id").notNull().references(() => contributors.id),
  contentType: text("content_type").notNull(),
  contentReference: text("content_reference"),
  mediaAssetId: text("media_asset_id"),
  title: text("title").notNull(),
  description: text("description").notNull(),
  state: text("state").notNull(),
  privacyStatus: text("privacy_status").notNull(),
  editorialStatus: text("editorial_status").notNull(),
  programmingEligible: boolean("programming_eligible").notNull().default(false),
  contentCommitment: text("content_commitment").notNull().unique(),
  ...timestamps,
})

export const privacyVerifications = pgTable("privacy_verifications", {
  id: text("id").primaryKey(),
  contributionId: text("contribution_id").notNull().references(() => contributions.id, { onDelete: "cascade" }),
  claimType: text("claim_type").notNull(),
  disclosedAttributes: text("disclosed_attributes").array().notNull().default([]),
  status: text("status").notNull(),
  proofReference: text("proof_reference").notNull(),
  verificationReference: text("verification_reference"),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  ...timestamps,
})

export const editorialReviews = pgTable("editorial_reviews", {
  id: text("id").primaryKey(),
  contributionId: text("contribution_id").notNull().references(() => contributions.id, { onDelete: "cascade" }),
  status: text("status").notNull(),
  verificationReference: text("verification_reference"),
  reason: text("reason"),
  ...timestamps,
})

export const broadcastSessions = pgTable("broadcast_sessions", {
  id: text("id").primaryKey(),
  stationId: text("station_id").notNull().references(() => stations.id, { onDelete: "cascade" }),
  status: text("status").notNull(),
  streamMount: text("stream_mount").notNull(),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
  endedAt: timestamp("ended_at", { withTimezone: true }),
  lastError: text("last_error"),
  ...timestamps,
}, (table) => ({ stationStatusIdx: index("broadcast_sessions_station_status_idx").on(table.stationId, table.status, table.startedAt) }))

export const broadcastEvents = pgTable("broadcast_events", {
  id: text("id").primaryKey(),
  sessionId: text("session_id").notNull().references(() => broadcastSessions.id, { onDelete: "cascade" }),
  mediaAssetId: text("media_asset_id").references(() => mediaAssets.id, { onDelete: "set null" }),
  eventType: text("event_type").notNull(),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
  endedAt: timestamp("ended_at", { withTimezone: true }),
  ...timestamps,
}, (table) => ({ sessionStartedIdx: index("broadcast_events_session_started_idx").on(table.sessionId, table.startedAt) }))
