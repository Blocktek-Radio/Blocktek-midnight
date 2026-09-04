import type * as __compactRuntime from '@midnight-ntwrk/compact-runtime';

export type Witnesses<PS> = {
  privateContributorCommitment(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, Uint8Array];
  privateEligibilityCommitment(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, Uint8Array];
}

export type ImpureCircuits<PS> = {
  attest(context: __compactRuntime.CircuitContext<PS>, content_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  revoke(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, []>;
}

export type ProvableCircuits<PS> = {
  attest(context: __compactRuntime.CircuitContext<PS>, content_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  revoke(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, []>;
}

export type PureCircuits = {
}

export type Circuits<PS> = {
  attest(context: __compactRuntime.CircuitContext<PS>, content_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  revoke(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, []>;
}

export type Ledger = {
  readonly contributorCommitment: Uint8Array;
  readonly eligibilityCommitment: Uint8Array;
  readonly approvedContentCommitment: Uint8Array;
  readonly verified: boolean;
  readonly revoked: boolean;
}

export type ContractReferenceLocations = any;

export declare const contractReferenceLocations : ContractReferenceLocations;

export declare class Contract<PS = any, W extends Witnesses<PS> = Witnesses<PS>> {
  witnesses: W;
  circuits: Circuits<PS>;
  impureCircuits: ImpureCircuits<PS>;
  provableCircuits: ProvableCircuits<PS>;
  constructor(witnesses: W);
  initialState(context: __compactRuntime.ConstructorContext<PS>,
               initialContributorCommitment_0: Uint8Array,
               initialEligibilityCommitment_0: Uint8Array): __compactRuntime.ConstructorResult<PS>;
}

export declare function ledger(state: __compactRuntime.StateValue | __compactRuntime.ChargedState): Ledger;
export declare const pureCircuits: PureCircuits;
