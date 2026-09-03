# BlockTek Radio

BlockTek Radio is a privacy-preserving, decentralized radio protocol for community programming, independent media, and contributor-led broadcasting. Its product loop is simple: listen, discover, contribute, verify eligibility privately, review editorially, and broadcast.

> **Status:** Phase 1 is externally operational. Phase 2 implementation is present behind an optional provider boundary: ASI Cloud is primary, Groq is fallback, and deterministic programming remains authoritative when AI is unavailable. Midnight remains intentionally unconfigured.

## Vision and Problem

Creators, journalists, listeners, and communities need media infrastructure that is not dependent on a single platform or forced to reveal more identity than a contribution requires. BlockTek Radio combines radio programming, AI assistance, community contribution, and Midnight eligibility proofs while keeping continuous media off-chain.

The project does not make an absolute anonymity claim. Browsers, network infrastructure, upload systems, and stream providers can still expose metadata unless those systems are separately controlled.

## Current Status

Phase 1B extends the Phase 1 foundation with a private Icecast source boundary, a deterministic FFmpeg worker, persistent broadcast sessions/events, filesystem media management, fallback handling, and real now-playing synchronization. The production instance is configured at `https://blocktek-radio.duckdns.org`; the Vercel frontend is `https://blockteck-radio.vercel.app/`.

The API uses PostgreSQL when `DATABASE_URL` is configured and an in-memory repository for host development. `RADIO_STREAM_URL` is optional, AI uses an explicitly labelled development fallback without provider credentials, and Midnight reports `NOT_CONFIGURED`. No proof, transaction, live stream, provider result, or now-playing metadata is fabricated.

## Why Midnight

Midnight is the privacy boundary for contributor credentials, eligibility assertions, and selective disclosure. The intended result is to prove “verified contributor” or another eligibility property without revealing name, email, location, wallet address, or organisation. Audio, podcasts, stream data, AI processing, and ordinary application data remain off-chain.

## What Works Today

- `/radio` provides the station, channel, programme, queue, and now-playing product shell.
- `/radio` includes native audio playback controls with explicit stream-health, error, retry, volume, and API-unavailable states.
- `/ai-dj` provides a schema-validated programme-generation workflow with a server-side provider boundary.
- `/contribute` provides a development-only contribution workflow and editorial state transitions.
- `/verify` exposes Midnight configuration status and a selective-disclosure policy.
- The versioned Fastify API exposes health, radio read models, AI programme generation, submissions, and verification status.
- Shared TypeScript packages contain domain types, Zod validation, radio queue rules, AI adapters, and the Midnight integration boundary.
- Docker Compose runs isolated web, API, worker, PostgreSQL, Redis, and Icecast services with loopback-only web/API bindings; API startup applies the radio migrations.
- The worker discovers operator-managed media, applies deterministic queue/programme selection, streams through FFmpeg to private Icecast, persists broadcast sessions/events, and shuts down cleanly.
- Production media is discovered from the seven supplied MP3 files in `media/music/`; FFmpeg uses their probed durations for track transitions and Icecast source metadata identifies `BlockTek Radio`.
- The public HTTPS stream at `/stream` proxies privately to Icecast `/live`; the public API reports the same canonical listener URL and current persisted broadcast item.
- The production CORS policy allows the exact Vercel origin for API and stream requests; no server credentials are exposed to the browser.
- Empty or invalid media does not produce a false `LIVE` state. Operators can explicitly enable a generated 440 Hz test tone for internal stream checks.

## Architecture

```mermaid
flowchart TD
    Listener --> Web[Next.js web]
    Web --> API[Fastify API /api/v1]
    API --> Radio[Radio domain]
    API --> AI[AI provider adapter]
    API --> Midnight[Midnight adapter]
    API --> DB[(PostgreSQL)]
    API -. optional .-> Redis[(Redis)]
    Worker --> Scheduler[Deterministic scheduler]
    Scheduler --> Queue[Queue / media selection]
    Queue --> FFmpeg[FFmpeg audio process]
    FFmpeg --> Icecast[Private Icecast]
    Worker --> Broadcast[(PostgreSQL sessions/events)]
    API --> Broadcast
    AI --> Provider[Configured provider]
    Midnight --> Proof[Compact proof verifier]
```

