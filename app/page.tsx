import { SiteHeader } from "@/components/site-header"
import { Hero } from "@/components/hero"
import { ProtocolSection } from "@/components/protocol-section"
import { TokenSection } from "@/components/token-section"
import { FeaturesSection } from "@/components/features-section"
import { AgentsSection } from "@/components/agents-section"
import { TeamSection } from "@/components/team-section"
import { UseCasesSection } from "@/components/use-cases-section"
import { RoadmapSection } from "@/components/roadmap-section"
import { SiteFooter } from "@/components/site-footer"

export default function Page() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main>
        <Hero />
        <ProtocolSection />
        <TokenSection />
        <FeaturesSection />
        <AgentsSection />
        <TeamSection />
        <UseCasesSection />
        <RoadmapSection />
      </main>
      <SiteFooter />
    </div>
  )
}
