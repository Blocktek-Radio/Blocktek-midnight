import postgres from "postgres"
import type { BroadcastQueueItem } from "@blocktek/radio-core"

export class BroadcastStore {
  private readonly sql: postgres.Sql
  constructor(databaseUrl: string) { this.sql = postgres(databaseUrl, { max: 2, idle_timeout: 20 }) }

  async startSession(stationId: string, mount: string): Promise<string> {
    const id = `broadcast-${Date.now()}`
    await this.sql`UPDATE broadcast_sessions SET status = 'STOPPED', ended_at = now(), updated_at = now() WHERE status IN ('RUNNING', 'DEGRADED')`
    await this.sql`INSERT INTO broadcast_sessions (id, station_id, status, stream_mount, started_at) VALUES (${id}, ${stationId}, 'RUNNING', ${mount}, now())`
    await this.event(id, "broadcast_started", null)
    return id
  }

  async syncMediaAssets(items: BroadcastQueueItem[]) {
    for (const item of items.filter((candidate) => !candidate.path.startsWith("tone://"))) {
      await this.sql`INSERT INTO media_assets (id, title, artist, album, path, kind, duration_seconds, artwork_url, enabled)
        VALUES (${item.id}, ${item.title}, ${item.artist}, ${item.album}, ${item.path}, ${item.source}, ${item.durationSeconds ? Math.round(item.durationSeconds) : null}, ${item.artworkUrl}, true)
        ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, artist = EXCLUDED.artist, album = EXCLUDED.album, path = EXCLUDED.path, kind = EXCLUDED.kind, duration_seconds = EXCLUDED.duration_seconds, artwork_url = EXCLUDED.artwork_url, enabled = true, updated_at = now()`
    }
  }

  async event(sessionId: string, eventType: string, item: BroadcastQueueItem | null, error?: string) {
    const id = `event-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const metadata = item ? { id: item.id, title: item.title, artist: item.artist, album: item.album, artworkUrl: item.artworkUrl, programme: item.programme, source: item.source } : {}
    await this.sql`INSERT INTO broadcast_events (id, session_id, media_asset_id, event_type, metadata, started_at) VALUES (${id}, ${sessionId}, ${item?.path.startsWith("tone://") ? null : item?.id || null}, ${eventType}, ${this.sql.json(metadata)}, now())`
    if (error) await this.sql`UPDATE broadcast_sessions SET status = 'DEGRADED', last_error = ${error.slice(0, 500)}, updated_at = now() WHERE id = ${sessionId}`
  }

  async currentProgrammeTitle(): Promise<string | null> {
    const [row] = await this.sql<{ title: string }[]>`SELECT p.title FROM schedules s JOIN programmes p ON p.id = s.programme_id WHERE s.start_time <= now() AND s.end_time > now() ORDER BY s.start_time DESC LIMIT 1`
    return row?.title || null
  }

  async claimNextAiItem(): Promise<BroadcastQueueItem | null> {
    const [row] = await this.sql<{ media_id: string; title: string; artist: string; album: string | null; path: string; duration_seconds: number | null; artwork_url: string | null; programme_title: string; queue_id: string }[]>`SELECT q.media_asset_id AS media_id, m.title, m.artist, m.album, m.path, m.duration_seconds, m.artwork_url, q.programme_title, q.decision_id || ':' || q.position AS queue_id FROM ai_programming_queue q JOIN media_assets m ON m.id = q.media_asset_id WHERE q.status = 'PENDING' AND m.enabled = true ORDER BY q.created_at, q.position LIMIT 1`
    if (!row) return null
    const updated = await this.sql`UPDATE ai_programming_queue SET status = 'PLAYING' WHERE decision_id || ':' || position = ${row.queue_id} AND status = 'PENDING' RETURNING decision_id`
    if (!updated.length) return this.claimNextAiItem()
    return { id: row.media_id, title: row.title, artist: row.artist, album: row.album, artworkUrl: row.artwork_url, programme: row.programme_title, startedAt: new Date().toISOString(), source: "music", path: row.path, durationSeconds: row.duration_seconds || undefined }
  }

  async completeAiItem(item: BroadcastQueueItem) {
    await this.sql`UPDATE ai_programming_queue SET status = 'PLAYED', played_at = now() WHERE media_asset_id = ${item.id} AND status = 'PLAYING'`
  }

  async stopSession(sessionId: string, error?: string) {
    await this.event(sessionId, "broadcast_stopped", null, error)
    await this.sql`UPDATE broadcast_sessions SET status = 'STOPPED', ended_at = now(), last_error = ${error?.slice(0, 500) || null}, updated_at = now() WHERE id = ${sessionId}`
  }

  async close() { await this.sql.end({ timeout: 5 }) }
}