The web client owns presentation and interaction. API routes own validation, orchestration, authorization boundaries, and integration status. Domain packages contain reusable rules and schemas. The API selects a PostgreSQL repository when `DATABASE_URL` is configured and otherwise uses a clearly bounded in-memory development repository. Redis is provisioned but optional; it is not the durable source of radio state.

### Core Data Flow

```text
Listen -> Discover -> AI DJ request -> Validated programme
  -> Private contribution -> Eligibility proof -> Selective disclosure
  -> Editorial review -> Approved broadcast -> Listen
```

The first radio read model is:

```text
Station -> Channel -> Programme -> Queue -> Now Playing
```

Media and streams remain off-chain. AI providers are selected server-side and must return schema-validated data. Midnight is an adapter boundary that cannot verify a proof until a real Compact contract and verifier are configured. Private contributor intake requires authentication, encryption, rate limits, durable storage, access control, retention rules, and metadata minimization before production enablement.

## Structure

```text
app/                       Next.js routes
components/                Web presentation and product consoles
apps/api/                  Fastify API
apps/worker/               Deterministic scheduler and FFmpeg broadcast worker
packages/types/            Shared schemas and domain types
packages/radio-core/       Playlist and queue rules
packages/ai/               AI provider abstraction
packages/midnight/         Midnight adapter boundary
contracts/midnight/        Compact integration boundary
infrastructure/docker/     Production container definitions
infrastructure/nginx/      BlockTek reverse-proxy configuration and disabled template
media/                     Operator-managed audio mount; media is not committed
```

## Local Development

```bash
pnpm install
cp .env.example .env
pnpm dev
pnpm dev:api
```

Open `http://localhost:3000`. The API is available at `http://localhost:4000`. Without a configured public API or stream, the web application deliberately displays `API UNAVAILABLE` or `NOT CONFIGURED`.

## Environment Variables

See `.env.example`. Browser-safe configuration is limited to `NEXT_PUBLIC_API_BASE_URL`. Provider keys, database URLs, authentication secrets, Midnight URLs, and stream configuration are server-side only.

## Broadcast configuration and Docker

The production-shaped Compose project is named `blocktek-radio` and uses `blocktek-radio-network`. Web and API bind only to loopback ports `3010` and `4010`; PostgreSQL, Redis, Icecast, and the worker remain private to the BlockTek network.

```bash
cp .env.example .env
chmod 600 .env
docker compose config
docker compose up -d --build
docker compose ps
```

To enable broadcasting, set `RADIO_BROADCAST_ENABLED=true`, provide Icecast source credentials, set `RADIO_PUBLIC_STREAM_URL`, and place owned/licensed audio below `media/`. For an internal no-copyright test, also set `RADIO_TEST_TONE_ENABLED=true`. Keep the test tone disabled in production.

Media is mounted from the dedicated BlockTek path `/opt/blocktek-radio/media` and organized as:

```text
media/{music,programmes,podcasts,jingles,fallback,generated}/
```

The worker scans supported files in deterministic filename order, loops the FFmpeg playlist continuously, and uses fallback media when the scheduled queue has no playable item. Missing media produces `NO MEDIA CONFIGURED` and leaves the station offline.

`docker-compose.dev.yml` starts only project-scoped PostgreSQL and Redis for local dependency work. Only BlockTek-owned database, Redis, provider, stream, authentication, Icecast, and Midnight configuration belongs in `.env`.

## Production URLs and operations

The verified production topology is:

```text
https://blockteck-radio.vercel.app/
        -> https://blocktek-radio.duckdns.org/api/v1/...
        -> 127.0.0.1:4010 -> Fastify API

https://blocktek-radio.duckdns.org/stream
        -> 127.0.0.1:8000/live -> private Docker Icecast
```

