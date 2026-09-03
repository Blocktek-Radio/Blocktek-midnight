import type {
  BroadcastCurrentItem,
  BroadcastState,
  Channel,
  DataStatus,
  NowPlaying,
  Playlist,
  Programme,
  QueueItem,
  RadioStatus,
  Schedule,
  Station,
  Stream,
  Track,
} from "@blocktek/types"

export type RadioRepositoryHealth = {
  status: "ready" | "not-configured" | "unavailable"
  detail?: string
}

export interface RadioRepository {
  getStation(): Promise<Station | null>
  getChannels(): Promise<Channel[]>
  getNowPlaying(): Promise<NowPlaying>
  getQueue(limit?: number): Promise<QueueItem[]>
  getProgrammes(): Promise<Programme[]>
  getSchedule(from?: Date, to?: Date): Promise<Schedule[]>
  getBroadcastState(): Promise<BroadcastState>
  health(): Promise<RadioRepositoryHealth>
  close(): Promise<void>
}

export type RadioSeed = {
  station: Station
  channel: Channel
  stream: Stream | null
  tracks: Track[]
  playlist: Playlist
  programmes: Programme[]
  schedule: Schedule[]
}

type DurationItem = { durationSeconds: number } | Pick<QueueItem, "track">

export function totalDurationSeconds(items: DurationItem[]): number {
  return items.reduce((total, item) => total + ("durationSeconds" in item ? item.durationSeconds : item.track.durationSeconds), 0)
}

export function takeUntilDuration<T extends { durationSeconds: number }>(items: T[], durationMinutes: number): T[] {
  const limit = durationMinutes * 60
  const selected: T[] = []
  let total = 0
  for (const item of items) {
    if (selected.length > 0 && total + item.durationSeconds > limit) break
    selected.push(item)
    total += item.durationSeconds
  }
  return selected
}

export function radioStatusForStream(stream: Pick<Stream, "enabled" | "url" | "health"> | null): RadioStatus {
  if (!stream?.enabled || !stream.url) return "NOT_CONFIGURED"
  if (stream.health === "reachable") return "LIVE"
  if (stream.health === "unreachable") return "OFFLINE"
  return "CONNECTING"
}

export type BroadcastQueueItem = BroadcastCurrentItem & { path: string; durationSeconds?: number }

export interface BroadcastQueueProvider {
  next(): Promise<BroadcastQueueItem | null>
}

export type ScheduledWindow = { startTime: string; endTime: string; title: string }

/** Pure, deterministic selection: a scheduled programme wins, then queue, then fallback. */
export function selectBroadcastItem(
  scheduled: ScheduledWindow | null,
  queueItem: BroadcastQueueItem | null,
  fallback: BroadcastQueueItem | null,
): BroadcastQueueItem | null {
  if (scheduled && queueItem) return { ...queueItem, programme: scheduled.title }
  return queueItem || fallback
}

export function programmeStatus(startTime: string, endTime: string, now = new Date()): Programme["status"] {
  const current = now.getTime()
  if (current < Date.parse(startTime)) return "UPCOMING"
  if (current >= Date.parse(endTime)) return "PAST"
  return "CURRENT"
}

export function withProgrammeStatus(programme: Programme, now = new Date()): Programme {
  return { ...programme, status: programmeStatus(programme.startTime, programme.endTime, now) }
}

export function orderQueue(items: QueueItem[], limit = 10): QueueItem[] {
  return [...items]
    .sort((left, right) => left.position - right.position)
    .slice(0, limit)
    .map((item, index) => ({ ...item, position: index + 1 }))
}

