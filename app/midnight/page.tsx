import { MidnightDashboard } from "@/components/midnight-dashboard"
import { ProductShell } from "@/components/product-shell"

export default function MidnightPage() {
  return <ProductShell><section className="border-b border-border"><div className="mx-auto max-w-7xl px-4 py-20 md:px-8 md:py-28"><div className="mb-4 flex items-center gap-3"><span className="font-mono text-xs uppercase tracking-widest text-accent">Midnight</span><span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Privacy status</span></div><h1 className="max-w-3xl text-balance text-5xl font-semibold leading-[0.98] tracking-tight md:text-7xl">Trust without unnecessary exposure.</h1><p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">This dashboard reports verified adapter state and aggregate lifecycle counts. It never invents network activity.</p><div className="mt-12"><MidnightDashboard /></div></div></section></ProductShell>
}
