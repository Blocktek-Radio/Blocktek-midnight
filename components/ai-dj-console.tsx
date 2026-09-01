"use client"

import { Bot, LoaderCircle, WandSparkles } from "lucide-react"
import { useState } from "react"
import { apiFetch } from "@/lib/api"

type Programme = { title: string; introduction: string; source: string; tracks: { title: string; artist: string }[]; selectionMetadata: { overallSelectionScore: number } }

export function AiDjConsole() {
  const [form, setForm] = useState({ theme: "Web3 Builders", mood: "Late Night", durationMinutes: 30, audience: "Developers" })
  const [result, setResult] = useState<Programme | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setLoading(true); setError(null)
    try { setResult((await apiFetch<{ data: Programme }>("/api/v1/ai/programmes", { method: "POST", body: JSON.stringify(form) })).data) }
    catch { setError("AI service unavailable. Check the API status and provider configuration.") }
    finally { setLoading(false) }
  }
  return <div className="grid gap-px border border-border bg-border lg:grid-cols-12">
    <form onSubmit={submit} className="space-y-5 bg-background p-6 md:p-8 lg:col-span-5">
      <div className="flex items-center gap-3 border-b border-border pb-5"><Bot className="h-5 w-5 text-accent" /><div><p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">AI DJ / programme builder</p><p className="text-sm font-semibold">Create a programme</p></div></div>
      {(["theme", "mood", "audience"] as const).map((key) => <label key={key} className="block"><span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{key}</span><input value={form[key]} onChange={(event) => setForm({ ...form, [key]: event.target.value })} className="mt-2 block w-full border border-border bg-secondary px-3 py-3 text-sm outline-none focus:border-accent" /></label>)}
      <label className="block"><span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Duration / minutes</span><input type="number" min={5} max={180} value={form.durationMinutes} onChange={(event) => setForm({ ...form, durationMinutes: Number(event.target.value) })} className="mt-2 block w-full border border-border bg-secondary px-3 py-3 text-sm outline-none focus:border-accent" /></label>
      <button type="submit" disabled={loading} className="inline-flex w-full items-center justify-center gap-2 bg-foreground px-4 py-3 text-sm font-medium text-background disabled:opacity-60">{loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <WandSparkles className="h-4 w-4" />}Generate programme</button>
      {error && <p className="text-sm text-red-700">{error}</p>}
    </form>
    <div className="bg-secondary p-6 md:p-8 lg:col-span-7"><div className="flex items-center justify-between border-b border-border pb-5"><span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Provider output</span><span className="font-mono text-[10px] uppercase tracking-widest text-accent">{result?.source || "WAITING"}</span></div>{result ? <><h2 className="mt-8 text-3xl font-semibold tracking-tight">{result.title}</h2><p className="mt-4 max-w-xl leading-relaxed text-muted-foreground">{result.introduction}</p><div className="mt-8 divide-y divide-border border-y border-border">{result.tracks.map((track, index) => <div key={track.title} className="flex gap-4 py-4"><span className="font-mono text-xs text-accent">0{index + 1}</span><div><p className="text-sm font-semibold">{track.title}</p><p className="text-sm text-muted-foreground">{track.artist}</p></div></div>)}</div><p className="mt-6 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Selection score: {result.selectionMetadata.overallSelectionScore.toFixed(2)} / provider metadata</p></> : <div className="flex min-h-72 items-center justify-center text-center"><p className="max-w-sm text-sm leading-relaxed text-muted-foreground">Submit a brief to receive structured programme data. Development output is labelled and is not a claim of real model inference.</p></div>}</div>
  </div>
}
