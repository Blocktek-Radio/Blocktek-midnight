import { asc, eq, and, gte, lte, sql } from "drizzle-orm"
import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"
import { radioStatusForStream, type RadioRepository, type RadioRepositoryHealth, withProgrammeStatus, orderQueue } from "@blocktek/radio-core"
import type { AiDecision, Album, Artist, BroadcastCurrentItem, BroadcastState, Channel, MediaAsset, NowPlaying, Playlist, Programme, QueueItem, Schedule, Station, Stream, Track } from "@blocktek/types"
import * as schema from "./schema.js"

export type StreamConfiguration = {
  url?: string
  name?: string
  enabled: boolean
}

type Database = ReturnType<typeof drizzle<typeof schema>>

function mapArtist(row: { artistId: string; artistName: string }): Artist {
  return { id: row.artistId, name: row.artistName }
}

function mapAlbum(row: { albumId: string | null; albumTitle: string | null; albumArtworkUrl: string | null }): Album | null {
  if (!row.albumId || !row.albumTitle) return null
  return { id: row.albumId, title: row.albumTitle, artworkUrl: row.albumArtworkUrl }
}

function mapTrack(row: {
  id: string
  title: string
  durationSeconds: number
  artworkUrl: string | null
  artistId: string
  artistName: string
  albumId: string | null
  albumTitle: string | null
  albumArtworkUrl: string | null
}): Track {
  return {
    id: row.id,
    title: row.title,
    artist: mapArtist(row),
    album: mapAlbum(row),
    durationSeconds: row.durationSeconds,
    artworkUrl: row.artworkUrl,
    dataStatus: "REAL",
  }
}

export class PostgresRadioRepository implements RadioRepository {
  private readonly client: postgres.Sql
  private readonly db: Database

  constructor(databaseUrl: string, private readonly streamConfiguration: StreamConfiguration) {
    this.client = postgres(databaseUrl, { max: 10, idle_timeout: 20 })
    this.db = drizzle(this.client, { schema })
  }

  private streamFromRow(row: { id: string; channelId: string; name: string; url: string | null; enabled: boolean } | undefined): Stream | null {
    const url = this.streamConfiguration.url || row?.url || null
    const enabled = Boolean(this.streamConfiguration.enabled && url)
    if (!enabled || !url) return null
    return {
      id: row?.id || "stream-signal-main",
      channelId: row?.channelId || "signal-01",
      name: this.streamConfiguration.name || row?.name || "Signal / Main",
      url,
      enabled: true,
      health: "unknown",
      checkedAt: null,
      dataStatus: "REAL",
    }
  }

