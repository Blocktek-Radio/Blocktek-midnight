import assert from "node:assert/strict"
import test from "node:test"
import {
  CostModel,
  QueryContext,
  createConstructorContext,
  sampleContractAddress,
} from "@midnight-ntwrk/compact-runtime"
import { GeneratedContract, contributorEligibilityWitnesses } from "../src/contract.js"

const bytes = (value: number): Uint8Array => Uint8Array.from({ length: 32 }, () => value)

class ContributorEligibilitySimulator {
  readonly contract = new GeneratedContract.Contract(contributorEligibilityWitnesses)
  context: Parameters<typeof this.contract.impureCircuits.attest>[0]

  constructor(
    contributorCommitment: Uint8Array,
    eligibilityCommitment: Uint8Array,
  ) {
    const initialPrivateState = { contributorCommitment, eligibilityCommitment }
    const initialized = this.contract.initialState(
      createConstructorContext(initialPrivateState, "0".repeat(64)),
      contributorCommitment,
      eligibilityCommitment,
    )
    this.context = {
      currentPrivateState: initialized.currentPrivateState,
      currentZswapLocalState: initialized.currentZswapLocalState,
      costModel: CostModel.initialCostModel(),
      currentQueryContext: new QueryContext(initialized.currentContractState.data, sampleContractAddress()),
    }
  }

  ledger() {
    return GeneratedContract.ledger(this.context.currentQueryContext.state)
  }

  attest(contentCommitment: Uint8Array) {
    this.context = this.contract.impureCircuits.attest(this.context, contentCommitment).context
  }

  revoke() {
    this.context = this.contract.impureCircuits.revoke(this.context).context
  }
}

test("constructor commitments match private witnesses and attest publishes only public commitments", () => {
  const contributor = bytes(1)
  const eligibility = bytes(2)
  const content = bytes(3)
  const simulator = new ContributorEligibilitySimulator(contributor, eligibility)

  assert.deepEqual(simulator.ledger().contributorCommitment, contributor)
  assert.deepEqual(simulator.ledger().eligibilityCommitment, eligibility)
  assert.equal(simulator.ledger().verified, false)

  simulator.attest(content)

  assert.deepEqual(simulator.ledger().approvedContentCommitment, content)
  assert.equal(simulator.ledger().verified, true)
  assert.equal(simulator.ledger().revoked, false)
})

test("a mismatched witness is rejected and revocation is terminal", () => {
  const simulator = new ContributorEligibilitySimulator(bytes(1), bytes(2))
  simulator.context.currentPrivateState = {
    contributorCommitment: bytes(9),
    eligibilityCommitment: bytes(2),
  }

  assert.throws(() => simulator.attest(bytes(3)), /contributor commitment does not match/)

  simulator.context.currentPrivateState = {
    contributorCommitment: bytes(1),
    eligibilityCommitment: bytes(2),
  }
  simulator.attest(bytes(3))
  simulator.revoke()

  assert.equal(simulator.ledger().verified, false)
  assert.equal(simulator.ledger().revoked, true)
  assert.throws(() => simulator.attest(bytes(4)), /attestation is revoked/)
})
