import type { SubmissionState } from "@blocktek/types"

const transitions: Record<SubmissionState, SubmissionState[]> = {
  DRAFT: ["SUBMITTED"],
  SUBMITTED: ["PROOF_PENDING", "REJECTED"],
  PROOF_PENDING: ["VERIFIED", "REJECTED"],
  VERIFIED: ["UNDER_REVIEW", "REJECTED"],
  UNDER_REVIEW: ["APPROVED", "REJECTED"],
  APPROVED: ["BROADCAST", "ARCHIVED"],
  REJECTED: ["ARCHIVED"],
  BROADCAST: ["ARCHIVED"],
  ARCHIVED: [],
}

export function canTransition(from: SubmissionState, to: SubmissionState): boolean {
  return transitions[from].includes(to)
}

export function transitionSubmission(from: SubmissionState, to: SubmissionState): SubmissionState {
  if (!canTransition(from, to)) throw new Error(`Invalid submission transition: ${from} -> ${to}`)
  return to
}
