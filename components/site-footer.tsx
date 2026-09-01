import { ArrowUpRight, Radio } from "lucide-react"
import Link from "next/link"

const FOOTER_COLS = [
  {
    heading: "Protocol",
    links: ["Overview", "Smart Contracts", "IPFS Storage", "Multi-Chain"],
  },
  {
    heading: "Network",
    links: ["BTR Token", "Governance", "Staking", "Treasury"],
  },
  {
    heading: "Resources",
    links: ["Whitepaper", "Documentation", "BTRIPs", "GitHub"],
  },
]

export function SiteFooter() {
  return (
    <footer className="bg-foreground text-background">
      {/* CTA */}
      <div id="launch" className="border-b border-background/15">
        <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-20 md:flex-row md:items-end md:justify-between md:px-8 md:py-28">
          <h2 className="max-w-2xl text-balance text-4xl font-semibold leading-[1.02] tracking-tight md:text-6xl">
            Tune in to a network no one can switch off.
          </h2>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/radio"
              className="group inline-flex items-center justify-center gap-2 bg-accent px-6 py-3 text-sm font-medium text-accent-foreground transition-opacity hover:opacity-90"
            >
              Launch App
              <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link>
            <Link
              href="/#protocol"
              className="inline-flex items-center justify-center gap-2 border border-background/25 px-6 py-3 text-sm font-medium text-background transition-colors hover:bg-background/10"
            >
              Read Whitepaper
            </Link>
          </div>
        </div>
      </div>

      {/* Links */}
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 md:grid-cols-12 md:px-8">
        <div className="md:col-span-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center bg-accent text-accent-foreground">
              <Radio className="h-4 w-4" aria-hidden="true" />
            </span>
            <span className="text-sm font-semibold tracking-tight">BlockTekRadio</span>
          </div>
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-background/60">
            A peer-to-peer decentralized radio protocol. Released under the MIT License by the BlockTek Radio Foundation.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 md:col-span-9">
          {FOOTER_COLS.map((col) => (
            <div key={col.heading}>
              <h3 className="font-mono text-xs uppercase tracking-widest text-background/50">{col.heading}</h3>
              <ul className="mt-4 space-y-3">
                {col.links.map((link) => (
                  <li key={link}>
                    <Link href={link === "Whitepaper" ? "/#protocol" : link === "BTR Token" ? "/#token" : "/#top"} className="text-sm text-background/80 transition-colors hover:text-background">
                      {link}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-background/15">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-6 md:flex-row md:items-center md:justify-between md:px-8">
          <span className="font-mono text-xs uppercase tracking-widest text-background/50">
            BlockTek Radio Protocol — Whitepaper v1.0
          </span>
          <span className="font-mono text-xs uppercase tracking-widest text-background/50">
            © 2025 BlockTek Radio Foundation
          </span>
        </div>
      </div>
    </footer>
  )
}
