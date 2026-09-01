import type { Channel, NowPlaying, QueueItem, Station } from "@blocktek/types"

export const stations: Station[] = [
  {
    id: "blocktek-main",
    name: "BlockTek Radio",
    description: "A development station for decentralized audio and privacy-first programming.",
    status: process.env.RADIO_STREAM_URL ? "online" : "not-configured",
  },
]

export const channels: Channel[] = [
  {
    id: "signal-01",
    stationId: "blocktek-main",
    name: "Signal / Main",
    genre: "Experimental electronic",
    streamUrl: process.env.RADIO_STREAM_URL || null,
  },
]

export const queue: QueueItem[] = [
  { position: 1, title: "Proof of Sound", artist: "BlockTek Radio Library", durationSeconds: 246 },
  { position: 2, title: "Open Frequency", artist: "BlockTek Radio Library", durationSeconds: 188 },
  { position: 3, title: "Relay State", artist: "BlockTek Radio Library", durationSeconds: 271 },
]

export function nowPlaying(): NowPlaying {
  return {
    channelId: "signal-01",
    programmeTitle: "Development Signal",
    trackTitle: "Night Signal",
    artist: "BlockTek Radio Library",
    startedAt: new Date().toISOString(),
    durationSeconds: 214,
    streamConfigured: Boolean(process.env.RADIO_STREAM_URL),
  }
}
