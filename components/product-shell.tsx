import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"

export function ProductShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main>{children}</main>
      <SiteFooter />
    </div>
  )
}

export function StatusMark({ label, value, tone = "neutral" }: { label: string; value: string; tone?: "neutral" | "accent" }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border py-3 last:border-b-0">
      <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{label}</span>
      <span className={`font-mono text-xs uppercase tracking-widest ${tone === "accent" ? "text-accent" : "text-foreground"}`}>
        {value}
      </span>
    </div>
  )
}
