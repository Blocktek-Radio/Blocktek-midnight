import { createHash } from "node:crypto"
import type { ContributionContentType, DisclosureResult, MidnightStatus, PrivacyVerificationStatus } from "@blocktek/types"

export type MidnightConfig = {
  network: string
  networkId: string | null
  nodeUrl: string | null
  indexerUrl: string | null
  proofServerUrl: string | null
  zkConfigUrl: string | null
  contractAddress: string | null
  walletConfigured: boolean
}

export type EligibilityProofRequest = {
  contributionId: string
  claimType: string
  contentCommitment: string
  proofReference: string
  disclosedAttributes: string[]
  expiresAt: string | null
}

export type EligibilityVerification = {
  status: PrivacyVerificationStatus
  verificationReference: string
  expiresAt: string | null
  detail: string
}

export interface MidnightAdapter {
  status(): MidnightStatus
  verifyEligibility(request: EligibilityProofRequest): Promise<EligibilityVerification>
}

function statusFor(config: MidnightConfig, detail: string): MidnightStatus {
  const configured = Boolean(config.networkId && config.nodeUrl && config.indexerUrl && config.proofServerUrl && config.zkConfigUrl && config.contractAddress)
  return {
    configured,
    status: configured ? "CONFIGURED" : "NOT_CONFIGURED",
    network: config.network,
    networkId: config.networkId,
    walletConfigured: config.walletConfigured,
    contractConfigured: Boolean(config.contractAddress),
    proofConfigured: Boolean(config.proofServerUrl && config.zkConfigUrl),
    connected: false,
    contractAddress: config.contractAddress,
    capabilities: ["Compact circuits", "eligibility proofs", "selective disclosure", "content commitments"],
    detail,
  }
}

export class UnconfiguredMidnightAdapter implements MidnightAdapter {
  constructor(private readonly config: MidnightConfig = midnightConfig()) {}

  status(): MidnightStatus {
    return statusFor(this.config, "Midnight SDK, proof artifacts, wallet, contract, or network configuration is incomplete")
  }

  async verifyEligibility(_request: EligibilityProofRequest): Promise<never> {
    throw new Error("Midnight integration is not configured; no proof was verified")
  }
}

/** Boundary for a separately hosted Midnight.js provider service. */
export class HttpMidnightAdapter implements MidnightAdapter {
  constructor(private readonly config: MidnightConfig, private readonly verifierUrl: string) {}

  status(): MidnightStatus {
    return statusFor(this.config, "Midnight verifier is configured; connectivity is checked on verification")
  }

  async verifyEligibility(request: EligibilityProofRequest): Promise<EligibilityVerification> {
    const response = await fetch(this.verifierUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(request),
    })
    if (!response.ok) throw new Error(`Midnight verifier returned HTTP ${response.status}`)
    const body = await response.json() as Partial<EligibilityVerification>
    if (body.status !== "VERIFIED" || typeof body.verificationReference !== "string") throw new Error("Midnight verifier did not return a verified result")
    const expiresAt = body.expiresAt || request.expiresAt
    if (expiresAt !== null && expiresAt !== undefined) {
      const expiry = Date.parse(expiresAt)
      if (!Number.isFinite(expiry) || expiry <= Date.now()) throw new Error("Midnight verifier returned an expired proof")
    }
    if (!body.verificationReference.trim()) throw new Error("Midnight verifier returned an empty verification reference")
    return { status: "VERIFIED", verificationReference: body.verificationReference, expiresAt: expiresAt || null, detail: typeof body.detail === "string" ? body.detail : "Eligibility proof verified by configured Midnight adapter" }
  }
}

export function midnightConfig(env: NodeJS.ProcessEnv = process.env): MidnightConfig {
  return {
    network: env.MIDNIGHT_NETWORK || "unconfigured",
    networkId: env.MIDNIGHT_NETWORK_ID || null,
    nodeUrl: env.MIDNIGHT_NODE_URL || null,
    indexerUrl: env.MIDNIGHT_INDEXER_URL || null,
    proofServerUrl: env.MIDNIGHT_PROOF_SERVER_URL || null,
    zkConfigUrl: env.MIDNIGHT_ZK_CONFIG_URL || null,
    contractAddress: env.MIDNIGHT_CONTRACT_ADDRESS || null,
    walletConfigured: Boolean(env.MIDNIGHT_WALLET_PUBLIC_ADDRESS),
  }
}

export function createMidnightAdapter(env: NodeJS.ProcessEnv = process.env): MidnightAdapter {
  const config = midnightConfig(env)
  const verifierUrl = env.MIDNIGHT_VERIFIER_URL
  return verifierUrl && config.networkId && config.contractAddress ? new HttpMidnightAdapter(config, verifierUrl) : new UnconfiguredMidnightAdapter(config)
}

export function eligibilityDisclosure(): DisclosureResult {
  return {
    reveal: ["Verified contributor", "Eligibility result", "Contributor category only when required", "Content ownership claim when required"],
    hide: ["Name", "Email", "Location", "Wallet address", "Organisation", "Private proof inputs", "Witness data"],
    policy: "eligibility-only",
  }
}

export function canonicalize(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(",")}]`
  return `{${Object.keys(value as Record<string, unknown>).sort().map((key) => `${JSON.stringify(key)}:${canonicalize((value as Record<string, unknown>)[key])}`).join(",")}}`
}

export function contentCommitment(input: { contentType: ContributionContentType; title: string; description: string; contentReference?: string | null; metadata?: Record<string, string> }): string {
  return createHash("sha256").update(canonicalize({ contentType: input.contentType, title: input.title.trim(), description: input.description.trim(), contentReference: input.contentReference || null, metadata: input.metadata || {} })).digest("hex")
}
