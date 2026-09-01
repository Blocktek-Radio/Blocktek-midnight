import { generatedProgrammeSchema, type GeneratedProgramme, type ProgrammeRequest } from "@blocktek/types"
import { takeUntilDuration } from "@blocktek/radio-core"

type Provider = {
  generateProgramme(request: ProgrammeRequest): Promise<GeneratedProgramme>
}

const catalogue = [
  { id: "track-001", title: "Night Signal", artist: "BlockTek Radio Library", durationSeconds: 214 },
  { id: "track-002", title: "Proof of Sound", artist: "BlockTek Radio Library", durationSeconds: 246 },
  { id: "track-003", title: "Open Frequency", artist: "BlockTek Radio Library", durationSeconds: 188 },
  { id: "track-004", title: "Relay State", artist: "BlockTek Radio Library", durationSeconds: 271 },
]

export class DevelopmentAiProvider implements Provider {
  async generateProgramme(request: ProgrammeRequest): Promise<GeneratedProgramme> {
    const tracks = takeUntilDuration(catalogue, request.durationMinutes)
    return generatedProgrammeSchema.parse({
      ...request,
      title: `${request.theme} / ${request.mood}`,
      tracks,
      introduction: `A development programme for ${request.audience}, shaped around ${request.theme}.`,
      selectionMetadata: {
        themeRelevance: 0,
        listenerPreferenceMatch: 0,
        freshness: 0,
        overallSelectionScore: 0,
      },
      source: "development-fallback",
    })
  }
}

export class OpenAiCompatibleProvider implements Provider {
  constructor(private readonly url: string, private readonly apiKey: string) {}

  async generateProgramme(request: ProgrammeRequest): Promise<GeneratedProgramme> {
    const response = await fetch(this.url, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${this.apiKey}` },
      body: JSON.stringify({ task: "generate-programme", request }),
    })
    if (!response.ok) throw new Error(`AI provider returned HTTP ${response.status}`)
    return generatedProgrammeSchema.parse(await response.json())
  }
}

export function createAiProvider(env: NodeJS.ProcessEnv): Provider {
  if (env.AI_PROVIDER === "openai-compatible" && env.AI_PROVIDER_URL && env.AI_PROVIDER_API_KEY) {
    return new OpenAiCompatibleProvider(env.AI_PROVIDER_URL, env.AI_PROVIDER_API_KEY)
  }
  return new DevelopmentAiProvider()
}

export async function generateProgramme(request: ProgrammeRequest, env: NodeJS.ProcessEnv): Promise<GeneratedProgramme> {
  const provider = createAiProvider(env)
  return provider.generateProgramme(request)
}