The canonical public stream URL is `https://blocktek-radio.duckdns.org/stream`; the internal Icecast mount remains `/live`. The BlockTek Compose services are `web`, `api`, `worker`, `postgres`, `redis`, and `icecast`. Web, API, and Icecast publish only loopback ports `3010`, `4010`, and `8000`; PostgreSQL and Redis have no host port publication.

Production configuration uses `NEXT_PUBLIC_API_BASE_URL=https://blocktek-radio.duckdns.org` (the existing client convention expects an origin and appends `/api/v1/...`), `WEB_BASE_URL=https://blockteck-radio.vercel.app`, `RADIO_PUBLIC_STREAM_URL=https://blocktek-radio.duckdns.org/stream`, `RADIO_STREAM_ENABLED=true`, and `RADIO_BROADCAST_ENABLED=true`. `ICECAST_CORS_ORIGIN` is restricted to the Vercel origin. Secret values remain only in the root `.env`, which must stay mode `0600` and must never be committed.

The dedicated Nginx file is `infrastructure/nginx/blocktek-radio.duckdns.org.conf`. It redirects HTTP to HTTPS, serves the ACME challenge, proxies `/api/` to Fastify, proxies only `/stream` to Icecast `/live`, and sends other website traffic to the local Next.js service. PostgreSQL, Redis, and Icecast administration are not public routes. The VPS certificate is issued by Let's Encrypt and is renewed by Certbot.

Useful operator commands:

```bash
chmod 600 .env
docker compose config
docker compose up -d --build
docker compose ps
docker compose logs --tail=100 worker icecast api
curl -fsS https://blocktek-radio.duckdns.org/api/v1/health
curl -fsS https://blocktek-radio.duckdns.org/api/v1/radio/status
curl -fsS https://blocktek-radio.duckdns.org/api/v1/radio/now-playing
```

For controlled recovery, restart only the affected BlockTek service: `docker compose restart worker` or `docker compose restart icecast`. The worker is configured to exit when FFmpeg loses Icecast so Docker can restart it and establish a fresh persisted session. If the stream is `OFFLINE`, first check `docker compose ps`, worker/Icecast logs, the media bind path, and `RADIO_BROADCAST_ENABLED`; never enable the test tone as a production substitute for real media.

## Tests and API

```bash
pnpm test
pnpm build:api
pnpm build
```

All application routes are versioned under `/api/v1`.

Endpoints currently include:

- `GET /api/v1/health`
- `GET /api/v1/health/ready`
- `GET /api/v1/radio/stations`
- `GET /api/v1/radio/channels`
- `GET /api/v1/radio/now-playing`
- `GET /api/v1/radio/status`
- `GET /api/v1/radio/stream`
- `GET /api/v1/radio/queue`
- `GET /api/v1/radio/programmes`
- `GET /api/v1/radio/schedule`
- `POST /api/v1/ai/programmes`
- `POST /api/v1/submissions`
- `GET /api/v1/submissions/:id`
- `POST /api/v1/submissions/:id/transitions`
- `GET /api/v1/midnight/status`
- `GET /api/v1/verification/disclosure`

`/api/v1/radio/status` reports configured, reachable, worker, Icecast, listener, and current-item state without returning passwords or source credentials. `LIVE` requires a configured reachable listener stream; `OFFLINE`, `CONNECTING`, and `NOT_CONFIGURED` remain explicit states.

## Security Model

The contribution flow is development-only and currently lacks authentication, encryption, evidence storage, rate limiting, and durable persistence. Do not submit real sensitive information. The intended disclosure policy reveals eligibility only and hides name, email, location, wallet, organisation, and other identity fields. Editorial review remains a human-controlled boundary for allegations, moderation, and approval to broadcast.

Icecast source, admin, relay, database, Redis, and provider credentials are server-side only. The browser receives only the public listener URL and API read models. Icecast is not directly public: the route is `radio domain -> Nginx -> private Icecast`, with the API routed separately. API CORS is limited to `https://blockteck-radio.vercel.app`; the stream response uses the same exact origin rather than a wildcard.

