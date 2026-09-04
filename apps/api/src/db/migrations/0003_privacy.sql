CREATE TABLE IF NOT EXISTS "contributors" (
  "id" text PRIMARY KEY,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "contributions" (
  "id" text PRIMARY KEY,
  "contributor_id" text NOT NULL REFERENCES "contributors"("id") ON DELETE RESTRICT,
  "content_type" text NOT NULL,
  "content_reference" text,
  "media_asset_id" text,
  "title" text NOT NULL,
  "description" text NOT NULL,
  "state" text NOT NULL,
  "privacy_status" text NOT NULL,
  "editorial_status" text NOT NULL,
  "programming_eligible" boolean NOT NULL DEFAULT false,
  "content_commitment" text NOT NULL UNIQUE,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "contributions_contributor_created_idx" ON "contributions" ("contributor_id", "created_at");
CREATE INDEX IF NOT EXISTS "contributions_programmable_idx" ON "contributions" ("programming_eligible", "state");
CREATE TABLE IF NOT EXISTS "privacy_verifications" (
  "id" text PRIMARY KEY,
  "contribution_id" text NOT NULL REFERENCES "contributions"("id") ON DELETE CASCADE,
  "claim_type" text NOT NULL,
  "disclosed_attributes" text[] NOT NULL DEFAULT '{}',
  "status" text NOT NULL,
  "proof_reference" text NOT NULL,
  "verification_reference" text,
  "expires_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "privacy_verifications_contribution_idx" ON "privacy_verifications" ("contribution_id", "created_at");
CREATE TABLE IF NOT EXISTS "selective_disclosures" (
  "id" text PRIMARY KEY,
  "contribution_id" text NOT NULL REFERENCES "contributions"("id") ON DELETE CASCADE,
  "claim_type" text NOT NULL,
  "disclosed_attributes" text[] NOT NULL DEFAULT '{}',
  "verification_id" text REFERENCES "privacy_verifications"("id") ON DELETE SET NULL,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "editorial_reviews" (
  "id" text PRIMARY KEY,
  "contribution_id" text NOT NULL REFERENCES "contributions"("id") ON DELETE CASCADE,
  "status" text NOT NULL,
  "verification_reference" text,
  "reason" text,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "midnight_transactions" (
  "id" text PRIMARY KEY,
  "contribution_id" text REFERENCES "contributions"("id") ON DELETE SET NULL,
  "network" text NOT NULL,
  "transaction_hash" text,
  "contract_address" text,
  "status" text NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "contribution_audit_events" (
  "id" text PRIMARY KEY,
  "contribution_id" text NOT NULL REFERENCES "contributions"("id") ON DELETE CASCADE,
  "event" text NOT NULL,
  "actor_role" text NOT NULL,
  "reference" text,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "contribution_audit_events_contribution_idx" ON "contribution_audit_events" ("contribution_id", "created_at");
ALTER TABLE "media_assets" ADD COLUMN IF NOT EXISTS "contribution_id" text REFERENCES "contributions"("id") ON DELETE SET NULL;
ALTER TABLE "media_assets" ADD COLUMN IF NOT EXISTS "privacy_verified" boolean NOT NULL DEFAULT true;
ALTER TABLE "media_assets" ADD COLUMN IF NOT EXISTS "editorial_approved" boolean NOT NULL DEFAULT true;
