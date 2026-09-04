import { randomUUID } from "node:crypto"
import type { MidnightAdapter } from "@blocktek/midnight"
import { contentCommitment } from "@blocktek/midnight"
import type { Contribution, ContributionAuditEvent, ContributionContentType, ContributionState, EditorialReview, EditorialStatus, PrivacyVerification, PrivacyVerificationStatus, ApprovedContributionMetadata } from "@blocktek/types"
import postgres from "postgres"

export type PrivacyActor = { id: string; role: "CONTRIBUTOR" | "EDITOR" | "ADMIN" }
export type ContributionInput = { contentType: ContributionContentType; title: string; description: string; contentReference: string | null; metadata: Record<string, string> }
export type ProofInput = { claimType: string; proofReference: string; disclosedAttributes: string[]; expiresAt: string | null }
export type ReviewInput = { status: Exclude<EditorialStatus, "PENDING">; reason: string | null }

export type PrivacyStore = {
  create(input: ContributionInput, actor: PrivacyActor): Promise<Contribution>
  list(actor: PrivacyActor): Promise<Contribution[]>
  get(id: string, actor: PrivacyActor): Promise<Contribution | null>
  verify(id: string, proof: ProofInput, actor: PrivacyActor, midnight: MidnightAdapter): Promise<{ contribution: Contribution; verification: PrivacyVerification }>
  privacyStatus(id: string, actor: PrivacyActor): Promise<{ contribution: Contribution; verification: Omit<PrivacyVerification, "proofReference"> | null }>
  review(id: string, input: ReviewInput, actor: PrivacyActor): Promise<{ contribution: Contribution; review: EditorialReview }>
  approve(id: string, actor: PrivacyActor): Promise<Contribution>
  audit(id: string, actor: PrivacyActor): Promise<ContributionAuditEvent[]>
  counts(): Promise<{ pending: number; verified: number; approved: number }>
  programmable(): Promise<ApprovedContributionMetadata[]>
  close(): Promise<void>
}

type StoredContribution = Contribution & { contributorId: string; mediaAssetId: string | null }

function canRead(contribution: StoredContribution, actor: PrivacyActor) {
  return actor.role === "EDITOR" || actor.role === "ADMIN" || contribution.contributorId === actor.id
}

export function transitionContribution(current: ContributionState, next: ContributionState): ContributionState {
  const allowed: Record<ContributionState, ContributionState[]> = {
    DRAFT: ["SUBMITTED", "EXPIRED"],
    SUBMITTED: ["PRIVACY_VERIFICATION_PENDING", "REJECTED", "EXPIRED"],
    PRIVACY_VERIFICATION_PENDING: ["PRIVACY_VERIFIED", "REJECTED", "EXPIRED"],
    PRIVACY_VERIFIED: ["EDITORIAL_REVIEW", "REVOKED", "EXPIRED"],
    EDITORIAL_REVIEW: ["APPROVED", "REJECTED", "REVOKED", "EXPIRED"],
    APPROVED: ["PROGRAMMABLE", "REVOKED"],
    PROGRAMMABLE: ["BROADCAST", "REVOKED"],
    BROADCAST: ["REVOKED"],
    REJECTED: [],
    EXPIRED: [],
    REVOKED: [],
  }
  if (current !== next && !allowed[current].includes(next)) throw new Error(`cannot transition contribution from ${current} to ${next}`)
  return next
}

function publicContribution(row: StoredContribution): Contribution {
  const { contributorId: _contributorId, mediaAssetId: _mediaAssetId, ...safe } = row
  return safe
}

function newContribution(input: ContributionInput, actor: PrivacyActor): StoredContribution {
  const now = new Date().toISOString()
  return {
    id: randomUUID(), contributorId: actor.id, mediaAssetId: input.contentReference, contentType: input.contentType,
    title: input.title, description: input.description, contentReference: input.contentReference,
    state: "PRIVACY_VERIFICATION_PENDING", privacyStatus: "PENDING", editorialStatus: "PENDING", programmingEligible: false,
    contentCommitment: contentCommitment(input), createdAt: now, updatedAt: now,
  }
}

