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

  async event(sessionId: string, eventType: string, item: BroadcastQueueItem | null, error?: string) {
    const id = `event-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const metadata = item ? { id: item.id, title: item.title, artist: item.artist, album: item.album, artworkUrl: item.artworkUrl, programme: item.programme, source: item.source } : {}
    await this.sql`INSERT INTO broadcast_events (id, session_id, event_type, metadata, started_at) VALUES (${id}, ${sessionId}, ${eventType}, ${this.sql.json(metadata)}, now())`
    if (error) await this.sql`UPDATE broadcast_sessions SET status = 'DEGRADED', last_error = ${error.slice(0, 500)}, updated_at = now() WHERE id = ${sessionId}`
  }

  async currentProgrammeTitle(): Promise<string | null> {
    const [row] = await this.sql<{ title: string }[]>`SELECT p.title FROM schedules s JOIN programmes p ON p.id = s.programme_id WHERE s.start_time <= now() AND s.end_time > now() ORDER BY s.start_time DESC LIMIT 1`
    return row?.title || null
  }

  async stopSession(sessionId: string, error?: string) {
    await this.event(sessionId, "broadcast_stopped", null, error)
    await this.sql`UPDATE broadcast_sessions SET status = 'STOPPED', ended_at = now(), last_error = ${error?.slice(0, 500) || null}, updated_at = now() WHERE id = ${sessionId}`
  }

  async close() { await this.sql.end({ timeout: 5 }) }
}
