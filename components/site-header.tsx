"use client"

import { useState } from "react"
import { Menu, X, Radio } from "lucide-react"

const NAV_LINKS = [
  { label: "Protocol", href: "#protocol" },
  { label: "Token", href: "#token" },
  { label: "AI Audio", href: "#ai" },
  { label: "Agents", href: "#agents" },
  { label: "Team", href: "#team" },
  { label: "Use Cases", href: "#use-cases" },
  { label: "Roadmap", href: "#roadmap" },
]

export function SiteHeader() {
  const [open, setOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-6 px-4 md:px-8">
        <a href="#top" className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center bg-accent text-accent-foreground">
            <Radio className="h-4 w-4" aria-hidden="true" />
          </span>
          <span className="text-sm font-semibold tracking-tight">
            BlockTek<span className="text-muted-foreground">Radio</span>
          </span>
        </a>

        <nav className="hidden items-center gap-8 md:flex" aria-label="Primary">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <a
            href="#top"
            className="font-mono text-xs uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground"
          >
            Read Whitepaper
          </a>
          <a
            href="#launch"
            className="bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90"
          >
            Launch App
          </a>
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex h-9 w-9 items-center justify-center border border-border md:hidden"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
        >
          {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-border bg-background md:hidden">
          <nav className="mx-auto flex max-w-7xl flex-col px-4 py-2" aria-label="Mobile">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="border-b border-border py-3 text-sm text-foreground last:border-0"
              >
                {link.label}
              </a>
            ))}
            <a
              href="#launch"
              onClick={() => setOpen(false)}
              className="mt-3 mb-2 bg-foreground px-4 py-2.5 text-center text-sm font-medium text-background"
            >
              Launch App
            </a>
          </nav>
        </div>
      )}
    </header>
  )
}
