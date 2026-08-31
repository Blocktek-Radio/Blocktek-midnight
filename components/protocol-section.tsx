import Image from "next/image"

const FIGURES = [
  {
    fig: "FIG 01",
    sys: "SYS.PUBLISH",
    title: "Creators mint and broadcast.",
    body: "Audio is processed through the AI layer, stored on IPFS by content hash, and minted as an ERC-721 with enforced royalties — immutable proof of authorship.",
    img: "/fig-broadcast.png",
    alt: "Isometric blue particle render of a broadcasting radio tower emitting signal waves",
  },
  {
    fig: "FIG 02",
    sys: "SYS.DISTRIBUTE",
    title: "Peers replicate and relay.",
    body: "Distributed consensus timestamps every publication. Participants join or exit freely while voluntary replication and WebRTC streaming keep content available.",
    img: "/fig-network.png",
    alt: "Isometric blue particle render of a distributed peer-to-peer network of connected nodes",
  },
  {
    fig: "FIG 03",
    sys: "SYS.EARN",
    title: "Listeners engage and reward.",
    body: "Engagement metrics drive BTR rewards, tips flow directly to creators, and secondary sales trigger automatic royalties enforced on-chain by smart contracts.",
    img: "/fig-waveform.png",
    alt: "Isometric blue particle render of a rising audio waveform of equalizer bars",
  },
]

export function ProtocolSection() {
  return (
    <section id="protocol" className="border-b border-border">
      <div className="mx-auto max-w-7xl px-4 py-20 md:px-8 md:py-28">
        <div className="relative">
          <span className="absolute -left-1 -top-1 h-3 w-3 border-l border-t border-foreground" aria-hidden="true" />
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <h2 className="max-w-2xl text-balance text-4xl font-semibold leading-[1.05] tracking-tight md:text-6xl">
              How the protocol
              <br />
              moves sound.
            </h2>
            <div className="font-mono text-[0.7rem] uppercase leading-relaxed tracking-widest text-muted-foreground md:text-right">
              System Architecture
              <br />
              Render_Engine: IPFS + EVM
              <br />
              Rev. 1.0.0
            </div>
          </div>
        </div>

        <div className="mt-16 grid gap-px border border-border bg-border md:grid-cols-3">
          {FIGURES.map((f) => (
            <article key={f.fig} className="flex flex-col bg-background p-6 md:p-8">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <span className="font-mono text-xs font-medium tracking-widest text-foreground">{f.fig}</span>
                <span className="font-mono text-xs tracking-widest text-muted-foreground">{f.sys}</span>
              </div>
              <div className="relative my-6 aspect-square w-full overflow-hidden border border-border bg-secondary">
                <Image src={f.img || "/placeholder.svg"} alt={f.alt} fill className="object-cover" sizes="(max-width: 768px) 100vw, 33vw" />
              </div>
              <h3 className="text-xl font-semibold tracking-tight">{f.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