function event(contributionId: string, value: string, actorRole: ContributionAuditEvent["actorRole"], reference: string | null): ContributionAuditEvent {
  return { id: randomUUID(), contributionId, event: value, actorRole, reference, createdAt: new Date().toISOString() }
}

function validateProofInput(proof: ProofInput) {
  if (!["eligible_contributor", "content_owner", "editorial_qualification"].includes(proof.claimType)) throw new Error("unsupported privacy claim")
  if (proof.disclosedAttributes.some((attribute) => ["name", "email", "location", "wallet", "walletAddress", "organisation", "privateWitness"].includes(attribute))) throw new Error("sensitive attributes cannot be selectively disclosed")
  if (proof.expiresAt && new Date(proof.expiresAt).getTime() <= Date.now()) throw new Error("privacy proof is expired")
  if (!proof.proofReference.trim()) throw new Error("proof reference is required")
}

export class InMemoryPrivacyStore implements PrivacyStore {
  private readonly contributions = new Map<string, StoredContribution>()
  private readonly verifications = new Map<string, PrivacyVerification>()
  private readonly reviews = new Map<string, EditorialReview>()
  private readonly events: ContributionAuditEvent[] = []

  async create(input: ContributionInput, actor: PrivacyActor) {
    const contribution = newContribution(input, actor)
    this.contributions.set(contribution.id, contribution)
    this.events.unshift(event(contribution.id, "CONTRIBUTION_CREATED", "CONTRIBUTOR", contribution.contentCommitment))
    this.events.unshift(event(contribution.id, "PRIVACY_VERIFICATION_PENDING", "SYSTEM", null))
    return publicContribution(contribution)
  }

  async list(actor: PrivacyActor) { return [...this.contributions.values()].filter((item) => canRead(item, actor)).map(publicContribution) }
  async get(id: string, actor: PrivacyActor) { const item = this.contributions.get(id); return item && canRead(item, actor) ? publicContribution(item) : null }

  async verify(id: string, proof: ProofInput, actor: PrivacyActor, midnight: MidnightAdapter) {
    const item = this.contributions.get(id)
    if (!item || item.contributorId !== actor.id) throw new Error("contribution not found")
    if (item.state !== "PRIVACY_VERIFICATION_PENDING") throw new Error("contribution is not awaiting privacy verification")
    validateProofInput(proof)
    const result = await midnight.verifyEligibility({ ...proof, contributionId: id, contentCommitment: item.contentCommitment })
    const verification: PrivacyVerification = { id: randomUUID(), contributionId: id, claimType: proof.claimType, disclosedAttributes: proof.disclosedAttributes, status: result.status, proofReference: proof.proofReference, verificationReference: result.verificationReference, expiresAt: result.expiresAt, createdAt: new Date().toISOString() }
    this.verifications.set(id, verification)
    item.state = transitionContribution(item.state, "PRIVACY_VERIFIED")
    item.privacyStatus = result.status
    item.updatedAt = new Date().toISOString()
    this.events.unshift(event(id, "PRIVACY_PROOF_VERIFIED", "CONTRIBUTOR", result.verificationReference))
    return { contribution: publicContribution(item), verification }
  }

  async privacyStatus(id: string, actor: PrivacyActor) {
    const item = this.contributions.get(id)
    if (!item || !canRead(item, actor)) throw new Error("contribution not found")
    const verification = this.verifications.get(id)
    const { proofReference: _proofReference, ...safe } = verification || {} as PrivacyVerification
    return { contribution: publicContribution(item), verification: verification ? safe : null }
  }

