import type { DisclosureResult, MidnightStatus } from "@blocktek/types"

export interface MidnightAdapter {
  status(): MidnightStatus
  verifyEligibility(_proof: unknown): Promise<never>
}

export class UnconfiguredMidnightAdapter implements MidnightAdapter {
  status(): MidnightStatus {
    return {
      configured: false,
      status: "NOT_CONFIGURED",
      network: process.env.MIDNIGHT_NETWORK || "unconfigured",
      capabilities: ["credential verification", "selective disclosure", "eligibility proofs"],
    }
  }

  async verifyEligibility(_proof: unknown): Promise<never> {
    throw new Error("Midnight integration is not configured; no proof was verified")
  }
}

export function eligibilityDisclosure(): DisclosureResult {
  return {
    reveal: ["Verified contributor", "Contributor satisfies eligibility requirement"],
    hide: ["Name", "Email", "Location", "Wallet address", "Organisation"],
    policy: "eligibility-only",
  }
}
