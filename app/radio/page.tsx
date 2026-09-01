import { RadioConsole } from "@/components/radio-console"
import { ProductShell } from "@/components/product-shell"

export default function RadioPage() {
  return <ProductShell><section className="border-b border-border"><div className="mx-auto max-w-7xl px-4 py-20 md:px-8 md:py-28"><div className="mb-4 flex items-center gap-3"><span className="font-mono text-xs uppercase tracking-widest text-accent">Radio / Main</span><span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">API-backed player</span></div><h1 className="max-w-3xl text-balance text-5xl font-semibold leading-[0.98] tracking-tight md:text-7xl">Listen to the network.</h1><p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">A native browser player backed by versioned station, queue, programme, and now-playing APIs.</p><div className="mt-12"><RadioConsole /></div></div></section></ProductShell>
}
