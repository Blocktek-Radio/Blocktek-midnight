CREATE TABLE IF NOT EXISTS "_blocktek_migrations" (
  "id" text PRIMARY KEY,
  "applied_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "stations" (
  "id" text PRIMARY KEY,
  "name" text NOT NULL,
  "description" text NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "channels" (
  "id" text PRIMARY KEY,
  "station_id" text NOT NULL REFERENCES "stations"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "genre" text NOT NULL,
  "description" text NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "channels_station_id_idx" ON "channels" ("station_id");

CREATE TABLE IF NOT EXISTS "artists" (
  "id" text PRIMARY KEY,
  "name" text NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "albums" (
  "id" text PRIMARY KEY,
  "title" text NOT NULL,
  "artwork_url" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "tracks" (
  "id" text PRIMARY KEY,
  "artist_id" text NOT NULL REFERENCES "artists"("id"),
  "album_id" text REFERENCES "albums"("id"),
  "title" text NOT NULL,
  "duration_seconds" integer NOT NULL,
  "artwork_url" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "tracks_artist_id_idx" ON "tracks" ("artist_id");

CREATE TABLE IF NOT EXISTS "streams" (
  "id" text PRIMARY KEY,
  "channel_id" text NOT NULL REFERENCES "channels"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "url" text,
  "enabled" boolean NOT NULL DEFAULT false,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "streams_channel_id_unique" ON "streams" ("channel_id");

CREATE TABLE IF NOT EXISTS "playlists" (
  "id" text PRIMARY KEY,
  "channel_id" text NOT NULL REFERENCES "channels"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "description" text NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "playlists_channel_id_idx" ON "playlists" ("channel_id");

CREATE TABLE IF NOT EXISTS "playlist_items" (
  "playlist_id" text NOT NULL REFERENCES "playlists"("id") ON DELETE CASCADE,
  "track_id" text NOT NULL REFERENCES "tracks"("id"),
  "position" integer NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY ("playlist_id", "position")
);
CREATE INDEX IF NOT EXISTS "playlist_items_playlist_id_idx" ON "playlist_items" ("playlist_id");

CREATE TABLE IF NOT EXISTS "programmes" (
  "id" text PRIMARY KEY,
  "channel_id" text NOT NULL REFERENCES "channels"("id") ON DELETE CASCADE,
  "title" text NOT NULL,
  "description" text NOT NULL,
  "host" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "programmes_channel_id_idx" ON "programmes" ("channel_id");

CREATE TABLE IF NOT EXISTS "schedules" (
  "id" text PRIMARY KEY,
  "programme_id" text NOT NULL REFERENCES "programmes"("id") ON DELETE CASCADE,
  "channel_id" text NOT NULL REFERENCES "channels"("id") ON DELETE CASCADE,
  "start_time" timestamptz NOT NULL,
  "end_time" timestamptz NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "schedules_channel_time_idx" ON "schedules" ("channel_id", "start_time", "end_time");

INSERT INTO "stations" ("id", "name", "description")
VALUES ('blocktek-main', 'BlockTek Radio', 'A privacy-first station for decentralized audio and community programming.')
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "channels" ("id", "station_id", "name", "genre", "description")
VALUES ('signal-01', 'blocktek-main', 'Signal / Main', 'Experimental electronic', 'The main BlockTek Radio channel.')
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "streams" ("id", "channel_id", "name", "url", "enabled")
VALUES ('stream-signal-main', 'signal-01', 'Signal / Main', NULL, false)
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "artists" ("id", "name")
VALUES ('artist-001', 'BlockTek Radio Library')
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "tracks" ("id", "artist_id", "title", "duration_seconds")
VALUES
  ('track-001', 'artist-001', 'Proof of Sound', 246),
  ('track-002', 'artist-001', 'Open Frequency', 188),
  ('track-003', 'artist-001', 'Relay State', 271)
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "playlists" ("id", "channel_id", "name", "description")
VALUES ('playlist-development-signal', 'signal-01', 'Development Signal Queue', 'Deterministic seed queue for development and tests.')
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "playlist_items" ("playlist_id", "track_id", "position")
VALUES
  ('playlist-development-signal', 'track-001', 1),
  ('playlist-development-signal', 'track-002', 2),
  ('playlist-development-signal', 'track-003', 3)
ON CONFLICT ("playlist_id", "position") DO NOTHING;

INSERT INTO "programmes" ("id", "channel_id", "title", "description", "host")
VALUES ('programme-development-signal', 'signal-01', 'Development Signal', 'Seed programming used to exercise the radio interface before a real schedule is loaded.', NULL)
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "schedules" ("id", "programme_id", "channel_id", "start_time", "end_time")
VALUES ('schedule-development-signal', 'programme-development-signal', 'signal-01', now() - interval '30 minutes', now() + interval '90 minutes')
ON CONFLICT ("id") DO NOTHING;
