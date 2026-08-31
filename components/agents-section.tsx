"use client"

import { useState } from "react"
import Image from "next/image"
import { Mic, Radio, CalendarClock, Headphones, LineChart, MessagesSquare, type LucideIcon } from "lucide-react"

type Agent = {
  icon: LucideIcon
  tag: string
  title: string
  body: string
  replaces: string
  status: "LIVE" | "STANDBY"
  model: string
  latency: string
  command: string
}

const AGENTS: Agent[] = [
  {
    icon: Mic,
    tag: "AGENT.VOICE",
    title: "Voice-Over Agents",
    body: "Generate studio-quality narration, ad reads, and station idents from text in any supported language — with cloned or synthetic voices creators fully own on-chain.",
    replaces: "Session voice talent & studio booth time",
    status: "LIVE",
    model: "btr-voice-2",
    latency: "310ms / min audio",
    command: "btr agent run voice --script ep014.md --voice studio-01",
  },
  {
    icon: Radio,
    tag: "AGENT.HOST",
    title: "Autonomous Hosts",
    body: "AI DJs that assemble playlists, read headlines, and hold live segments 24/7, filling dead air between human broadcasts without a central server.",
    replaces: "Overnight on-air staffing",
    status: "LIVE",
    model: "btr-host-1",
    latency: "live · 1.2s turn",
    command: "btr agent run host --station kx-fm --mode 24-7",
  },
  {
    icon: CalendarClock,
    tag: "AGENT.PROGRAM",
    title: "Programming & Scheduling",
    body: "Agents curate and time the broadcast grid, sequence shows, and trigger emergency bulletins autonomously based on on-chain governance rules.",
    replaces: "Manual program directors",
    status: "LIVE",
    model: "btr-sched-1",
    latency: "grid rebuild 4s",
    command: "btr agent run program --grid weekly --rules dao",
  },
  {
    icon: Headphones,
    tag: "AGENT.PRODUCE",
    title: "Post-Production",
    body: "Automated editing, chapter markers, dynamic ad insertion, and multi-format mastering — turning a raw recording into a publish-ready broadcast.",
    replaces: "Manual editing & mastering passes",
    status: "LIVE",
    model: "btr-master-2",
    latency: "0.4x realtime",
    command: "btr agent run produce --in raw.wav --master broadcast",
  },
  {
    icon: MessagesSquare,
    tag: "AGENT.ENGAGE",
    title: "Listener Engagement",
    body: "Conversational agents field call-ins, answer questions on air, and summarize community sentiment while preserving listener privacy.",
    replaces: "Call screeners & community managers",
    status: "STANDBY",
    model: "btr-engage-1",
    latency: "820ms turn",
    command: "btr agent run engage --queue callins --privacy zk",
  },
  {
    icon: LineChart,
    tag: "AGENT.INSIGHT",
    title: "Insight & Moderation",
    body: "Agents surface trends, flag policy violations for community review, and draft governance proposals from anonymized engagement signals.",
    replaces: "Centralized analytics & moderation teams",
    status: "STANDBY",
    model: "btr-insight-1",
    latency: "batch · 5m",
    command: "btr agent run insight --window 24h --propose dao",
  },
]

