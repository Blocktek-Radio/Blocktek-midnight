const PHASES = [
  {
    tag: "Phase 01",
    title: "Layer 2 & Scalability",
    body: "Integrate L2 rollups and zero-knowledge solutions to cut transaction costs, plus cross-chain interoperability across ecosystems.",
  },
  {
    tag: "Phase 02",
    title: "Advanced Audio",
    body: "Spatial audio, holographic sound reproduction, and neural audio synthesis — delivered without breaking backward compatibility.",
  },
  {
    tag: "Phase 03",
    title: "BTRIP Governance",
    body: "BlockTekRadio Improvement Proposals, modeled on Ethereum's EIP process, keep protocol evolution decentralized and transparent.",
  },
  {
    tag: "Phase 04",
    title: "Ecosystem & Sustainability",
    body: "Third-party apps build on shared standards while transaction fees and token economics fund a self-sustaining treasury.",
  },
]

export function RoadmapSection() {
  return (
    <section id="roadmap" className="border-b border-border">
      <div className="mx-auto max-w-7xl px-4 py-20 md:px-8 md:py-28">
        <div className="mb-4 flex items-center gap-3">
          <span className="font-mono text-xs uppercase tracking-widest text-accent">09 —</span>
          <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Future Evolution</span>
        </div>
        <h2 className="max-w-2xl text-balance text-4xl font-semibold leading-[1.05] tracking-tight md:text-6xl">
          Built to stay relevant for decades.
        </h2>

        <ol className="mt-16 grid gap-px border border-border bg-border md:grid-cols-2 lg:grid-cols-4">
          {PHASES.map((p) => (
            <li key={p.tag} className="flex flex-col bg-background p-6 md:p-8">
              <span className="font-mono text-xs uppercase tracking-widest text-accent">{p.tag}</span>
              <h3 className="mt-6 text-xl font-semibold tracking-tight">{p.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{p.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
