# Midnight Contract Boundary

`contributor-eligibility.compact` is the minimal Phase 3 contract source. It
records only contributor, eligibility, and approved-content commitments plus
verification/revocation flags. Private contributor and eligibility commitments
are witnesses; they are used to satisfy circuit assertions and are not ledger
outputs.

No contract is claimed to be compiled or deployed here. The current API uses
`UnconfiguredMidnightAdapter` and reports `MIDNIGHT INTEGRATION:
NOT_CONFIGURED`. The source targets the official Compact language 0.22 /
compiler 0.30 compatibility set identified in the current Midnight
documentation, but compilation must be performed with the pinned compiler
before generated artifacts are added.

The first contract should prove an eligibility predicate without publishing private identity attributes. Audio, evidence files, streams, and AI jobs remain off-chain.
