CREATE TABLE IF NOT EXISTS "ai_programming_decisions" (
  "id" text PRIMARY KEY,
  "request_type" text NOT NULL,
  "provider" text,
  "model" text,
  "input_context_hash" text NOT NULL,
  "proposal" jsonb,
  "validation_status" text NOT NULL,
  "rejection_reason" text,
  "explanation" text NOT NULL,
  "latency_ms" integer NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "ai_programming_decisions_created_idx" ON "ai_programming_decisions" ("created_at");

CREATE TABLE IF NOT EXISTS "ai_programming_queue" (
  "decision_id" text NOT NULL REFERENCES "ai_programming_decisions"("id") ON DELETE CASCADE,
  "media_asset_id" text NOT NULL REFERENCES "media_assets"("id"),
  "programme_title" text NOT NULL,
  "position" integer NOT NULL,
  "status" text NOT NULL DEFAULT 'PENDING',
  "played_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY ("decision_id", "position")
);
CREATE INDEX IF NOT EXISTS "ai_programming_queue_status_idx" ON "ai_programming_queue" ("status", "created_at");
