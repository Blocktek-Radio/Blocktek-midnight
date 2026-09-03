import assert from "node:assert/strict"
import test from "node:test"
import { AiProgrammingService, AiProviderManager, generateProgramme, type AiProvider } from "../src/index.js"

test("development helper is explicitly fallback-labelled", async () => {
  const programme = await generateProgramme({ theme: "Web3 Builders", mood: "Late Night", durationMinutes: 30, audience: "Developers" }, { AI_PROVIDER: "development" })
  assert.equal(programme.source, "development-fallback")
})

const context = {
  now: new Date().toISOString(), currentProgramme: null, currentTrackId: null, recentTrackIds: ["a"], recentArtists: ["Artist A"], upcomingTrackIds: [], mode: "AI_ASSISTED",
  station: { name: "BlockTek", description: "", mission: "", tone: "", programmingStyle: "", contentRules: [], repeatCooldownMinutes: 90, artistCooldownMinutes: 45 },
  request: { theme: "Test", mood: "Calm", durationMinutes: 30, audience: "Listeners" },
  availableMedia: [
    { id: "a", title: "A", artist: "Artist A", album: null, durationSeconds: 100, genre: null, mood: null, kind: "music", enabled: true, programmeEligible: true },
    { id: "b", title: "B", artist: "Artist B", album: null, durationSeconds: 100, genre: null, mood: null, kind: "music", enabled: true, programmeEligible: true },
  ],
}
function provider(raw: unknown): AiProvider { return { name: "test", model: "test-model", generate: async () => ({ raw, provider: "test", model: "test-model" }) } }
function failingProvider(name: string): AiProvider { return { name, model: "test-model", generate: async () => { throw new Error(`${name} timeout`) } } }

test("provider manager uses fallback once and reports both-provider failure", async () => {
  const fallback = provider({ programmeType: "MUSIC", mood: "Calm", reason: "fallback", items: [{ mediaId: "b", position: 1, reason: "eligible" }] })
  const recovered = await new AiProgrammingService({ manager: new AiProviderManager(failingProvider("ASI Cloud"), fallback) }).generate(context)
  assert.equal(recovered.status, "AI_GENERATED")
  assert.equal(recovered.decision.provider, "test")
  const failed = await new AiProgrammingService({ manager: new AiProviderManager(failingProvider("ASI Cloud"), failingProvider("Groq")) }).generate(context)
  assert.equal(failed.status, "AI_FALLBACK")
  assert.match(failed.decision.rejectionReason || "", /primary failed/)
})

test("malformed and policy-invalid provider output falls back", async () => {
  const malformed = await new AiProgrammingService({ provider: provider({ nope: true }) }).generate(context)
  assert.equal(malformed.status, "AI_FALLBACK")
  const invalid = await new AiProgrammingService({ provider: provider({ programmeType: "MUSIC", mood: "Calm", reason: "bad", items: [{ mediaId: "a", position: 1, reason: "cooldown" }] }) }).generate(context)
  assert.equal(invalid.status, "AI_FALLBACK")
  assert.match(invalid.decision.explanation, /Fallback used/)
})

test("valid output rejects cooldown and duplicate tracks", async () => {
  const result = await new AiProgrammingService({ provider: provider({ programmeType: "MUSIC", mood: "Calm", reason: "A bounded sequence", items: [{ mediaId: "a", position: 1, reason: "recent" }, { mediaId: "b", position: 2, reason: "eligible" }, { mediaId: "b", position: 3, reason: "duplicate" }] }) }).generate(context)
  assert.equal(result.status, "AI_GENERATED")
  assert.deepEqual(result.programme.tracks.map((track) => track.id), ["b"])
})
