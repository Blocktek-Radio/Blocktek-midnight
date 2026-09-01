"use client"

import { Pause, Play, Radio, RefreshCw, Volume2, VolumeX } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { apiFetch } from "@/lib/api"
import { StatusMark } from "@/components/product-shell"

import type { NowPlaying, QueueItem, RadioStatus, Stream } from "@blocktek/types"

export function RadioConsole() {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [nowPlaying, setNowPlaying] = useState<NowPlaying | null>(null)
  const [queue, setQueue] = useState<QueueItem[]>([])
  const [stream, setStream] = useState<Stream | null>(null)
  const [playerState, setPlayerState] = useState<"IDLE" | "CONNECTING" | "PLAYING" | "PAUSED" | "OFFLINE">("IDLE")
  const [radioStatus, setRadioStatus] = useState<RadioStatus>("CONNECTING")
  const [apiUnavailable, setApiUnavailable] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [volume, setVolume] = useState(1)
  const [muted, setMuted] = useState(false)

  useEffect(() => {
    const loadRadio = () => Promise.all([
      apiFetch<{ data: NowPlaying }>("/api/v1/radio/now-playing"),
      apiFetch<{ data: QueueItem[] }>("/api/v1/radio/queue"),
      apiFetch<{ data: { stream: Stream | null }[] }>("/api/v1/radio/channels"),
    ]).then(([current, upcoming, channels]) => {
      setNowPlaying(current.data)
      setQueue(upcoming.data)
      setStream(current.data.stream || channels.data[0]?.stream || null)
      setRadioStatus(current.data.status)
      setApiUnavailable(false)
    }).catch(() => {
      setApiUnavailable(true)
      setRadioStatus("OFFLINE")
      setError("API UNAVAILABLE. The radio service is not reachable from this browser.")
    })
    void loadRadio()
    const interval = window.setInterval(() => {
      apiFetch<{ data: NowPlaying }>("/api/v1/radio/now-playing").then((current) => {
        setNowPlaying(current.data)
        setRadioStatus(current.data.status)
        setApiUnavailable(false)
      }).catch(() => setApiUnavailable(true))
    }, 15000)
    return () => window.clearInterval(interval)
  }, [])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    audio.volume = volume
    audio.muted = muted
  }, [volume, muted])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    audio.pause()
    audio.load()
    setPlayerState(stream ? "CONNECTING" : "IDLE")
  }, [stream])

  const displayedStatus = apiUnavailable ? "API UNAVAILABLE" : stream ? (playerState === "PLAYING" ? "LIVE" : radioStatus) : "NOT CONFIGURED"
  const track = nowPlaying?.track
  const programme = nowPlaying?.programme

  function playStream() {
    const audio = audioRef.current
    if (!audio || !stream?.url) return
    setError(null)
    setPlayerState("CONNECTING")
    void audio.play().catch(() => {
      setPlayerState("OFFLINE")
      setError("Playback was blocked or the stream could not be opened. Use the play button to try again.")
    })
  }

  function retryStream() {
    const audio = audioRef.current
    if (!audio || !stream?.url) return
    audio.load()
    playStream()
  }

  return (
    <div className="grid gap-px border border-border bg-border lg:grid-cols-12">
      <audio ref={audioRef} src={stream?.url || undefined} preload="none" onLoadStart={() => setPlayerState(stream ? "CONNECTING" : "IDLE")} onCanPlay={() => setPlayerState((state) => state === "PLAYING" ? state : "PAUSED")} onPlaying={() => { setPlayerState("PLAYING"); setRadioStatus("LIVE"); setError(null) }} onPause={() => setPlayerState((state) => state === "PLAYING" ? "PAUSED" : state)} onWaiting={() => setPlayerState("CONNECTING")} onStalled={() => setPlayerState("CONNECTING")} onError={() => { setPlayerState("OFFLINE"); setRadioStatus("OFFLINE"); setError("The configured stream is unavailable or invalid.") }} />
      <div className="bg-hero p-6 text-hero-foreground md:p-8 lg:col-span-7">
        <div className="flex items-center justify-between gap-4 border-b border-hero-border pb-5">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center bg-hero-accent text-hero"><Radio className="h-4 w-4" /></span>
            <div><p className="font-mono text-[10px] uppercase tracking-widest text-hero-muted">Radio status</p><p className="text-sm font-semibold">{stream?.name || "Signal / Main"}</p></div>
          </div>
          <span className="font-mono text-[10px] uppercase tracking-widest text-hero-accent">{displayedStatus}</span>
        </div>
        <div className="py-16">
          <p className="font-mono text-xs uppercase tracking-widest text-hero-muted">{programme?.title || (apiUnavailable ? "API unavailable" : "No programme metadata")}</p>
          <h2 className="mt-3 text-4xl font-semibold tracking-tight md:text-6xl">{track?.title || "No track metadata"}</h2>
          <p className="mt-3 text-hero-muted">{track?.artist.name || "Track metadata unavailable"}</p>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-hero-muted">{programme?.description || "The stream can play without now-playing metadata when no metadata provider is configured."}</p>
        </div>
        <div className="flex items-center gap-4 border-t border-hero-border pt-5">
          <button type="button" disabled={!stream?.url || playerState === "CONNECTING"} onClick={() => playerState === "PLAYING" ? audioRef.current?.pause() : playStream()} className="flex h-11 w-11 items-center justify-center bg-hero-accent text-hero disabled:cursor-not-allowed disabled:opacity-40" aria-label={playerState === "PLAYING" ? "Pause stream" : "Play stream"}>
            {playerState === "PLAYING" ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </button>
          <div className="flex-1"><div className="flex h-8 items-end gap-1" aria-hidden="true">{Array.from({ length: 28 }, (_, i) => <span key={i} className="w-full bg-hero-accent/60" style={{ height: `${20 + ((i * 17) % 70)}%` }} />)}</div></div>
          <button type="button" disabled={!stream?.url} onClick={() => setMuted((value) => !value)} className="flex h-9 w-9 items-center justify-center text-hero-muted hover:text-hero disabled:cursor-not-allowed disabled:opacity-40" aria-label={muted ? "Unmute stream" : "Mute stream"}>{muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}</button>
          <label className="sr-only" htmlFor="radio-volume">Volume</label>
          <input id="radio-volume" type="range" min="0" max="1" step="0.01" value={muted ? 0 : volume} onChange={(event) => { setMuted(false); setVolume(Number(event.target.value)) }} disabled={!stream?.url} className="w-20 accent-[color:var(--color-hero-accent)] disabled:opacity-40" />
        </div>
        {!stream && !apiUnavailable && <p className="mt-4 font-mono text-[10px] uppercase tracking-widest text-hero-muted">RADIO STREAM: NOT CONFIGURED</p>}
        {error && <div className="mt-4 flex items-center gap-3 text-sm text-red-300"><p>{error}</p>{stream?.url && <button type="button" onClick={retryStream} className="inline-flex shrink-0 items-center gap-2 border border-hero-border px-3 py-2 text-xs text-hero hover:border-hero-accent" aria-label="Retry stream"><RefreshCw className="h-3.5 w-3.5" />Retry</button>}</div>}
      </div>
      <div className="bg-background p-6 md:p-8 lg:col-span-5">
        <div className="border-b border-border pb-4"><span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Queue / next</span></div>
        <div className="mt-6">{queue.map((item) => <div key={item.position} className="flex items-start gap-4 border-b border-border py-4 last:border-b-0"><span className="font-mono text-xs text-accent">0{item.position}</span><div><p className="text-sm font-semibold">{item.track.title}</p><p className="mt-1 text-sm text-muted-foreground">{item.track.artist.name}</p></div><span className="ml-auto font-mono text-xs text-muted-foreground">{Math.floor(item.track.durationSeconds / 60)}:{String(item.track.durationSeconds % 60).padStart(2, "0")}</span></div>)}</div>
        {!queue.length && <p className="mt-6 text-sm text-muted-foreground">{apiUnavailable ? "API unavailable. Queue data was not loaded." : "No upcoming queue items are available."}</p>}
        <div className="mt-8 border-t border-border pt-5"><StatusMark label="Stream source" value={stream ? stream.health.toUpperCase() : apiUnavailable ? "API UNAVAILABLE" : "NOT CONFIGURED"} tone={stream?.health === "reachable" ? "accent" : "neutral"} /><StatusMark label="Listener state" value={playerState === "PLAYING" ? "Playing" : playerState === "CONNECTING" ? "Connecting" : playerState === "OFFLINE" ? "Offline" : "Stopped"} /><StatusMark label="Programme data" value={programme?.dataStatus || "UNKNOWN"} /></div>
      </div>
    </div>
  )
}