  async getStation(): Promise<Station | null> {
    const [row] = await this.db.select().from(schema.stations).limit(1)
    if (!row) return null
    const channels = await this.getChannels()
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      status: radioStatusForStream(channels[0]?.stream || null),
      dataStatus: "REAL",
    }
  }

  async getChannels(): Promise<Channel[]> {
    const rows = await this.db.select({
      id: schema.channels.id,
      stationId: schema.channels.stationId,
      name: schema.channels.name,
      genre: schema.channels.genre,
      description: schema.channels.description,
      streamId: schema.streams.id,
      streamChannelId: schema.streams.channelId,
      streamName: schema.streams.name,
      streamUrl: schema.streams.url,
      streamEnabled: schema.streams.enabled,
    }).from(schema.channels).leftJoin(schema.streams, eq(schema.streams.channelId, schema.channels.id)).orderBy(asc(schema.channels.name))
    return rows.map((row) => ({
      id: row.id,
      stationId: row.stationId,
      name: row.name,
      genre: row.genre,
      description: row.description,
      stream: this.streamFromRow(row.streamId ? {
        id: row.streamId,
        channelId: row.streamChannelId || row.id,
        name: row.streamName || row.name,
        url: row.streamUrl,
        enabled: row.streamEnabled || false,
      } : undefined),
      dataStatus: "REAL",
    }))
  }

  private async getTrackRows(playlistId: string) {
    return this.db.select({
      id: schema.tracks.id,
      title: schema.tracks.title,
      durationSeconds: schema.tracks.durationSeconds,
      artworkUrl: schema.tracks.artworkUrl,
      artistId: schema.artists.id,
      artistName: schema.artists.name,
      albumId: schema.albums.id,
      albumTitle: schema.albums.title,
      albumArtworkUrl: schema.albums.artworkUrl,
      position: schema.playlistItems.position,
    }).from(schema.playlistItems)
      .innerJoin(schema.tracks, eq(schema.tracks.id, schema.playlistItems.trackId))
      .innerJoin(schema.artists, eq(schema.artists.id, schema.tracks.artistId))
      .leftJoin(schema.albums, eq(schema.albums.id, schema.tracks.albumId))
      .where(eq(schema.playlistItems.playlistId, playlistId))
      .orderBy(asc(schema.playlistItems.position))
  }

  private async getPlaylist(): Promise<Playlist | null> {
    const [playlist] = await this.db.select().from(schema.playlists).orderBy(asc(schema.playlists.name)).limit(1)
    if (!playlist) return null
    const rows = await this.getTrackRows(playlist.id)
    return {
      id: playlist.id,
      channelId: playlist.channelId,
      name: playlist.name,
      description: playlist.description,
      items: rows.map((row) => ({ position: row.position, track: mapTrack(row) })),
      dataStatus: "REAL",
    }
  }

  async getNowPlaying(): Promise<NowPlaying> {
    const channels = await this.getChannels()
    const channel = channels[0]
    const programmes = await this.getProgrammes()
    const programme = programmes.find((item) => item.status === "CURRENT") || null
    const stream = channel?.stream || null
    const broadcast = await this.getBroadcastState()
    const current = broadcast.current
    const track = current ? {
      id: current.id,
      title: current.title,
      artist: { id: `artist-${current.artist.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`, name: current.artist },
      album: current.album ? { id: `album-${current.id}`, title: current.album, artworkUrl: current.artworkUrl } : null,
      durationSeconds: 0,
      artworkUrl: current.artworkUrl,
      dataStatus: "REAL" as const,
    } : null
    return {
      status: radioStatusForStream(stream),
      channelId: channel?.id || "signal-01",
      track,
      programme: current?.programme ? programmes.find((item) => item.title === current.programme) || programme : programme,
      startedAt: current?.startedAt || programme?.startTime || null,
      stream,
      metadataStatus: current ? "REAL" : stream ? "UNKNOWN" : "NOT_CONFIGURED",
    }
  }

  async getQueue(limit = 10): Promise<QueueItem[]> {
    const playlist = await this.getPlaylist()
    if (!playlist) return []
    return orderQueue(playlist.items.map((item) => ({ position: item.position, track: item.track, scheduledAt: null })), limit)
  }

  async getMediaAssets(): Promise<MediaAsset[]> {
    const rows = await this.db.select().from(schema.mediaAssets).where(eq(schema.mediaAssets.enabled, true)).orderBy(asc(schema.mediaAssets.title))
    return rows.map((row) => ({ id: row.id, title: row.title, artist: row.artist, album: row.album, path: row.path, kind: row.kind, durationSeconds: row.durationSeconds, artworkUrl: row.artworkUrl, enabled: row.enabled, programmeEligible: true }))
  }

  async getProgrammes(): Promise<Programme[]> {
    const rows = await this.db.select({
      id: schema.programmes.id,
      channelId: schema.programmes.channelId,
      title: schema.programmes.title,
      description: schema.programmes.description,
      host: schema.programmes.host,
      startTime: schema.schedules.startTime,
      endTime: schema.schedules.endTime,
    }).from(schema.programmes).leftJoin(schema.schedules, eq(schema.schedules.programmeId, schema.programmes.id)).orderBy(asc(schema.programmes.title))
    return rows.map((row) => withProgrammeStatus({
      id: row.id,
      channelId: row.channelId,
      title: row.title,
      description: row.description,
      host: row.host,
      startTime: row.startTime?.toISOString() || new Date(0).toISOString(),
      endTime: row.endTime?.toISOString() || new Date(0).toISOString(),
      status: "PAST",
      dataStatus: "REAL",
    }))
  }

  async getSchedule(from = new Date(0), to = new Date("2999-12-31T00:00:00.000Z")): Promise<Schedule[]> {
    const rows = await this.db.select({
      scheduleId: schema.schedules.id,
      programmeId: schema.schedules.programmeId,
      channelId: schema.schedules.channelId,
      startTime: schema.schedules.startTime,
      endTime: schema.schedules.endTime,
      title: schema.programmes.title,
      description: schema.programmes.description,
      host: schema.programmes.host,
    }).from(schema.schedules).innerJoin(schema.programmes, eq(schema.programmes.id, schema.schedules.programmeId))
      .where(and(lte(schema.schedules.startTime, to), gte(schema.schedules.endTime, from)))
      .orderBy(asc(schema.schedules.startTime))
    return rows.map((row) => {
      const programme = withProgrammeStatus({
        id: row.programmeId,
        channelId: row.channelId,
        title: row.title,
        description: row.description,
        host: row.host,
        startTime: row.startTime.toISOString(),
        endTime: row.endTime.toISOString(),
        status: "PAST",
        dataStatus: "REAL",
      })
      return {
        id: row.scheduleId,
        programmeId: row.programmeId,
        channelId: row.channelId,
        startTime: row.startTime.toISOString(),
        endTime: row.endTime.toISOString(),
        programme,
        dataStatus: "REAL",
      }
    })
  }

  async getBroadcastState(): Promise<BroadcastState> {
    const [session] = await this.client<{
      id: string
      status: string
      stream_mount: string
      last_error: string | null
      started_at: Date
    }[]>`SELECT id, status, stream_mount, last_error, started_at FROM broadcast_sessions WHERE status IN ('RUNNING', 'DEGRADED') ORDER BY started_at DESC LIMIT 1`
    const [event] = session ? await this.client<{
      id: string
      event_type: string
      metadata: Record<string, unknown>
      started_at: Date
    }[]>`SELECT id, event_type, metadata, started_at FROM broadcast_events WHERE session_id = ${session.id} AND event_type = 'track_started' ORDER BY started_at DESC LIMIT 1` : []
    const metadata = event?.metadata || {}
    const configured = Boolean(this.streamConfiguration.enabled && this.streamConfiguration.url)
    return {
      status: session ? (session.status === "DEGRADED" ? "DEGRADED" : "RUNNING") : (configured ? "STOPPED" : "NOT_CONFIGURED"),
      sessionId: session?.id || null,
      mount: session?.stream_mount || null,
      current: event ? {
        id: String(metadata.id || event.id),
        title: String(metadata.title || "Unknown track"),
        artist: String(metadata.artist || "Unknown artist"),
        album: metadata.album ? String(metadata.album) : null,
        artworkUrl: metadata.artworkUrl ? String(metadata.artworkUrl) : null,
        programme: metadata.programme ? String(metadata.programme) : null,
        startedAt: new Date(event.started_at).toISOString(),
        source: (["music", "programme", "podcast", "broadcast", "fallback"] as const).includes(metadata.source as never) ? metadata.source as BroadcastCurrentItem["source"] : "music",
      } : null,
      health: {
        configured,
        sourceAvailable: Boolean(event),
        broadcastEngineRunning: Boolean(session),
        icecastRunning: Boolean(session),
        streamReachable: false,
        listenerUrlAvailable: configured,
        lastError: session?.last_error || null,
        checkedAt: new Date().toISOString(),
      },
    }
  }

  async health(): Promise<RadioRepositoryHealth> {
    try {
      await this.db.execute(sql`select 1`)
      return { status: "ready" }
    } catch (error) {
      return { status: "unavailable", detail: error instanceof Error ? error.message : "Database unavailable" }
    }
  }

  async close(): Promise<void> {
    await this.client.end({ timeout: 5 })
  }
}

