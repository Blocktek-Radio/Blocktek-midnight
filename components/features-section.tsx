import { AudioWaveformIcon as Waveform, Languages, Compass, Sparkles, Fingerprint, ShieldCheck, Users, LockKeyhole } from "lucide-react"

const AI_FEATURES = [
  {
    icon: Waveform,
    title: "Intelligent Processing",
    body: "Real-time noise cancellation, automatic gain control, speech enhancement, and adaptive bitrate — running locally on device.",
  },
  {
    icon: Languages,
    title: "Transcription & Translation",
    body: "Automatic speech recognition and multi-language translation make every broadcast accessible and searchable worldwide.",
  },
  {
    icon: Compass,
    title: "Private Discovery",
    body: "Personalized recommendations from aggregated, anonymized data. Opt out anytime with zero loss of functionality.",
  },
  {
    icon: Sparkles,
    title: "Adaptive Evolution",
    body: "Federated learning improves models without centralizing user data. Governance approves every model update.",
  },
]

const SECURITY_FEATURES = [
  {
    icon: Fingerprint,
    title: "Cryptographic Identity",
    body: "Wallet-based identity with zero-knowledge proofs — no accounts, no personal data.",
  },
  {
    icon: ShieldCheck,
    title: "Content Integrity",
    body: "On-chain hashing and timestamping create immutable proof of ownership and authorship.",
  },
  {
    icon: Users,
    title: "Community Moderation",
    body: "Token-weighted curation and reputation replace centralized gatekeepers.",
  },
  {
    icon: LockKeyhole,
    title: "Private Analytics",
    body: "Differential privacy and homomorphic encryption keep insights useful and identities safe.",
  },
]

export function FeaturesSection() {
  return (
    <section id="ai" className="border-b border-border">
      <div className="mx-auto max-w-7xl px-4 py-20 md:px-8 md:py-28">
        {/* AI block */}
        <div className="grid gap-10 md:grid-cols-12">
          <div className="md:col-span-4">
            <div className="mb-4 flex items-center gap-3">
              <span className="font-mono text-xs uppercase tracking-widest text-accent">04 —</span>
              <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">AI Audio Infrastructure</span>
            </div>
            <h2 className="text-balance text-4xl font-semibold leading-[1.05] tracking-tight md:text-5xl">
              A studio-grade layer, on the edge.
            </h2>
            <p className="mt-6 max-w-sm text-pretty leading-relaxed text-muted-foreground">
              Every broadcast passes through a privacy-preserving AI stack that enhances quality and accessibility
              without ever centralizing your audio.
            </p>
          </div>

          <div className="grid gap-px border border-border bg-border sm:grid-cols-2 md:col-span-8">
            {AI_FEATURES.map((f) => (
              <div key={f.title} className="bg-background p-6">
                <f.icon className="h-5 w-5 text-accent" aria-hidden="true" />
                <h3 className="mt-4 text-base font-semibold tracking-tight">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Security block */}
        <div id="security" className="mt-24 grid gap-10 md:grid-cols-12">
          <div className="md:order-2 md:col-span-4">
            <div className="mb-4 flex items-center gap-3">
              <span className="font-mono text-xs uppercase tracking-widest text-accent">05 —</span>
              <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Privacy, Security &amp; Identity</span>
            </div>
            <h2 className="text-balance text-4xl font-semibold leading-[1.05] tracking-tight md:text-5xl">
              Sovereignty by default.
            </h2>
            <p className="mt-6 max-w-sm text-pretty leading-relaxed text-muted-foreground">
              Identity, ownership, and moderation are enforced by cryptography and community — not corporate policy.
            </p>
          </div>

          <div className="grid gap-px border border-border bg-border sm:grid-cols-2 md:order-1 md:col-span-8">
            {SECURITY_FEATURES.map((f) => (
              <div key={f.title} className="bg-background p-6">
                <f.icon className="h-5 w-5 text-accent" aria-hidden="true" />
                <h3 className="mt-4 text-base font-semibold tracking-tight">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
