import Image from "next/image"

type TeamMember = {
  name: string
  role: string
  image: string
}

const TEAM: TeamMember[] = [
  {
    name: "Stanley",
    role: "Co-Founder & Head of Partnership & Business Development",
    image: "/team/stan.jpg",
  },
  {
    name: "Frank Hazard",
    role: "Co-Founder & Blockchain & AI Developer & Researcher",
    image: "/team/FrankHazard.jpeg",
  },
  {
    name: "Bratipah",
    role: "Co-Founder & Blockchain Protocol Engineer",
    image: "/team/Bratipah.jpg",
  },
]

export function TeamSection() {
  return (
    <section id="team" className="border-b border-border">
      <div className="mx-auto max-w-7xl px-4 py-20 md:px-8 md:py-28">
        <div className="mb-4 flex items-center gap-3">
          <span className="font-mono text-xs uppercase tracking-widest text-accent">07 —</span>
          <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">The Team</span>
        </div>
        <h2 className="max-w-2xl text-balance text-4xl font-semibold leading-[1.05] tracking-tight md:text-6xl">
          BlockTekRadio Team.
        </h2>

        <div className="mt-16 grid gap-px border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
          {TEAM.map((member) => (
            <article key={member.name} className="flex flex-col bg-background p-6 md:p-8">
              <div className="relative aspect-square w-full overflow-hidden border border-border bg-secondary">
                <Image
                  src={member.image || "/placeholder.svg"}
                  alt={`Portrait of ${member.name}`}
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                />
              </div>
              <h3 className="mt-6 text-xl font-semibold tracking-tight">{member.name}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{member.role}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
