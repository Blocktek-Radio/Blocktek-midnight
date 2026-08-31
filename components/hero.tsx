import { ArrowUpRight, Plus } from "lucide-react"
import { GridField } from "@/components/grid-field"

const STATUS_ITEMS = [
  { label: "Signal Status", value: "Nominal" },
  { label: "Network", value: "EVM / Multi-Chain" },
  { label: "Sample Rate", value: "192kHz / 32-bit" },
]

export function Hero() {
  return (
    <section id="top" className="relative overflow-hidden bg-hero text-hero-foreground">
      {/* animated web3 grid field */}
      <GridField className="pointer-events-none absolute inset-0 h-full w-full opacity-80" />
      {/* line grid overlay */}
      <div
        className="pointer-events-none absolute inset-0 text-hero-foreground/[0.04] bg-line-grid"
        aria-hidden="true"
      />
      {/* radial glow */}
      <div
        className="pointer-events-none absolute left-1/2 top-0 h-[420px] w-[820px] -translate-x-1/2 rounded-full opacity-60 blur-3xl"
        style={{
          background:
            "radial-gradient(closest-side, color-mix(in oklch, var(--hero-accent) 45%, transparent), transparent)",
        }}
        aria-hidden="true"
      />
      {/* scanline sweep */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="animate-scan h-24 w-full bg-gradient-to-b from-transparent via-hero-accent/[0.06] to-transparent" />
      </div>

      {/* status ticker */}
      <div className="relative hidden border-b border-hero-border md:block">
        <div className="mx-auto grid max-w-7xl grid-cols-3 divide-x divide-hero-border">
          {STATUS_ITEMS.map((item) => (
            <div key={item.label} className="flex items-center justify-between px-8 py-2.5">
              <span className="font-mono text-[0.7rem] uppercase tracking-widest text-hero-muted">{item.label}</span>
              <span className="font-mono text-[0.7rem] uppercase tracking-widest text-hero-foreground">
                {item.value}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="relative mx-auto max-w-7xl px-4 md:px-8">
        <div className="grid gap-10 py-20 md:grid-cols-12 md:py-28">
          <div className="md:col-span-8">
            <div className="mb-6 inline-flex items-center gap-3 rounded-full border border-hero-border bg-hero-foreground/5 px-4 py-1.5 backdrop-blur-sm">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-hero-accent" aria-hidden="true" />
              <span className="font-mono text-xs uppercase tracking-widest text-hero-muted">
                Whitepaper v1.0 — Peer-to-Peer Protocol
              </span>
            </div>

            <h1 className="text-balance text-5xl font-semibold leading-[0.95] tracking-tight md:text-7xl lg:text-8xl">
              Radio without
              <br />
              <span className="text-hero-accent text-glow">intermediaries.</span>
            </h1>

            <p className="mt-8 max-w-xl text-pretty text-lg leading-relaxed text-hero-muted">
              BlockTek Radio is a decentralized audio protocol on EVM-compatible chains. Creators mint audio as NFTs,
              distribute over IPFS, and earn directly from their audience — free from censorship or platform control.
            </p>

            <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center">
              <a
                href="#launch"
                className="group inline-flex items-center justify-center gap-2 bg-hero-accent px-6 py-3 text-sm font-medium text-hero shadow-[0_0_30px_-6px_var(--hero-accent)] transition-opacity hover:opacity-90"
              >
                Start Broadcasting
                <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </a>
              <a
                href="#protocol"
                className="inline-flex items-center justify-center gap-2 border border-hero-border bg-hero-foreground/5 px-6 py-3 text-sm font-medium text-hero-foreground backdrop-blur-sm transition-colors hover:bg-hero-foreground/10"
              >
                Explore the Protocol
                <Plus className="h-4 w-4" />
              </a>
            </div>
          </div>

          <div className="flex flex-col justify-end gap-6 md:col-span-4">
            <div className="web3-corners grid grid-cols-2 gap-px border border-hero-border bg-hero-border/60 p-px backdrop-blur-sm">
              {[
                { k: "Token Supply", v: "1B BTR" },
                { k: "Community", v: "40%" },
                { k: "Storage", v: "IPFS" },
                { k: "Governance", v: "Quadratic" },
              ].map((stat) => (
                <div key={stat.k} className="bg-hero/60 p-5">
                  <div className="font-mono text-[0.7rem] uppercase tracking-widest text-hero-muted">{stat.k}</div>
                  <div className="mt-2 text-2xl font-semibold tracking-tight text-hero-foreground">{stat.v}</div>
                </div>
              ))}
            </div>
            <p className="font-mono text-[0.7rem] uppercase tracking-widest text-hero-muted">
              // Live_Waveform_Render / Dither_Mode_On
            </p>
          </div>
        </div>
      </div>

      {/* bottom fade into light body */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-background"
        aria-hidden="true"
      />
    </section>
  )
}
