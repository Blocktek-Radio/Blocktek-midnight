import assert from "node:assert/strict"
import test from "node:test"
import { generateProgramme } from "../src/index.js"

test("development AI output is schema-shaped and explicitly labelled", async () => {
  const programme = await generateProgramme(
    { theme: "Web3 Builders", mood: "Late Night", durationMinutes: 30, audience: "Developers" },
    { AI_PROVIDER: "development" },
  )
  assert.equal(programme.source, "development-fallback")
  assert.equal(programme.selectionMetadata.overallSelectionScore, 0)
})
