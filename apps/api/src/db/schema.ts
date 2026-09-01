import { boolean, index, integer, pgTable, primaryKey, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core"

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
