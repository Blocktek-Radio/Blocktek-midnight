"use client"

import { Check, EyeOff, ShieldAlert } from "lucide-react"
import { useEffect, useState } from "react"
import { apiFetch } from "@/lib/api"

type Verification = { configured: boolean; status: string; network: string; capabilities: string[] }
type Disclosure = { reveal: string[]; hide: string[]; policy: string }

export function VerificationConsole() {
  const [verification, setVerification] = useState<Verification | null>(null)
  const [disclosure, setDisclosure] = useState<Disclosure | null>(null)
  useEffect(() => { Promise.all([apiFetch<{ data: Verification }>("/api/v1/midnight/status"), apiFetch<{ data: Disclosure }>("/api/v1/verification/disclosure")]).then(([status, policy]) => { setVerification(status.data); setDisclosure(policy.data) }).catch(() => undefined) }, [])
  return <div className="grid gap-px border border-border bg-border lg:grid-cols-12"><div className="bg-hero p-6 text-hero-foreground md:p-8 lg:col-span-5"><ShieldAlert className="h-6 w-6 text-hero-accent" /><p className="mt-8 font-mono text-[10px] uppercase tracking-widest text-hero-muted">Midnight network status</p><h2 className="mt-3 text-4xl font-semibold tracking-tight">{verification?.status || "LOADING"}</h2><p className="mt-4 text-sm leading-relaxed text-hero-muted">A status boundary is useful only when it is honest. No proof is shown as verified until a real Midnight verifier is configured.</p><div className="mt-8 border-t border-hero-border pt-4"><p className="font-mono text-[10px] uppercase tracking-widest text-hero-muted">Network</p><p className="mt-2 text-sm">{verification?.network || "unconfigured"}</p></div></div><div className="bg-background p-6 md:p-8 lg:col-span-7"><div className="flex items-center justify-between border-b border-border pb-5"><span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Selective disclosure policy</span><span className="font-mono text-[10px] uppercase tracking-widest text-accent">{disclosure?.policy || "LOADING"}</span></div><div className="grid gap-8 py-8 sm:grid-cols-2"><div><p className="font-mono text-[10px] uppercase tracking-widest text-accent">Reveal</p><ul className="mt-4 space-y-3">{(disclosure?.reveal || []).map((item) => <li key={item} className="flex gap-3 text-sm"><Check className="h-4 w-4 shrink-0 text-accent" />{item}</li>)}</ul></div><div><p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Hide</p><ul className="mt-4 space-y-3">{(disclosure?.hide || []).map((item) => <li key={item} className="flex gap-3 text-sm text-muted-foreground"><EyeOff className="h-4 w-4 shrink-0" />{item}</li>)}</ul></div></div><p className="border-t border-border pt-5 text-sm leading-relaxed text-muted-foreground">The current adapter is a development boundary. It rejects verification rather than returning a fabricated proof.</p></div></div>
}