  async review(id: string, input: ReviewInput, actor: PrivacyActor) {
    if (actor.role !== "EDITOR" && actor.role !== "ADMIN") throw new Error("editorial role required")
    const item = this.contributions.get(id)
    if (!item) throw new Error("contribution not found")
    if (item.state === "PRIVACY_VERIFIED") item.state = transitionContribution(item.state, "EDITORIAL_REVIEW")
    if (item.state !== "EDITORIAL_REVIEW") throw new Error("contribution is not in editorial review")
    const review: EditorialReview = { id: randomUUID(), contributionId: id, status: input.status, verificationReference: this.verifications.get(id)?.verificationReference || null, reason: input.reason, createdAt: new Date().toISOString() }
    this.reviews.set(id, review)
    item.editorialStatus = input.status
    if (input.status === "REJECTED" || input.status === "REVOKED") item.state = input.status
    item.updatedAt = new Date().toISOString()
    this.events.unshift(event(id, `EDITORIAL_${input.status}`, actor.role, review.id))
    return { contribution: publicContribution(item), review }
  }

  async approve(id: string, actor: PrivacyActor) {
    if (actor.role !== "EDITOR" && actor.role !== "ADMIN") throw new Error("editorial role required")
    const item = this.contributions.get(id)
    if (!item || item.state !== "EDITORIAL_REVIEW" || item.privacyStatus !== "VERIFIED" || item.editorialStatus !== "VERIFIED") throw new Error("privacy verification and editorial verification are required")
    item.state = transitionContribution(item.state, "APPROVED")
    item.state = transitionContribution(item.state, "PROGRAMMABLE")
    item.programmingEligible = true
    item.updatedAt = new Date().toISOString()
    this.events.unshift(event(id, "PROGRAMMABLE", "SYSTEM", item.contentCommitment))
    return publicContribution(item)
  }

  async audit(id: string, actor: PrivacyActor) { const item = this.contributions.get(id); if (!item || !canRead(item, actor)) throw new Error("contribution not found"); return this.events.filter((entry) => entry.contributionId === id) }
  async counts() { const values = [...this.contributions.values()]; return { pending: values.filter((item) => item.state === "PRIVACY_VERIFICATION_PENDING").length, verified: values.filter((item) => item.privacyStatus === "VERIFIED").length, approved: values.filter((item) => item.programmingEligible).length } }
  async programmable() { return [...this.contributions.values()].filter((item) => item.programmingEligible && item.editorialStatus === "VERIFIED").map((item) => ({ contributionId: item.id, contentType: item.contentType, title: item.title, description: item.description, editorialStatus: "VERIFIED" as const, programmingEligible: true as const, contentReference: item.contentReference })) }
  async close() {}
}

type ContributionRow = { id: string; contributor_id: string; content_type: ContributionContentType; title: string; description: string; content_reference: string | null; state: ContributionState; privacy_status: PrivacyVerificationStatus; editorial_status: EditorialStatus; programming_eligible: boolean; content_commitment: string; media_asset_id: string | null; created_at: Date | string; updated_at: Date | string }
function mapRow(row: ContributionRow): StoredContribution { return { id: row.id, contributorId: row.contributor_id, mediaAssetId: row.media_asset_id, contentType: row.content_type, title: row.title, description: row.description, contentReference: row.content_reference, state: row.state, privacyStatus: row.privacy_status, editorialStatus: row.editorial_status, programmingEligible: row.programming_eligible, contentCommitment: row.content_commitment, createdAt: new Date(row.created_at).toISOString(), updatedAt: new Date(row.updated_at).toISOString() } }

