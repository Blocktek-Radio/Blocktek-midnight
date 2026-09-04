"use client"

import { useState } from "react"
import { Check, EyeOff, LockKeyhole, Send } from "lucide-react"
import { apiFetch } from "@/lib/api"

type Contribution = { id: string; state: string; title: string; contentCommitment: string; privacyStatus: string; editorialStatus: string; programmingEligible: boolean }

export function ContributionConsole() {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [proofReference, setProofReference] = useState("")
  const [contribution, setContribution] = useState<Contribution | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setMessage(null)
    try { const result = await apiFetch<{ data: Contribution }>("/api/v1/contributions", { method: "POST", body: JSON.stringify({ contentType: "TEXT", title, description }) }); setContribution(result.data); setMessage("Contribution created. It is waiting for a real Midnight proof.") } catch (error) { setMessage(error instanceof Error ? error.message : "Contribution could not be created") } finally { setBusy(false) }
  }

  async function requestProof() {
    if (!contribution || !proofReference.trim()) return
    setBusy(true); setMessage(null)
    try { const result = await apiFetch<{ data: { contribution: Contribution } }>(`/api/v1/contributions/${contribution.id}/prove-eligibility`, { method: "POST", body: JSON.stringify({ claimType: "eligible_contributor", proofReference, disclosedAttributes: ["eligibility"], expiresAt: null }) }); setContribution(result.data.contribution); setMessage("Midnight proof verified.") } catch (error) { setMessage(error instanceof Error ? error.message : "Midnight verification is unavailable") } finally { setBusy(false) }
  }

  const steps = ["SUBMITTED", "PRIVACY_VERIFICATION_PENDING", "PRIVACY_VERIFIED", "EDITORIAL_REVIEW", "PROGRAMMABLE"]
  const currentStep = contribution ? steps.indexOf(contribution.state) : -1
  return <div className="grid gap-px border border-border bg-border lg:grid-cols-12"><form onSubmit={submit} className="space-y-5 bg-background p-6 md:p-8 lg:col-span-7"><div className="flex items-center gap-3 border-b border-border pb-5"><LockKeyhole className="h-5 w-5 text-accent" /><div><p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Contributor intake</p><p className="text-sm font-semibold">Metadata only; no witness data</p></div></div><label className="block"><span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Contribution title</span><input required value={title} onChange={(event) => setTitle(event.target.value)} className="mt-2 block w-full border border-border bg-secondary px-3 py-3 text-sm outline-none focus:border-accent" /></label><label className="block"><span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Editorial description</span><textarea required minLength={10} value={description} onChange={(event) => setDescription(event.target.value)} rows={6} className="mt-2 block w-full resize-y border border-border bg-secondary px-3 py-3 text-sm outline-none focus:border-accent" /></label><button disabled={busy} type="submit" className="inline-flex items-center gap-2 bg-foreground px-4 py-3 text-sm font-medium text-background disabled:opacity-50"><Send className="h-4 w-4" />Submit contribution</button>{contribution && <div className="space-y-3 border-t border-border pt-5"><p className="font-mono text-xs uppercase tracking-widest text-accent">Contribution {contribution.id.slice(0, 8)}</p><p className="text-sm">Commitment: <code className="break-all text-xs">{contribution.contentCommitment}</code></p><label className="block"><span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Real proof reference</span><input value={proofReference} onChange={(event) => setProofReference(event.target.value)} placeholder="Provided by the configured wallet/prover" className="mt-2 block w-full border border-border bg-secondary px-3 py-3 text-sm outline-none focus:border-accent" /></label><button disabled={busy || !proofReference.trim()} type="button" onClick={requestProof} className="border border-foreground px-4 py-3 text-sm disabled:opacity-50">Request Midnight verification</button></div>}{message && <p className="text-sm text-muted-foreground">{message}</p>}</form><div className="bg-secondary p-6 md:p-8 lg:col-span-5"><p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Privacy boundary</p><h2 className="mt-6 text-3xl font-semibold tracking-tight">Prove eligibility. Keep identity private.</h2><div className="mt-8 space-y-4 border-y border-border py-5">{steps.map((step, index) => <div key={step} className="flex items-center gap-3 text-sm"><span className={index <= currentStep ? "flex h-6 w-6 items-center justify-center bg-accent text-accent-foreground" : "flex h-6 w-6 items-center justify-center border border-border text-muted-foreground"}>{index <= currentStep ? <Check className="h-3 w-3" /> : index + 1}</span><span className={index <= currentStep ? "font-medium" : "text-muted-foreground"}>{step.replaceAll("_", " ")}</span></div>)}</div><p className="mt-5 flex gap-2 text-sm leading-relaxed text-muted-foreground"><EyeOff className="h-4 w-4 shrink-0" />Identity, location, wallet secrets, and raw witness data remain outside this API.</p></div></div>
}