export function AgentsSection() {
  const [active, setActive] = useState(0)
  const agent = AGENTS[active]
  const ActiveIcon = agent.icon

  return (
    <section id="agents" className="border-b border-border bg-secondary">
      <div className="mx-auto max-w-7xl px-4 py-20 md:px-8 md:py-28">
        <div className="grid gap-10 md:grid-cols-12 md:items-end">
          <div className="md:col-span-7">
            <div className="mb-4 flex items-center gap-3">
              <span className="font-mono text-xs uppercase tracking-widest text-accent">06 —</span>
              <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
                Autonomous AI Agents
              </span>
            </div>
            <h2 className="text-balance text-4xl font-semibold leading-[1.05] tracking-tight md:text-6xl">
              Agents that keep the airwaves alive.
            </h2>
            <p className="mt-6 max-w-xl text-pretty leading-relaxed text-muted-foreground">
              Deploy a fleet of AI agents to run stations end-to-end — from voice-overs to scheduling, production, and
              moderation. Every agent runs on decentralized compute, is governed by BTR holders, and never hands your
              audio or audience data to a central platform.
            </p>
          </div>
          <div className="relative aspect-square w-full overflow-hidden border border-border bg-background md:col-span-5">
            <Image
              src="/fig-agent.png"
              alt="Isometric blue particle render of an AI assistant node connected to a microphone radiating sound waves"
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 40vw"
            />
          </div>
        </div>

        {/* Interactive terminal roster */}
        <div className="mt-16 overflow-hidden border border-border bg-background">
          <div className="flex items-center justify-between border-b border-border bg-secondary px-4 py-3">
            <div className="flex items-center gap-3">
              <span className="flex gap-1.5" aria-hidden="true">
                <span className="h-2.5 w-2.5 rounded-full bg-border" />
                <span className="h-2.5 w-2.5 rounded-full bg-border" />
                <span className="h-2.5 w-2.5 rounded-full bg-accent" />
              </span>
              <span className="font-mono text-xs tracking-widest text-muted-foreground">btr://agents/registry</span>
            </div>
            <span className="font-mono text-xs tracking-widest text-muted-foreground">
              {AGENTS.length} AGENTS · {AGENTS.filter((a) => a.status === "LIVE").length} LIVE
            </span>
          </div>

          <div className="grid md:grid-cols-12">
            {/* Roster list */}
            <ul className="border-b border-border md:col-span-5 md:border-b-0 md:border-r" role="tablist" aria-label="AI agents">
              {AGENTS.map((a, i) => {
                const Icon = a.icon
                const selected = i === active
                return (
                  <li key={a.tag}>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={selected}
                      onClick={() => setActive(i)}
                      className={`flex w-full items-center gap-4 border-b border-border px-4 py-4 text-left transition-colors last:border-b-0 md:px-6 ${
                        selected ? "bg-accent text-accent-foreground" : "hover:bg-secondary"
                      }`}
                    >
                      <Icon
                        className={`h-5 w-5 shrink-0 ${selected ? "text-accent-foreground" : "text-accent"}`}
                        aria-hidden="true"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold tracking-tight">{a.title}</span>
                        <span
                          className={`block font-mono text-xs tracking-widest ${
                            selected ? "text-accent-foreground/80" : "text-muted-foreground"
                          }`}
                        >
                          {a.tag}
                        </span>
                      </span>
                      <span
                        className={`flex items-center gap-1.5 font-mono text-[10px] tracking-widest ${
                          selected ? "text-accent-foreground/90" : "text-muted-foreground"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            a.status === "LIVE"
                              ? selected
                                ? "bg-accent-foreground"
                                : "bg-accent"
                              : "bg-muted-foreground"
                          }`}
                          aria-hidden="true"
                        />
                        {a.status}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>

            {/* Spec panel */}
            <div className="flex flex-col p-6 md:col-span-7 md:p-8" role="tabpanel">
              <div className="flex items-start justify-between gap-4 border-b border-border pb-5">
                <div className="flex items-center gap-3">
                  <ActiveIcon className="h-6 w-6 text-accent" aria-hidden="true" />
                  <div>
                    <h3 className="text-xl font-semibold tracking-tight">{agent.title}</h3>
                    <span className="font-mono text-xs tracking-widest text-muted-foreground">{agent.tag}</span>
                  </div>
                </div>
                <span className="flex shrink-0 items-center gap-1.5 border border-border px-2.5 py-1 font-mono text-[10px] tracking-widest text-muted-foreground">
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${agent.status === "LIVE" ? "bg-accent" : "bg-muted-foreground"}`}
                    aria-hidden="true"
                  />
                  {agent.status}
                </span>
              </div>

              <p className="mt-5 text-pretty leading-relaxed text-muted-foreground">{agent.body}</p>

              <dl className="mt-6 grid grid-cols-2 gap-px border border-border bg-border">
                <div className="bg-background p-4">
                  <dt className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Model</dt>
                  <dd className="mt-1 font-mono text-sm">{agent.model}</dd>
                </div>
                <div className="bg-background p-4">
                  <dt className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Latency</dt>
                  <dd className="mt-1 font-mono text-sm">{agent.latency}</dd>
                </div>
                <div className="col-span-2 bg-background p-4">
                  <dt className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Replaces</dt>
                  <dd className="mt-1 text-sm text-foreground">{agent.replaces}</dd>
                </div>
              </dl>

              <div className="mt-4 flex items-center gap-3 overflow-x-auto border border-border bg-secondary px-4 py-3">
                <span className="select-none font-mono text-sm text-accent" aria-hidden="true">
                  $
                </span>
                <code className="whitespace-nowrap font-mono text-xs text-foreground md:text-sm">{agent.command}</code>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
