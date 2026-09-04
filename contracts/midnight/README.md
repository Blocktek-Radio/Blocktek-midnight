# Midnight Contract Boundary

`contributor-eligibility.compact` is the minimal Phase 3 contract source. It
records only contributor, eligibility, and approved-content commitments plus
verification/revocation flags. Private contributor and eligibility commitments
are witnesses; they are used to satisfy circuit assertions and are not ledger
outputs.

The source is compiled locally with the official Compact toolchain `0.31.1`,
which selects Compact language `0.23.0` and generates ledger `8.0.2` artifacts.
The constructor initializes the public contributor and eligibility commitments;
the contributor's private state supplies matching witness values to the
`attest` circuit. Generated assets are kept beside the Midnight package in
`packages/midnight/managed/` so Node package resolution and ZK providers use
the same dependency graph.
The current API still uses `UnconfiguredMidnightAdapter` and reports `MIDNIGHT
INTEGRATION: NOT_CONFIGURED`; compilation alone is not deployment or proof
verification.

The first contract should prove an eligibility predicate without publishing private identity attributes. Audio, evidence files, streams, and AI jobs remain off-chain.
