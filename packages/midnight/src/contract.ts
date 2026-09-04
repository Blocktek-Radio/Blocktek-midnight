import { fileURLToPath } from "node:url"
import type { WitnessContext } from "@midnight-ntwrk/compact-runtime"
import { CompiledContract } from "@midnight-ntwrk/midnight-js-protocol/compact-js"
import * as GeneratedContract from "../managed/contract/index.js"

export type ContributorEligibilityPrivateState = {
  contributorCommitment: Uint8Array
  eligibilityCommitment: Uint8Array
}

export const contributorEligibilityWitnesses: GeneratedContract.Witnesses<ContributorEligibilityPrivateState> = {
  privateContributorCommitment: ({ privateState }: WitnessContext<GeneratedContract.Ledger, ContributorEligibilityPrivateState>) => [privateState, privateState.contributorCommitment],
  privateEligibilityCommitment: ({ privateState }: WitnessContext<GeneratedContract.Ledger, ContributorEligibilityPrivateState>) => [privateState, privateState.eligibilityCommitment],
}

export const CompiledContributorEligibilityContract = CompiledContract.make<
  GeneratedContract.Contract<ContributorEligibilityPrivateState>
>("ContributorEligibility", GeneratedContract.Contract<ContributorEligibilityPrivateState>).pipe(
  CompiledContract.withWitnesses(contributorEligibilityWitnesses),
  CompiledContract.withCompiledFileAssets(fileURLToPath(new URL("../managed", import.meta.url))),
)

export { GeneratedContract }