export interface AiDecisionStore { save(decision: AiDecision, contextHash: string): Promise<void>; enqueue?(decisionId: string, mediaIds: string[], programmeTitle: string): Promise<void>; list(limit?: number): Promise<AiDecision[]>; get(id: string): Promise<AiDecision | null> }

export class PostgresAiDecisionStore implements AiDecisionStore {
  constructor(private readonly sql: postgres.Sql) {}
  async save(decision: AiDecision, contextHash: string) { await this.sql`INSERT INTO ai_programming_decisions (id, request_type, provider, model, input_context_hash, proposal, validation_status, rejection_reason, explanation, latency_ms, created_at) VALUES (${decision.id}, ${decision.requestType}, ${decision.provider}, ${decision.model}, ${contextHash}, ${this.sql.json(JSON.parse(JSON.stringify(decision.proposal)) as any)}, ${decision.validationStatus}, ${decision.rejectionReason}, ${decision.explanation}, ${decision.latencyMs}, ${decision.createdAt})` }
  async enqueue(decisionId: string, mediaIds: string[], programmeTitle: string) { for (const [position, mediaId] of mediaIds.entries()) await this.sql`INSERT INTO ai_programming_queue (decision_id, media_asset_id, programme_title, position, status) VALUES (${decisionId}, ${mediaId}, ${programmeTitle}, ${position + 1}, 'PENDING') ON CONFLICT (decision_id, position) DO NOTHING` }
  async list(limit = 20) { const rows = await this.sql<any[]>`SELECT * FROM ai_programming_decisions ORDER BY created_at DESC LIMIT ${Math.min(limit, 100)}`; return rows.map(mapDecision) }
  async get(id: string) { const [row] = await this.sql<any[]>`SELECT * FROM ai_programming_decisions WHERE id = ${id} LIMIT 1`; return row ? mapDecision(row) : null }
}
function mapDecision(row: any): AiDecision { return { id: row.id, requestType: row.request_type, provider: row.provider, model: row.model, validationStatus: row.validation_status, rejectionReason: row.rejection_reason, explanation: row.explanation, proposal: row.proposal, latencyMs: row.latency_ms, createdAt: new Date(row.created_at).toISOString() } }

export function createPostgresRadioRepository(databaseUrl: string, streamConfiguration: StreamConfiguration): PostgresRadioRepository {
  return new PostgresRadioRepository(databaseUrl, streamConfiguration)
}
