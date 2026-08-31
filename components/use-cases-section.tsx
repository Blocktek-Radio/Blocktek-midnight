const USE_CASES = [
  {
    id: "01",
    title: "Global Public Radio",
    body: "Independent journalists and citizen reporters broadcast without fear of deplatforming — including emergency dissemination during crises.",
  },
  {
    id: "02",
    title: "Educational Distribution",
    body: "Token-gated courses and lectures with direct monetization. Students earn tokens for engagement and completion.",
  },
  {
    id: "03",
    title: "Music & Podcasting",
    body: "Mint audio as NFTs for direct fan support, collecting, and trading — with royalties that follow every secondary sale.",
  },
  {
    id: "04",
    title: "Decentralized Journalism",
    body: "Publish sensitive reporting with cryptographic proof and timestamp verification while protecting sources.",
  },
  {
    id: "05",
    title: "Metaverse & Live Events",
    body: "Low-latency spatial audio for virtual concerts and conferences, monetized through token-gated access and NFT tickets.",
  },
]

export function UseCasesSection() {
  return (
    <section id="use-cases" className="border-b border-border bg-secondary">
      <div className="mx-auto max-w-7xl px-4 py-20 md:px-8 md:py-28">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <div className="mb-4 flex items-center gap-3">
              <span className="font-mono text-xs uppercase tracking-widest text-accent">08 —</span>
              <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Use Cases</span>
            </div>
            <h2 className="max-w-xl text-balance text-4xl font-semibold leading-[1.05] tracking-tight md:text-6xl">
              One protocol, countless frequencies.
            </h2>
          </div>
        </div>

        <div className="mt-14 border-t border-border">
          {USE_CASES.map((u) => (
            <div
              key={u.id}
              className="group grid grid-cols-1 gap-4 border-b border-border py-8 transition-colors hover:bg-background md:grid-cols-12 md:items-center md:gap-8 md:px-4"
            >
              <span className="font-mono text-sm text-accent md:col-span-1">{u.id}</span>
              <h3 className="text-2xl font-semibold tracking-tight md:col-span-4">{u.title}</h3>
              <p className="max-w-xl leading-relaxed text-muted-foreground md:col-span-7">{u.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