## Deployment

BlockTek Radio runs as an isolated application stack on a shared VPS. Docker Compose uses its own project/network namespace, loopback-only web/API/Icecast bindings, bounded worker/Icecast resources, and private PostgreSQL/Redis services without reusing existing tenant-owned dependencies. `blocktek-radio.duckdns.org` resolves to `89.116.31.3`, and the dedicated Nginx virtual host terminates the Let's Encrypt certificate and provides the API/stream routes. The Vercel production environment contains only the public `NEXT_PUBLIC_API_BASE_URL` value.

## Roadmap

### Completed: Phases 0, 0.5, 1, and 1B

Foundation, isolated VPS/Compose boundaries, PostgreSQL radio persistence, schedule/queue APIs, native browser playback, private Icecast, FFmpeg continuous audio, deterministic scheduling, filesystem media management, fallback/test tone, duration-aware real-media transitions, durable broadcast sessions/events, health/readiness reporting, public Nginx/TLS routing, Vercel API configuration, and real now-playing synchronization are implemented and externally verified.

### Next: Phase 1 operational hardening

Add operator-supplied fallback/jingle audio to the currently empty fallback directories, formalize backups and log retention, and add external uptime/stream monitoring. The primary seven-file licensed/project-owned music library is already active. Keep browser Play verification in the release checklist after frontend changes.

### Phase 2: AI DJ & Intelligent Programming

The AI pipeline is `bounded broadcast context -> ASI Cloud -> Groq fallback -> strict JSON/schema validation -> media allowlist/cooldown policy -> PostgreSQL decision and queue -> worker -> FFmpeg -> private Icecast`. Provider keys remain server-side and are never returned by the API. The primary environment names are `ASI_CLOUD_BASE_URL`, `ASI_CLOUD_CHAT_MODEL`, `ASI_CLOUD_API_KEY2`; fallback uses `GROQ_API_KEY` and `GROQ_MODEL`.

Programming modes are `DETERMINISTIC`, `AI_ASSISTED`, and `AI_PROGRAMMED`. All modes retain deterministic eligibility, duplicate, cooldown, duration, and fallback rules. AI generates bounded multi-track windows rather than controlling FFmpeg or executing tools. The `ai_programming_decisions` table stores structured proposal metadata, provider/model, validation status, fallback reason, explanation, context hash, and latency. Accepted items are inserted into `ai_programming_queue`; the BlockTek worker claims those items before deterministic media and marks them played. If both providers fail, the worker continues with the normal catalogue loop.

The `/ai-dj` route reports actual API state and labels fallback/demo output. The API exposes `GET /api/v1/ai/status`, `POST /api/v1/ai/playlist`, `POST /api/v1/ai/programmes`, `GET /api/v1/ai/decisions`, and `GET /api/v1/ai/decisions/:id`. Generated DJ text/TTS is not required for the core broadcast and no fake audio is produced. Full Midnight/ZK eligibility and selective disclosure remain Phase 3 work.

### Phase 3: Midnight Privacy

Add wallet integration, a Compact eligibility contract, proof creation and verification, contributor credentials, and selective disclosure.

### Phase 4: Whistleblower Workflow

Add encrypted evidence, private submissions, verification, editorial states, moderation, audit logs, and approval-to-broadcast integration.

### Phase 5: Autonomous Radio

Add AI scheduling, listener preferences, curation, intelligent transitions, and a live AI DJ with human override.

### Phase 6: Midnight Ecosystem

Explore Midnight-native deployment, Midnight City integration, in-world radio, agent interactions, and a contributor ecosystem without making those dependencies for the MVP.

## Contribution and License

Keep API and domain logic outside UI components, validate external data, preserve real-versus-development status labels, and add tests for stateful or security-sensitive behavior. Changes that enable real intake, sending, broadcasting, provider calls, or blockchain transactions require explicit configuration and review.

## License

The original product specification identifies the project as MIT-licensed. Add the root `LICENSE` file before treating the public repository as formally licensed.