export class PostgresPrivacyStore implements PrivacyStore {
  private readonly sql: postgres.Sql
  constructor(databaseUrl: string) { this.sql = postgres(databaseUrl, { max: 10, idle_timeout: 20 }) }
  private async row(id: string) { const rows = await this.sql<ContributionRow[]>`SELECT * FROM contributions WHERE id = ${id} LIMIT 1`; return rows[0] ? mapRow(rows[0]) : null }
  private async assertReadable(id: string, actor: PrivacyActor) { const item = await this.row(id); if (!item || !canRead(item, actor)) throw new Error("contribution not found"); return item }
  async create(input: ContributionInput, actor: PrivacyActor) { const item = newContribution(input, actor); await this.sql`INSERT INTO contributors (id) VALUES (${item.contributorId}) ON CONFLICT (id) DO NOTHING`; await this.sql`INSERT INTO contributions (id, contributor_id, content_type, title, description, content_reference, media_asset_id, state, privacy_status, editorial_status, programming_eligible, content_commitment) VALUES (${item.id}, ${item.contributorId}, ${item.contentType}, ${item.title}, ${item.description}, ${item.contentReference}, ${item.mediaAssetId}, ${item.state}, ${item.privacyStatus}, ${item.editorialStatus}, ${item.programmingEligible}, ${item.contentCommitment})`; await this.sql`INSERT INTO contribution_audit_events (id, contribution_id, event, actor_role, reference) VALUES (${randomUUID()}, ${item.id}, 'CONTRIBUTION_CREATED', 'CONTRIBUTOR', ${item.contentCommitment}), (${randomUUID()}, ${item.id}, 'PRIVACY_VERIFICATION_PENDING', 'SYSTEM', NULL)`; return publicContribution(item) }
  async list(actor: PrivacyActor) { const rows = actor.role === "EDITOR" || actor.role === "ADMIN" ? await this.sql<ContributionRow[]>`SELECT * FROM contributions ORDER BY created_at DESC` : await this.sql<ContributionRow[]>`SELECT * FROM contributions WHERE contributor_id = ${actor.id} ORDER BY created_at DESC`; return rows.map(mapRow).map(publicContribution) }
  async get(id: string, actor: PrivacyActor) { const item = await this.row(id); return item && canRead(item, actor) ? publicContribution(item) : null }
  async verify(id: string, proof: ProofInput, actor: PrivacyActor, midnight: MidnightAdapter) { const item = await this.assertReadable(id, actor); if (item.contributorId !== actor.id || item.state !== "PRIVACY_VERIFICATION_PENDING") throw new Error("contribution is not awaiting privacy verification"); validateProofInput(proof); const result = await midnight.verifyEligibility({ ...proof, contributionId: id, contentCommitment: item.contentCommitment }); const verification: PrivacyVerification = { id: randomUUID(), contributionId: id, claimType: proof.claimType, disclosedAttributes: proof.disclosedAttributes, status: result.status, proofReference: proof.proofReference, verificationReference: result.verificationReference, expiresAt: result.expiresAt, createdAt: new Date().toISOString() }; await this.sql`INSERT INTO privacy_verifications (id, contribution_id, claim_type, disclosed_attributes, status, proof_reference, verification_reference, expires_at) VALUES (${verification.id}, ${id}, ${verification.claimType}, ${verification.disclosedAttributes}, ${verification.status}, ${verification.proofReference}, ${verification.verificationReference}, ${verification.expiresAt})`; await this.sql`UPDATE contributions SET state = 'PRIVACY_VERIFIED', privacy_status = 'VERIFIED', updated_at = now() WHERE id = ${id}`; await this.sql`INSERT INTO contribution_audit_events (id, contribution_id, event, actor_role, reference) VALUES (${randomUUID()}, ${id}, 'PRIVACY_PROOF_VERIFIED', 'CONTRIBUTOR', ${verification.verificationReference})`; return { contribution: publicContribution({ ...item, state: "PRIVACY_VERIFIED", privacyStatus: "VERIFIED", updatedAt: new Date().toISOString() }), verification } }
  async privacyStatus(id: string, actor: PrivacyActor) { const item = await this.assertReadable(id, actor); const rows = await this.sql<PrivacyVerification[]>`SELECT id, contribution_id as "contributionId", claim_type as "claimType", disclosed_attributes as "disclosedAttributes", status, verification_reference as "verificationReference", expires_at as "expiresAt", created_at as "createdAt" FROM privacy_verifications WHERE contribution_id = ${id} ORDER BY created_at DESC LIMIT 1`; return { contribution: publicContribution(item), verification: rows[0] || null } }
  async review(id: string, input: ReviewInput, actor: PrivacyActor) { if (actor.role !== "EDITOR" && actor.role !== "ADMIN") throw new Error("editorial role required"); const item = await this.row(id); if (!item) throw new Error("contribution not found"); if (item.state === "PRIVACY_VERIFIED") await this.sql`UPDATE contributions SET state = 'EDITORIAL_REVIEW', updated_at = now() WHERE id = ${id}`; const review: EditorialReview = { id: randomUUID(), contributionId: id, status: input.status, verificationReference: (await this.sql<{ verification_reference: string | null }[]>`SELECT verification_reference FROM privacy_verifications WHERE contribution_id = ${id} ORDER BY created_at DESC LIMIT 1`)[0]?.verification_reference || null, reason: input.reason, createdAt: new Date().toISOString() }; await this.sql`INSERT INTO editorial_reviews (id, contribution_id, status, verification_reference, reason) VALUES (${review.id}, ${id}, ${review.status}, ${review.verificationReference}, ${review.reason})`; await this.sql`UPDATE contributions SET editorial_status = ${input.status}, state = ${input.status === "REJECTED" || input.status === "REVOKED" ? input.status : "EDITORIAL_REVIEW"}, updated_at = now() WHERE id = ${id}`; await this.sql`INSERT INTO contribution_audit_events (id, contribution_id, event, actor_role, reference) VALUES (${randomUUID()}, ${id}, ${`EDITORIAL_${input.status}`}, ${actor.role}, ${review.id})`; return { contribution: publicContribution({ ...(await this.row(id))!, state: input.status === "REJECTED" || input.status === "REVOKED" ? input.status : "EDITORIAL_REVIEW", editorialStatus: input.status, updatedAt: new Date().toISOString() }), review } }
  async approve(id: string, actor: PrivacyActor) { if (actor.role !== "EDITOR" && actor.role !== "ADMIN") throw new Error("editorial role required"); const item = await this.row(id); if (!item || item.state !== "EDITORIAL_REVIEW" || item.privacyStatus !== "VERIFIED" || item.editorialStatus !== "VERIFIED") throw new Error("privacy verification and editorial verification are required"); await this.sql`UPDATE contributions SET state = 'PROGRAMMABLE', programming_eligible = true, updated_at = now() WHERE id = ${id}`; await this.sql`INSERT INTO contribution_audit_events (id, contribution_id, event, actor_role, reference) VALUES (${randomUUID()}, ${id}, 'PROGRAMMABLE', 'SYSTEM', ${item.contentCommitment})`; return publicContribution({ ...item, state: "PROGRAMMABLE", programmingEligible: true, updatedAt: new Date().toISOString() }) }
  async audit(id: string, actor: PrivacyActor) { await this.assertReadable(id, actor); const rows = await this.sql<ContributionAuditEvent[]>`SELECT id, contribution_id as "contributionId", event, actor_role as "actorRole", reference, created_at as "createdAt" FROM contribution_audit_events WHERE contribution_id = ${id} ORDER BY created_at ASC`; return rows }
  async counts() { const rows = await this.sql<{ pending: string; verified: string; approved: string }[]>`SELECT count(*) FILTER (WHERE state = 'PRIVACY_VERIFICATION_PENDING') AS pending, count(*) FILTER (WHERE privacy_status = 'VERIFIED') AS verified, count(*) FILTER (WHERE programming_eligible = true) AS approved FROM contributions`; return { pending: Number(rows[0]?.pending || 0), verified: Number(rows[0]?.verified || 0), approved: Number(rows[0]?.approved || 0) } }
  async programmable() { return this.sql<ApprovedContributionMetadata[]>`SELECT id as "contributionId", content_type as "contentType", title, description, editorial_status as "editorialStatus", programming_eligible as "programmingEligible", content_reference as "contentReference" FROM contributions WHERE programming_eligible = true AND editorial_status = 'VERIFIED' ORDER BY created_at ASC` }
  async close() { await this.sql.end({ timeout: 5 }) }
}
