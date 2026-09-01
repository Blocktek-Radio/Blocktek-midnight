CREATE TABLE IF NOT EXISTS "media_assets" (
  "id" text PRIMARY KEY,
  "title" text NOT NULL,
  "artist" text NOT NULL,
  "album" text,
  "path" text NOT NULL,
  "kind" text NOT NULL,
  "duration_seconds" integer,
  "artwork_url" text,
  "enabled" boolean NOT NULL DEFAULT true,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "media_assets_kind_enabled_idx" ON "media_assets" ("kind", "enabled");

CREATE TABLE IF NOT EXISTS "broadcast_sessions" (
  "id" text PRIMARY KEY,
  "station_id" text NOT NULL REFERENCES "stations"("id") ON DELETE CASCADE,
  "status" text NOT NULL,
  "stream_mount" text NOT NULL,
  "started_at" timestamptz NOT NULL,
  "ended_at" timestamptz,
  "last_error" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "broadcast_sessions_station_status_idx" ON "broadcast_sessions" ("station_id", "status", "started_at");

CREATE TABLE IF NOT EXISTS "broadcast_events" (
  "id" text PRIMARY KEY,
  "session_id" text NOT NULL REFERENCES "broadcast_sessions"("id") ON DELETE CASCADE,
  "media_asset_id" text REFERENCES "media_assets"("id") ON DELETE SET NULL,
  "event_type" text NOT NULL,
  "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "started_at" timestamptz NOT NULL,
  "ended_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "broadcast_events_session_started_idx" ON "broadcast_events" ("session_id", "started_at");
