"use client"

import { Pause, Play, Radio, Volume2 } from "lucide-react"
import { useEffect, useState } from "react"
import { apiFetch } from "@/lib/api"
import { StatusMark } from "@/components/product-shell"

type NowPlaying = { trackTitle: string; artist: string; programmeTitle: string; streamConfigured: boolean }
type QueueItem = { position: number; title: string; artist: string; durationSeconds: number }

export function RadioConsole() {
  const [nowPlaying, setNowPlaying] = useState<NowPlaying | null>(null)
  const [queue, setQueue] = useState<QueueItem[]>([])
  const [streamUrl, setStreamUrl] = useState<string | null>(null)
  const [playing, setPlaying] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      apiFetch<{ data: NowPlaying }>("/api/v1/radio/now-playing"),
      apiFetch<{ data: QueueItem[] }>("/api/v1/radio/queue"),
      apiFetch<{ data: { streamUrl: string | null }[] }>("/api/v1/radio/channels"),
    ]).then(([current, upcoming, channels]) => {
      setNowPlaying(current.data)
      setQueue(upcoming.data)
      setStreamUrl(channels.data[0]?.streamUrl || null)
    }).catch(() => setError("API unavailable. Start the API service to load live radio data."))
  }, [])

  return (
    <div className="grid gap-px border border-border bg-border lg:grid-cols-12">
      <div className="bg-hero p-6 text-hero-foreground md:p-8 lg:col-span-7">
        <div className="flex items-center justify-between gap-4 border-b border-hero-border pb-5">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center bg-hero-accent text-hero"><Radio className="h-4 w-4" /></span>
            <div><p className="font-mono text-[10px] uppercase tracking-widest text-hero-muted">Now playing</p><p className="text-sm font-semibold">Signal / Main</p></div>
          </div>
          <span className="font-mono text-[10px] uppercase tracking-widest text-hero-accent">{nowPlaying?.streamConfigured ? "LIVE" : "DEMO DATA"}</span>
        </div>
        <div className="py-16">
          <p className="font-mono text-xs uppercase tracking-widest text-hero-muted">{nowPlaying?.programmeTitle || "Loading programme"}</p>
          <h2 className="mt-3 text-4xl font-semibold tracking-tight md:text-6xl">{nowPlaying?.trackTitle || "Night Signal"}</h2>
          <p className="mt-3 text-hero-muted">{nowPlaying?.artist || "BlockTek Radio Library"}</p>
        </div>
        <div className="flex items-center gap-4 border-t border-hero-border pt-5">
          <button type="button" disabled={!streamUrl} onClick={() => setPlaying((value) => !value)} className="flex h-11 w-11 items-center justify-center bg-hero-accent text-hero disabled:cursor-not-allowed disabled:opacity-40" aria-label={playing ? "Pause stream" : "Play stream"}>
            {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </button>
          <div className="flex-1"><div className="flex h-8 items-end gap-1" aria-hidden="true">{Array.from({ length: 28 }, (_, i) => <span key={i} className="w-full bg-hero-accent/60" style={{ height: `${20 + ((i * 17) % 70)}%` }} />)}</div></div>
          <Volume2 className="h-4 w-4 text-hero-muted" aria-hidden="true" />
        </div>
        {!streamUrl && <p className="mt-4 font-mono text-[10px] uppercase tracking-widest text-hero-muted">RADIO STREAM: NOT CONFIGURED</p>}
        {error && <p className="mt-4 text-sm text-red-300">{error}</p>}
      </div>
      <div className="bg-background p-6 md:p-8 lg:col-span-5">
        <div className="border-b border-border pb-4"><span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Queue / next</span></div>
        <div className="mt-6">{queue.map((item) => <div key={item.position} className="flex items-start gap-4 border-b border-border py-4 last:border-b-0"><span className="font-mono text-xs text-accent">0{item.position}</span><div><p className="text-sm font-semibold">{item.title}</p><p className="mt-1 text-sm text-muted-foreground">{item.artist}</p></div><span className="ml-auto font-mono text-xs text-muted-foreground">{Math.floor(item.durationSeconds / 60)}:{String(item.durationSeconds % 60).padStart(2, "0")}</span></div>)}</div>
        <div className="mt-8 border-t border-border pt-5"><StatusMark label="Stream source" value={streamUrl ? "Configured" : "Not configured"} tone={streamUrl ? "accent" : "neutral"} /><StatusMark label="Listener state" value={playing ? "Playing" : "Stopped"} /></div>
      </div>
    </div>
  )
}
