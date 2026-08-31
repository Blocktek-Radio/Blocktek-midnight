const DISTRIBUTION = [
  { label: "Community Rewards", pct: 40 },
  { label: "Ecosystem Development", pct: 20 },
  { label: "Platform Growth", pct: 20 },
  { label: "Founding Team (4yr vest)", pct: 10 },
  { label: "Initial Liquidity", pct: 10 },
]

const UTILITIES = [
  { k: "Earn", v: "Rewarded for creation, listening & participation" },
  { k: "Stake", v: "Lock BTR to earn additional yield" },
  { k: "Govern", v: "Vote on proposals with quadratic weighting" },
  { k: "Tip & Unlock", v: "Support creators and access premium content" },
]

export function TokenSection() {
  return (
    <section id="token" className="border-b border-border bg-secondary">
      <div className="mx-auto max-w-7xl px-4 py-20 md:px-8 md:py-28">
        <div className="mb-14 flex items-center gap-3">
          <span className="font-mono text-xs uppercase tracking-widest text-accent">03 —</span>
          <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
            Token Incentives &amp; Governance
          </span>
        </div>

        <div className="grid gap-14 md:grid-cols-2 md:gap-20">
          <div>
            <h2 className="text-balance text-4xl font-semibold leading-[1.05] tracking-tight md:text-5xl">
              The BTR token aligns creators, listeners, and the network.
            </h2>
            <p className="mt-6 max-w-md text-pretty leading-relaxed text-muted-foreground">
              A fixed supply of 1 billion tokens with a decreasing emission schedule. Governance runs through a DAO where
              token holders propose and vote — quadratic voting keeps influence accessible while respecting larger
              stakeholders.
            </p>

            <dl className="mt-10 grid grid-cols-1 gap-px border border-border bg-border sm:grid-cols-2">
              {UTILITIES.map((u) => (
                <div key={u.k} className="bg-background p-5">
                  <dt className="text-sm font-semibold tracking-tight">{u.k}</dt>
                  <dd className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{u.v}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="flex flex-col">
            <div className="flex items-baseline justify-between border-b border-border pb-4">
              <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Token Distribution</span>
              <span className="text-2xl font-semibold tracking-tight">1,000,000,000 BTR</span>
            </div>

            {/* stacked bar */}
            <div className="mt-6 flex h-3 w-full overflow-hidden border border-border" aria-hidden="true">
              {DISTRIBUTION.map((d, i) => (
                <div
                  key={d.label}
                  className={i % 2 === 0 ? "bg-accent" : "bg-foreground"}
                  style={{ width: `${d.pct}%`, opacity: 1 - i * 0.12 }}
                />
              ))}
            </div>

            <ul className="mt-8 divide-y divide-border border-y border-border">
              {DISTRIBUTION.map((d, i) => (
                <li key={d.label} className="flex items-center justify-between py-4">
                  <div className="flex items-center gap-3">
                    <span
                      className={`h-2.5 w-2.5 ${i % 2 === 0 ? "bg-accent" : "bg-foreground"}`}
                      style={{ opacity: 1 - i * 0.12 }}
                      aria-hidden="true"
                    />
                    <span className="text-sm text-foreground">{d.label}</span>
                  </div>
                  <span className="font-mono text-sm tabular-nums text-muted-foreground">{d.pct}%</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}
