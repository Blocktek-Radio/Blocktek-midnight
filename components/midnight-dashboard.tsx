"use client"

import { useEffect, useState } from "react"
import { apiFetch } from "@/lib/api"

type Status = { status: string; network: string; networkId: string | null; connected: boolean; walletConfigured: boolean; contractConfigured: boolean; proofConfigured: boolean; contractAddress: string | null; detail: string; privacy: { pending: number; verified: number; approved: number } }

export function MidnightDashboard() {
  const [status, setStatus] = useState<Status | null>(null)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => { apiFetch<{ data: Status }>("/api/v1/midnight/status").then((result) => setStatus(result.data)).catch((reason) => setError(reason instanceof Error ? reason.message : "Status unavailable")) }, [])
  if (error) return <p className="border border-border p-5 text-sm text-muted-foreground">{error}</p>
  if (!status) return <p className="border border-border p-5 font-mono text-xs uppercase tracking-widest text-muted-foreground">Loading status...</p>
  const values = [["Network", status.network], ["Network ID", status.networkId || "NOT CONFIGURED"], ["Connection", status.connected ? "CONNECTED" : status.status], ["Wallet", status.walletConfigured ? "CONFIGURED" : "NOT CONFIGURED"], ["Compact contract", status.contractConfigured ? "CONFIGURED" : "NOT CONFIGURED"], ["Proof artifacts", status.proofConfigured ? "CONFIGURED" : "NOT CONFIGURED"], ["Pending contributions", String(status.privacy.pending)], ["Verified contributions", String(status.privacy.verified)], ["Programmable contributions", String(status.privacy.approved)]]
  return <div className="border border-border"><div className="grid gap-px bg-border sm:grid-cols-3">{values.map(([label, value]) => <div key={label} className="bg-background p-5"><p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p><p className="mt-3 text-lg font-semibold">{value}</p></div>)}</div><p className="border-t border-border p-5 text-sm leading-relaxed text-muted-foreground">{status.detail}. No transaction hash or contract address is shown unless it has been verified by a real Midnight integration.</p></div>
}