export function createRadioSeed(options: {
  streamUrl?: string
  streamName?: string
  streamEnabled?: boolean
  now?: Date
} = {}): RadioSeed {
  const now = options.now ?? new Date()
  const streamEnabled = Boolean(options.streamEnabled && options.streamUrl)
  const stream: Stream | null = streamEnabled && options.streamUrl
    ? {
      id: "stream-signal-main",
      channelId: "signal-01",
      name: options.streamName || "Signal / Main",
      url: options.streamUrl,
      enabled: true,
      health: "unknown",
      checkedAt: null,
      dataStatus: "REAL",
    }
    : null
  const station: Station = {
    id: "blocktek-main",
    name: "BlockTek Radio",
    description: "A privacy-first station for decentralized audio and community programming.",
    status: radioStatusForStream(stream),
    dataStatus: "DEMO",
  }
  const channel: Channel = {
    id: "signal-01",
    stationId: station.id,
    name: "Signal / Main",
    genre: "Experimental electronic",
    description: "The main BlockTek Radio channel.",
    stream,
    dataStatus: "DEMO",
  }
  const tracks: Track[] = [
    { id: "track-001", title: "Proof of Sound", artist: { id: "artist-001", name: "BlockTek Radio Library" }, album: null, durationSeconds: 246, artworkUrl: null, dataStatus: "DEMO" },
    { id: "track-002", title: "Open Frequency", artist: { id: "artist-001", name: "BlockTek Radio Library" }, album: null, durationSeconds: 188, artworkUrl: null, dataStatus: "DEMO" },
    { id: "track-003", title: "Relay State", artist: { id: "artist-001", name: "BlockTek Radio Library" }, album: null, durationSeconds: 271, artworkUrl: null, dataStatus: "DEMO" },
  ]
  const programmeStart = new Date(now.getTime() - 30 * 60_000)
  const programmeEnd = new Date(now.getTime() + 90 * 60_000)
  const programme: Programme = {
    id: "programme-development-signal",
    channelId: channel.id,
    title: "Development Signal",
    description: "Seed programming used to exercise the radio interface before a real schedule is loaded.",
    host: null,
    startTime: programmeStart.toISOString(),
    endTime: programmeEnd.toISOString(),
    status: "CURRENT",
    dataStatus: "DEMO",
  }
  const schedule: Schedule[] = [{
    id: "schedule-development-signal",
    programmeId: programme.id,
    channelId: channel.id,
    startTime: programme.startTime,
    endTime: programme.endTime,
    programme,
    dataStatus: "DEMO",
  }]
  return {
    station,
    channel,
    stream,
    tracks,
    playlist: {
      id: "playlist-development-signal",
      channelId: channel.id,
      name: "Development Signal Queue",
      description: "Deterministic seed queue for development and tests.",
      items: tracks.map((track, index) => ({ position: index + 1, track })),
      dataStatus: "DEMO",
    },
    programmes: [programme],
    schedule,
  }
}

export class InMemoryRadioRepository implements RadioRepository {
  constructor(private readonly seed: RadioSeed = createRadioSeed()) {}

  async getStation(): Promise<Station> {
    return { ...this.seed.station, status: radioStatusForStream(this.seed.stream) }
  }

  async getChannels(): Promise<Channel[]> {
    return [{ ...this.seed.channel, stream: this.seed.stream ? { ...this.seed.stream } : null }]
  }

  async getNowPlaying(): Promise<NowPlaying> {
    const programme = withProgrammeStatus(this.seed.programmes[0])
    return {
      status: radioStatusForStream(this.seed.stream),
      channelId: this.seed.channel.id,
      track: null,
      programme: programme.status === "PAST" ? null : programme,
      startedAt: programme.status === "PAST" ? null : programme.startTime,
      stream: this.seed.stream ? { ...this.seed.stream } : null,
      metadataStatus: "UNKNOWN",
    }
  }

  async getQueue(limit = 10): Promise<QueueItem[]> {
    return orderQueue(this.seed.playlist.items.map((item, index) => ({
      position: index + 1,
      track: item.track,
      scheduledAt: null,
    })), limit)
  }

  async getProgrammes(): Promise<Programme[]> {
    return this.seed.programmes.map((programme) => withProgrammeStatus(programme))
  }

  async getSchedule(from = new Date(0), to = new Date("2999-12-31T00:00:00.000Z")): Promise<Schedule[]> {
    return this.seed.schedule.filter((item) => Date.parse(item.endTime) >= from.getTime() && Date.parse(item.startTime) <= to.getTime())
      .map((item) => ({ ...item, programme: withProgrammeStatus(item.programme) }))
  }

  async getBroadcastState(): Promise<BroadcastState> {
    const configured = Boolean(this.seed.stream?.enabled && this.seed.stream.url)
    return {
      status: configured ? "STOPPED" : "NOT_CONFIGURED",
      sessionId: null,
      mount: null,
      current: null,
      health: {
        configured,
        sourceAvailable: false,
        broadcastEngineRunning: false,
        icecastRunning: false,
        streamReachable: false,
        listenerUrlAvailable: false,
        lastError: null,
        checkedAt: new Date().toISOString(),
      },
    }
  }

  async health(): Promise<RadioRepositoryHealth> {
    return { status: "not-configured", detail: "Using the in-memory development repository." }
  }

  async close(): Promise<void> {}
}

export function dataStatusForStream(stream: Stream | null): DataStatus {
  if (!stream) return "NOT_CONFIGURED"
  if (stream.health === "unreachable") return "OFFLINE"
  return stream.dataStatus
}
