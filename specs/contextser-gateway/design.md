# Contextser Gateway — Design

Status: draft for review · Written: 2026-10-29

This document specifies the service that gives Context Code users access to models: per-user authentication, three
product tiers on one upstream model, rate limits, metering and credits, and remote delivery of the system prompt and
skills. Everything here runs on **one VPS**.

Every statement about Context Code or accounts.contextser.com in §2–§3 was checked against the code (paths given) or
the live service on the date above. Anything not verified is listed as an **open decision** in §5 and must be resolved
before the part that depends on it is built. Numbers that depend on real traffic are given as formulas plus a load test
(§15), not as estimates.

---

## 1. Goals and constraints

**Goals**

1. Serve Context Code's model traffic for up to 10,000 registered users.
2. Show users three models — **Context Neo** (low), **Context Spark** (medium), **Context Apex** (high) — backed by one
   upstream model, with tier settings changeable without an app release.
3. Per-user authentication, rate limits, usage metering and prepaid credits.
4. Change the system prompt and skills without an app release.

**Constraints**

- Runs entirely on one VPS. The VPS is the only infrastructure cost introduced by this design.
- Lightweight and low-maintenance: few processes, few dependencies, no protocol translation.

**Costs that exist regardless of this design** (listed so nothing is hidden):

- Model usage billed per token by the upstream provider (§5, O1). This is the cost of selling model access, not
  infrastructure.
- The domain `contextser.com`, already owned. The gateway needs one DNS record.
- accounts.contextser.com, an existing service this design depends on over HTTPS and does not change (§3).

**Non-goals for the first release**

- Translating between provider protocols (Anthropic or Gemini native APIs).
- Image, audio or embedding endpoints.
- Per-tier agent behaviour (step limits, subagents). This needs an app change; see §19.
- An admin web UI. Admin actions are CLI commands over SSH (§13.5).
- Failover across machines. A single VPS is a single point of failure, and that is accepted (§16).

---

## 2. What Context Code does today (verified)

The gateway must satisfy these behaviours exactly. Paths are relative to the `contextcode` repository.

| # | Behaviour | Source |
|---|---|---|
| C1 | Models come from the `contextser` provider plugin. Its default origin is `http://localhost:20128`. The base URL is `origin + "/v1"` unless `providers.contextser.settings.baseURL` is set in config. | `packages/core/src/plugin/provider/contextser.ts`, `local.ts` `configured()` |
| C2 | The API key is read **only** from config `providers.contextser.settings.apiKey` and sent as `Authorization: Bearer <key>` on discovery and chat requests. | `local.ts` `configured()`, `createClient()`; `packages/ai/src/providers/openai-compatible.ts` (`AuthOptions.bearer`) |
| C3 | Discovery is `GET {base}/models` expecting `{ data: [{ id, owned_by?, capabilities?: { vision?, tools?, contextWindow?, maxOutput? }, context_length?, max_completion_tokens? }] }`. The display name is the `id` with an `owned_by + "/"` prefix removed. `tools` defaults to `true`. | `contextser.ts` |
| C4 | Every running app repeats discovery every **30 s** (`make()` default `interval = "30 seconds"`, `Schedule.spaced(interval)`). Each discovery call times out after **1 s**. On failure the last inventory is kept. With no inventory, the provider contributes no models. | `local.ts` |
| C5 | Chat is `POST {base}/chat/completions`, always `stream: true`, with `stream_options: { include_usage: true }` unless a model's compatibility settings turn it off. | `packages/ai/src/protocols/openai-compatible-chat.ts`; `openai-chat.ts` (request builder, `stream: true`, `stream_options`) |
| C6 | For provider `contextser` on a URL that is not in the known list, the app sends `max_completion_tokens`, not `max_tokens`. | `openai-chat.ts` `detectMaxTokensField` |
| C7 | From responses the app reads `prompt_tokens`, `completion_tokens`, `prompt_tokens_details.cached_tokens`, `completion_tokens_details.reasoning_tokens`, and reasoning text from `reasoning_content`. | `openai-chat.ts` response schema |
| C8 | Each agent step is one streamed call that re-sends the conversation history. | `AGENTS.md`, "Session Core" |
| C9 | HTTP errors are classified as follows. **402** means quota exceeded and is not retried. **401/403** mean an authentication error and are not retried. **429** is a rate limit: retried, honouring `retry-after-ms` or `retry-after`. **5xx/408/409** are provider errors and are retried. **413** means payload too large. Bodies with `context_length_exceeded` mean context overflow. Any other 4xx is an invalid request. A response header `x-should-retry: true\|false` overrides the retry decision. | `packages/ai/src/provider-error.ts` (`classifyProviderFailure`, `isRetryable`); `packages/ai/src/route/executor.ts` |
| C10 | Config `instructions` entries that are `http(s)` URLs are fetched when config loads. A failed fetch keeps the last good copy or skips the URL. | `packages/core/src/config/plugin/instruction.ts` |
| C11 | Config `skills` entries that are `http(s)` URLs are pulled as follows. The app fetches `<url>/index.json`, shaped `{ skills: [{ name, version?, files: string[] }] }`. A skill is skipped unless its `files` include `SKILL.md` or `<name>.md`. Files must be on the same origin. They are cached locally and downloaded again when `version` changes. Requests are plain GETs with no auth header. | `packages/core/src/skill/discovery.ts`, `config/plugin/skill.ts` |
| C12 | The legacy `small_model` maps to `agents.title.model`, so session titles also call a model. | `packages/core/src/config/normalize.ts` |
| C13 | `PATCH /api/experimental/config` accepts only `shell`. `POST /api/credential` stores integration credentials, but the `contextser` plugin does not read them: it removes its integration once models load. | `packages/schema/src/config.ts` (`Patch`); `packages/protocol/src/groups/credential.ts`; `local.ts` |
| C14 | Desktop sign-in runs in the desktop main process. It uses OAuth with PKCE and a loopback redirect against accounts.contextser.com, as a public client. It stores tokens encrypted and refreshes them single-flight, because refresh tokens rotate. | `packages/desktop/src/main/account/contextser.ts` |
| C15 | Today the upstream used through `contextser` is `river1/deepseek-ai/DeepSeek-V4.1-Flash-1017`, reached through a 9router on the developer's machine. Tool calling works on this path in current use. | local 9router `/v1/models` listing |

---

## 3. What accounts.contextser.com provides (verified)

| # | Fact | Source |
|---|---|---|
| A1 | The live OIDC discovery document at `https://accounts.contextser.com/api/.well-known/openid-configuration` lists the issuer `https://accounts.contextser.com`, `id_token_signing_alg_values_supported: ["EdDSA"]`, and `jwks_uri` `…/api/.well-known/jwks.json`. It also lists `userinfo_endpoint` `…/api/userinfo` and `revocation_endpoint` `…/api/oauth/revoke`. | fetched 2026-10-29 |
| A2 | Refresh tokens last 60 days and rotate; a replayed one revokes the chain. Access tokens are short-lived (code comments say ten minutes), and clients take the exact lifetime from `expires_in`. | accounts `src/lib/oauth/refresh.ts`, `src/server/app.ts` |
| A3 | Accounts delivers signed JWT events to a client's configured event endpoint. Events carry `aud` = client id and `sub`, plus optional `sid` and an `events` claim. Types are `http://schemas.openid.net/event/backchannel-logout` and `https://contextser.com/event/user-updated`. Missed events can be replayed with `GET /api/events?since=<seq>`. | accounts `src/lib/oauth/events.ts` |
| A4 | Context Code's live client is a public client with the loopback callback `http://127.0.0.1:47823/callback`. | admin configuration, 2026-10-29 |

The gateway uses only A1's userinfo endpoint and JWKS, plus A3's events. It never reads accounts' database.

---

## 4. Decisions

| ID | Decision | Why |
|---|---|---|
| D1 | One VPS runs Caddy, two identical gateway processes and PostgreSQL, under Docker Compose. There is no Redis. | Every piece of shared state (rate windows, active streams, balances) fits in indexed PostgreSQL rows. That leaves one stateful service to back up and upgrade. |
| D2 | The gateway is an OpenAI-compatible **pass-through**. It rewrites only the request fields listed in §8 and never rewrites response bytes. | The app and the upstream both speak OpenAI Chat Completions (C5). Not translating removes the largest source of bugs in model gateways. |
| D3 | The app authenticates to the gateway with an opaque per-device key, minted once after sign-in (§7.3). It never sends the accounts access token on model requests. | Desktop main stays the only holder of the rotating refresh token (C14), so there is no double-refresh revocation. Core already sends a static bearer key (C2). Accounts is called once per device sign-in, not once per request. Keys are revocable per device. |
| D4 | When a key is minted, the access token is verified by calling accounts `GET /api/userinfo` with it. | This needs no JWT handling on this path and honours grant revocation, since userinfo refuses revoked grants. It runs once per sign-in. |
| D5 | Tiers live in PostgreSQL. `/v1/models` and request mapping read an in-memory snapshot that is reloaded every `CATALOG_REFRESH_SECONDS`. | Tier changes take effect without a restart or app release. Discovery answers from memory, well inside the app's 1 s timeout (C4). |
| D6 | Caddy serves the system prompt and skills as static files from the VPS. The app consumes them through its existing remote `instructions` and `skills` support (C10, C11). | No new code. They are **public** URLs, because the app fetches them without auth, so they must contain nothing secret. |
| D7 | Credits are an append-only ledger plus a balance row, debited once per request from the usage the upstream reports, idempotently by request id. | Exactly-once charging survives retries and restarts. |
| D8 | The runtime is Bun with its built-in PostgreSQL client (`Bun.sql`) and Hono, the only third-party runtime dependency. The SSE usage parser is in-house (around 40 lines, unit tested). | Few dependencies means few upgrades and few supply-chain risks. If `Bun.sql` shows a defect, swap it for `postgres` (porsager) behind the same small `db` module. |

---

## 5. Open decisions (resolve before building the dependent part)

| ID | Question | Blocks |
|---|---|---|
| O1 | **Upstream.** Which OpenAI-compatible endpoint serves the model from the VPS? Today it is 9router → `river1` on a developer machine (C15). Options: (a) a provider's API with a commercial key; (b) 9router on the VPS using **API-key providers only**. In both cases, confirm the provider's terms allow reselling access. | M1 |
| O2 | **Tier knobs.** Which request fields does the chosen upstream honour for thinking and effort (for example `reasoning_effort`, `thinking`, `enable_thinking`)? What are the model's real context window and maximum output? Does `completion_tokens` include reasoning tokens? Answer with the Phase-0 test in §18. | tier rows, pricing |
| O3 | **Pricing.** Credits per 1M input, cached-input and output tokens per tier. Is there a free allowance? How do credits map to the payment currency? | M2 |
| O4 | **Aborted streams.** If a stream ends without a usage chunk, either (a) charge nothing, or (b) charge an estimate. Option (b) needs a calibrated estimator, because the upstream may still bill the request. | M2 |
| O5 | **Top-ups.** How does payments.contextser.com tell the gateway a payment succeeded? §7.7 proposes the shape; the payments side is not designed yet. | M5 |
| O6 | **Default app config.** How do shipped builds set `baseURL`, the default model, `agents.title.model`, `instructions` and `skills`: built-in defaults, or a config file written on first run? | M3 |
| O7 | **Hostname,** for example `api.contextser.com`. Only a DNS record is needed. | M4 |

---

## 6. Architecture

```
Context Code (desktop)
  core ── POST /v1/chat/completions, GET /v1/models ── Bearer ctxk_… (device key)
  core ── GET /instructions/*.md, /skills/index.json (public, static)
  desktop main ── POST /v1/auth/device-keys (Bearer <accounts access token>), once per sign-in
        │
        ▼  HTTPS
┌──────────────────────────── one VPS ─────────────────────────────┐
│ Caddy :443  TLS (Let's Encrypt), static files, reverse proxy,    │
│             health-checked load balancing, no response buffering │
│   ├── gateway-a (Bun + Hono)  ─┐                                 │
│   └── gateway-b (Bun + Hono)  ─┼── PostgreSQL (Docker network    │
│                                │   only, volume on local disk)   │
│ backup job: nightly pg_dump to /var/backups (rotated)            │
└──────────────────────────────────┬───────────────────────────────┘
                                   │ HTTPS
              upstream model API (O1)      accounts.contextser.com (userinfo, JWKS, events)
```

Each gateway process runs three things beside request handling:

- a catalog refresher (D5);
- a cleanup job that removes expired rate windows and stale active-stream leases (§10);
- a JWKS cache for verifying events (§7.6).

---

## 7. HTTP API

All JSON errors use the OpenAI error shape, `{"error":{"message","type","code"}}`, so the app's classifier (C9) can read
the codes.

### 7.1 `GET /v1/models`

- Auth: device key.
- Response 200, from memory:

```json
{
  "object": "list",
  "data": [
    {
      "id": "context-spark",
      "object": "model",
      "owned_by": "contextser",
      "name": "Context Spark",
      "capabilities": { "tools": true, "vision": false, "contextWindow": 0, "maxOutput": 0 }
    }
  ]
}
```

- `contextWindow` and `maxOutput` come from the tier row and must match the upstream's real limits (O2). `vision` stays
  `false` unless verified for the upstream model.
- `name` is ignored by the current app, which derives names from `id` (C3). App change A3 makes the app use it.
- `Cache-Control: private, max-age=30`.

### 7.2 `POST /v1/chat/completions`

- Auth: device key. The body is an OpenAI chat request whose `model` is a tier id.
- The response passes the upstream's SSE bytes through unchanged, plus an `x-request-id` header.
- Processing is in §8.

### 7.3 `POST /v1/auth/device-keys`

- Auth: `Authorization: Bearer <accounts access token>`.
- Body: `{ "device_name": string }`, up to 120 characters.
- Steps:
  1. Call `GET https://accounts.contextser.com/api/userinfo` with the same bearer token. Anything but 200 returns 401.
  2. Upsert `users(sub, email)`.
  3. Refuse with 409 if the user already has `MAX_KEYS_PER_USER` active keys.
  4. Create the key: `ctxk_` + 32 random bytes in base64url. Store only its SHA-256 and the first 12 characters as `prefix`.
- Response 201: `{ "key": "ctxk_…", "id": "…", "created_at": "…" }`. The key is returned only once.
- Rate-limited per IP and per `sub` (§10).

### 7.4 `DELETE /v1/auth/device-keys/current`

Revokes the key used for this request. Returns 204.

### 7.5 `GET /v1/account`

Device key auth. Returns `{ balance, currency_unit, tiers: [ids the user may use], usage_this_month }`. Used by app
change A7.

### 7.6 `POST /v1/accounts/events`

This is Context Code's event endpoint, configured on its client in the accounts admin panel.

- The body is a JWT. Verify it with the JWKS (A1): EdDSA, `iss` = `https://accounts.contextser.com`, `aud` = Context
  Code's client id.
- Reject a reused `jti`: keep seen `jti`s for 24 h.
- `backchannel-logout` revokes all active device keys of `sub`. Refining this to one device using `sid` is later work
  (§19).
- `user-updated` refreshes `users.email`.
- Respond 200 quickly. To catch up after downtime, a CLI command calls `GET /api/events?since=<last seq>` (A3).

### 7.7 `POST /internal/credits` (proposal, depends on O5)

- Called by payments. The body `{ payment_id, sub, amount, unit }` is signed with HMAC-SHA256 using a shared secret,
  sent in `x-signature`.
- Idempotent on `payment_id`.
- Not exposed publicly unless signed. Caddy can restrict the source IP.

### 7.8 Operations

- `GET /healthz` reports process and DB status. It returns 503 while draining (§11).
- `GET /metrics` serves Prometheus text format and is bound to localhost.

### 7.9 Static content (Caddy `file_server`, no gateway code)

- `/instructions/context-code.md`
- `/skills/index.json`, plus `/skills/<name>/SKILL.md` and that skill's other files (format C11)

The content lives in a git repository checked out at `/srv/content` and deployed with `git pull`. Bump a skill's
`version` in `index.json` to make clients download it again.

---

## 8. Chat request pipeline

1. **Auth.** Hash the bearer value and look up `device_keys`, with an in-process cache of up to
   `KEY_CACHE_SECONDS`, so revocation takes effect within that many seconds. Unknown or revoked keys return 401.
2. **Size.** Caddy's `request_body max_size` rejects oversized bodies with 413, which the app classifies as payload
   too large (C9).
3. **Tier.** Parse the JSON and find `model` in the catalog snapshot. Unknown or disabled tiers return 404
   `model_not_found`. A tier the user's plan excludes returns 403 `tier_not_allowed`.
4. **Limits.** Check requests per minute and concurrent streams (§10). Over either limit returns 429 with `retry-after`
   (seconds) and `retry-after-ms`.
5. **Balance.** If `balance <= 0`, return 402 with code `insufficient_quota`. The app classifies this as quota exceeded
   and does not retry (C9).
6. **Rewrite** (only these changes):
   - Set `model` to the tier's `upstream_model`.
   - Read the requested output limit from `max_completion_tokens`, or else `max_tokens`. Send
     `min(requested, tier.max_output)` in the field the upstream expects (`upstreams.max_tokens_field`), and remove the
     other field.
   - Delete every field listed in `tier.locked_fields` (thinking and effort fields), then merge `tier.overrides`.
   - Set `stream_options.include_usage = true`.
7. **Upstream call.** Open a `fetch` whose `AbortController` is aborted when the client disconnects (`request.signal`).
   Timeouts, all configurable: connect, time to first byte, and idle time between chunks. A timeout returns 504.
8. **Upstream errors**, before any byte is sent to the client:
   - **429**: return 429, copying `retry-after` and `retry-after-ms`.
   - **400/413/422**: return the same status and body, so context-overflow detection works (C9).
   - **401/403**: this is our upstream credential failing, not the user's. Return 502 with `x-should-retry: false`, and
     alert.
   - **5xx or a network error**: return 502. The app retries it (C9).
9. **Success.** Return `new Response(stream)` at once. The upstream body is `tee()`d:
   - one branch goes to the client unchanged;
   - the other goes to the SSE parser, which keeps only the last `usage` object.

   Nothing is buffered beyond what the runtime holds in flight.
10. **Settle** when the stream ends or aborts (§9). Then remove the active-stream lease (§10).

The gateway never logs request or response bodies. It logs `request_id`, user id, tier, status, byte counts, token
counts and timings.

---

## 9. Metering and credits

### 9.1 Cost

All amounts are integers in micro-credits. Prices are per 1M tokens and come from the tier row (O3).

```
cost = ceil((prompt − cached) × price_in + cached × price_cached + completion × price_out) / 1e6
```

Whether `completion` already includes reasoning tokens depends on the upstream (O2). The formula uses the field as
reported.

### 9.2 Settlement (one transaction)

1. `INSERT INTO usage … ON CONFLICT (request_id) DO NOTHING RETURNING request_id`.
2. If that inserted a row and `cost > 0`:
   - `INSERT INTO ledger (ref = 'usage:' || request_id, delta = −cost)`;
   - `UPDATE balances SET balance = balance − cost`.

`ledger.ref` is unique, so a retried settlement cannot charge twice.

### 9.3 Overdraft bound

A request is admitted while `balance > 0` (§8 step 5). The largest possible overdraft is therefore the cost of one
request. Its output side is capped by `tier.max_output`.

### 9.4 Missing usage

A stream that ends without a usage chunk is recorded with `status = 'no_usage'` and charged according to O4.

### 9.5 Top-ups

Top-ups arrive through §7.7. Grants and corrections use the admin CLI (§13.5). Every change to a balance is a ledger
row.

---

## 10. Rate limits and concurrency (PostgreSQL)

The limit values are product decisions. They are stored in the `plans` table, not in code.

### 10.1 Requests per minute

```sql
INSERT INTO rl_window (scope, window_start, count) VALUES ('u:' || $1, date_trunc('minute', now()), 1)
ON CONFLICT (scope, window_start) DO UPDATE SET count = rl_window.count + 1
RETURNING count;
```

Reject when the count exceeds the plan limit. The cleanup job deletes windows older than 2 minutes.

### 10.2 Concurrent streams

In one transaction, holding `pg_advisory_xact_lock(hashtext(user_id))`:

1. Count `active_streams` rows for the user with `expires_at > now()`.
2. Insert `(request_id, user_id, expires_at = now() + LEASE)` if the count is under the limit.

A long stream extends its lease every `LEASE/2`. The row is deleted when the stream ends. If a process crashes, its
leases simply expire.

### 10.3 Key minting

Device-key minting uses the same window table with a separate scope key: per IP and per `sub`.

---

## 11. Streaming and deploy correctness

- **No buffering.** Caddy uses `reverse_proxy … { flush_interval -1 }`. The gateway returns the stream object
  directly.
- **Cancellation.** When the client disconnects, the upstream call is aborted (§8 step 7), so we stop paying for output
  nobody reads.
- **Graceful shutdown.** On SIGTERM:
  1. `/healthz` returns 503, so Caddy stops routing to this process.
  2. The process stops accepting new requests.
  3. It waits for active streams up to `DRAIN_SECONDS`, then exits.
- **Zero-downtime deploy.** Restart `gateway-a`, wait until it is healthy, then restart `gateway-b`. Caddy's active
  health checks move traffic between them.

---

## 12. Data model (PostgreSQL)

```sql
CREATE TABLE users (
  sub        text PRIMARY KEY,               -- accounts subject
  email      text,
  plan_id    text NOT NULL DEFAULT 'default' REFERENCES plans(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE device_keys (
  id           text PRIMARY KEY,
  user_sub     text NOT NULL REFERENCES users(sub),
  key_hash     bytea NOT NULL UNIQUE,          -- sha256(key)
  prefix       text NOT NULL,                  -- first 12 chars, for support
  device_name  text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz,
  revoked_at   timestamptz
);
CREATE INDEX ON device_keys (user_sub) WHERE revoked_at IS NULL;

CREATE TABLE plans (
  id                  text PRIMARY KEY,
  tiers               text[] NOT NULL,          -- tier ids allowed
  rpm                 integer NOT NULL,
  max_concurrent      integer NOT NULL
);

CREATE TABLE upstreams (
  id                text PRIMARY KEY,
  base_url          text NOT NULL,             -- OpenAI-compatible, e.g. https://…/v1
  api_key_env       text NOT NULL,             -- name of the env var holding the key (secret stays out of the DB)
  max_tokens_field  text NOT NULL CHECK (max_tokens_field IN ('max_tokens','max_completion_tokens'))
);

CREATE TABLE tiers (
  id               text PRIMARY KEY,           -- 'context-neo' | 'context-spark' | 'context-apex'
  name             text NOT NULL,              -- 'Context Neo'
  upstream_id      text NOT NULL REFERENCES upstreams(id),
  upstream_model   text NOT NULL,
  overrides        jsonb NOT NULL DEFAULT '{}',   -- merged into the request (O2)
  locked_fields    text[] NOT NULL DEFAULT '{}',  -- removed from the client request first
  max_output       integer NOT NULL,
  context_window   integer NOT NULL,
  vision           boolean NOT NULL DEFAULT false,
  price_in         bigint NOT NULL,            -- micro-credits per 1M tokens
  price_cached     bigint NOT NULL,
  price_out        bigint NOT NULL,
  enabled          boolean NOT NULL DEFAULT true,
  sort             integer NOT NULL DEFAULT 0
);

CREATE TABLE balances (
  user_sub   text PRIMARY KEY REFERENCES users(sub),
  balance    bigint NOT NULL DEFAULT 0,        -- micro-credits
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE ledger (
  id         bigserial PRIMARY KEY,
  user_sub   text NOT NULL REFERENCES users(sub),
  delta      bigint NOT NULL,
  reason     text NOT NULL CHECK (reason IN ('usage','topup','grant','adjust')),
  ref        text NOT NULL UNIQUE,             -- 'usage:<request_id>' | 'payment:<id>' | 'admin:<id>'
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE usage (
  request_id        text PRIMARY KEY,
  user_sub          text NOT NULL,
  key_id            text NOT NULL,
  tier_id           text NOT NULL,
  prompt_tokens     integer, cached_tokens integer,
  completion_tokens integer, reasoning_tokens integer,
  cost              bigint NOT NULL DEFAULT 0,
  status            text NOT NULL CHECK (status IN ('complete','aborted','no_usage','upstream_error')),
  request_bytes     integer, response_bytes integer,
  ttfb_ms           integer, duration_ms integer,
  started_at        timestamptz NOT NULL
);
CREATE INDEX ON usage (user_sub, started_at);

CREATE TABLE rl_window (
  scope        text NOT NULL,                  -- 'u:<sub>' | 'ip:<addr>' | 'mint:<sub>'
  window_start timestamptz NOT NULL,
  count        integer NOT NULL,
  PRIMARY KEY (scope, window_start)
);

CREATE TABLE active_streams (
  request_id text PRIMARY KEY,
  user_sub   text NOT NULL,
  expires_at timestamptz NOT NULL
);
CREATE INDEX ON active_streams (user_sub, expires_at);

CREATE TABLE seen_jti (jti text PRIMARY KEY, seen_at timestamptz NOT NULL DEFAULT now());
```

`plans` must be created before `users`, and the first migration seeds a `default` plan row, because
`users.plan_id` defaults to it. Migrations are plain numbered SQL files applied by `bun run migrate`, which
records each one in a `schema_migrations` table.

Upstream secrets live only in the environment file. `upstreams.api_key_env` names the variable.

---

## 13. Deployment on one VPS

### 13.1 Host

- An Ubuntu LTS release with SSH key-only login.
- `ufw` allows only 22, 80 and 443. PostgreSQL is reachable only on the Docker network.
- `unattended-upgrades` handles security updates.
- Docker logs use the `json-file` driver with `max-size` and `max-file` set.

### 13.2 Compose services

`caddy`, `gateway-a`, `gateway-b`, `postgres` and `backup`.

- Images are pinned by version.
- `gateway-a` and `gateway-b` run the same image with different `INSTANCE` values.

### 13.3 Caddyfile sketch

```
api.contextser.com {
  header Strict-Transport-Security "max-age=31536000"
  request_body { max_size {$MAX_BODY} }
  handle_path /instructions/* { root * /srv/content/instructions; file_server }
  handle_path /skills/*       { root * /srv/content/skills; file_server }
  handle {
    reverse_proxy gateway-a:8080 gateway-b:8080 {
      flush_interval -1
      health_uri /healthz
      health_interval 5s
      lb_policy least_conn
    }
  }
}
```

### 13.4 Configuration

The environment file (`chmod 600`) holds:

- `DATABASE_URL`
- the upstream key variables named in `upstreams`
- `ACCOUNTS_ISSUER`
- `CONTEXT_CODE_CLIENT_ID`
- `CREDITS_HMAC_SECRET`
- timeouts: `CONNECT_TIMEOUT_MS`, `TTFB_TIMEOUT_MS`, `IDLE_TIMEOUT_MS`
- `DRAIN_SECONDS`, `KEY_CACHE_SECONDS`, `CATALOG_REFRESH_SECONDS`, `LEASE_SECONDS`, `MAX_KEYS_PER_USER`, `MAX_BODY`

### 13.5 Admin CLI (run over SSH, no HTTP surface)

```
bun run admin tier:set <id> --json tier.json
bun run admin plan:set <id> …
bun run admin credits:grant <sub> <amount> --ref <id>
bun run admin key:revoke <key-id | --user sub>
bun run admin events:replay
```

### 13.6 Backups (no paid storage)

- A nightly `pg_dump -Fc` to `/var/backups`, keeping `N` days.
- Copy dumps off the machine by pulling them over SSH (`rsync`) from a machine you already operate.
- Provider snapshots are used only if the VPS plan includes them.
- Run a restore drill monthly into a scratch database.

---

## 14. Context Code changes required

| ID | Change | Where |
|---|---|---|
| A1 | Point `contextser` at the gateway, through `providers.contextser.settings.baseURL` (already supported, C1) or a new default origin in shipped builds (O6). | `packages/core/src/plugin/provider/contextser.ts` or the default config |
| A2 | The `contextser` plugin reads its key from the Credential service when config has none. Desktop stores the key with `POST /api/credential`. The alternative is desktop editing the user's JSONC config file, which is not recommended because users edit that file too. | `packages/core/src/plugin/provider/local.ts` / `contextser.ts`; desktop main |
| A3 | Add an optional `name` to the plugin's remote model schema and use it as the display name. | `contextser.ts` |
| A4 | Call `make()` with a longer interval for `contextser`, such as 5 minutes, to cut discovery load (§15). The 1 s timeout (C4) still applies, so `/v1/models` must stay fast. | `contextser.ts` |
| A5 | Device-key lifecycle in desktop main. After sign-in: call `POST /v1/auth/device-keys` with the access token, then store the key (A2). On sign-out: call `DELETE /v1/auth/device-keys/current` and remove the credential. On a 401 from the gateway: treat the user as signed out. | `packages/desktop/src/main/account/contextser.ts`, `ipc-handlers/account.ts` |
| A6 | Default config (the hostname is a placeholder until O7): `model: contextser/context-spark`, `agents.title.model: contextser/context-neo`, `instructions: ["https://api.contextser.com/instructions/context-code.md"]`, `skills: ["https://api.contextser.com/skills/"]`. | per O6 |
| A7 (later) | Show the balance from `GET /v1/account`, and on 402 show a message that leads to top-up. | app UI |

---

## 15. Capacity planning: formulas, then measure

Let `A` be the number of app instances running at once, `R` the chat requests per month, and `S_req` and `S_resp` the
average request and response bytes.

- **Discovery load:** `A / interval` requests per second. That is `A/30` today, or `A/300` after A4.
- **Bandwidth per month:** about `R × (S_req + S_resp) × 2`. The factor 2 counts client↔gateway and gateway↔upstream.
  `S_req` grows with conversation length, because history is re-sent on every step (C8). Read `S_req` from
  `usage.request_bytes` after launch, and compare the total against the VPS plan's included transfer before choosing a
  plan.
- **Database writes per chat request:** one rate-window upsert, one lease insert and one delete, one settlement
  transaction, and periodic lease heartbeats.

**Load test before launch** (k6 against a mock upstream that streams at a fixed rate, injects errors and drops
connections):

| Check | Pass condition |
|---|---|
| Added time to first byte (gateway vs direct upstream) | p99 within the target the owner sets |
| `/v1/models` | p99 far below the app's 1 s timeout (C4) |
| Streams | none truncated or duplicated: byte-for-byte equal to the mock |
| Settlement | exactly one `usage` row and at most one ledger row per request |
| Client abort | upstream request cancelled |
| Resources at target concurrency and RPS | CPU and memory within the headroom the owner sets |

Pick the smallest VPS plan that passes at the target load with headroom. This document makes no claim about plan size
before the test.

---

## 16. Failure modes and runbook

| Failure | Effect | Response |
|---|---|---|
| Upstream down or erroring | 502s. The app retries (C9). | Alert on error rate. Check provider status. |
| Upstream credential rejected | 502 with `x-should-retry: false` | Rotate the key in the env file, then restart instances one at a time. |
| PostgreSQL down | 503 with `x-should-retry: true` | Restart the container, check the disk. |
| One gateway instance crashes | Caddy health check routes to the other. Leases expire. | Compose restart policy. |
| VPS down | All users down. This is the accepted single-VPS limit. | The provider console. Restore from backup on a new VPS if the disk is lost. |
| Disk filling | Risk to the DB | Log rotation, backup retention, a disk alert. |
| Leaked device key | Misuse until revoked | `admin key:revoke`. Effective within `KEY_CACHE_SECONDS`. |

**Alerts without paid services:**

- `/metrics` plus a cron check on the VPS that sends to a free channel, for example a Telegram bot.
- A liveness check of the VPS itself must run from **outside** it, for example on a machine you already operate. The VPS
  cannot report its own outage.

---

## 17. Security and privacy

- No prompt or response bodies are logged or stored (§8). `usage` stores counts only.
- Device keys are 256-bit random values, stored as SHA-256. The plaintext is shown once.
- Accounts access tokens are used only on `POST /v1/auth/device-keys` and never stored.
- Events are verified with EdDSA, `iss`, `aud` and `jti`-replay checks (§7.6).
- TLS is mandatory. Caddy obtains certificates automatically. HSTS is not sent by default, so add
  `header Strict-Transport-Security "max-age=31536000"` to the site block. Admin work happens over SSH only.
- Upstream secrets live in a root-only env file, never in the database or the repository.
- Static instructions and skills are public (D6).

---

## 18. Testing

- **Phase 0, before M1** (answers O1/O2). Send the same small prompt to the chosen upstream with each candidate
  thinking/effort field. Record latency, `usage` (including whether reasoning tokens are counted in `completion_tokens`),
  and whether tool calls still work. Lock the tier rows from these results.
- **Unit:** the SSE usage parser (split chunks, `[DONE]`, a missing usage chunk), cost calculation, field rewrite.
- **Integration** (Compose test profile with a mock upstream):
  - pass-through is byte-identical;
  - settlement is exactly once under retries and restarts;
  - an abort cancels the upstream;
  - every error status maps as §8 says.
  Assert the classification with the app's own `classifyProviderFailure`, imported from `@contextcode/ai`, instead of
  restating its rules.
- **Load:** §15.
- **End to end:** a dev build of Context Code pointed at a staging hostname on the same VPS.

---

## 19. Milestones

| Milestone | Content |
|---|---|
| M0 | Phase-0 upstream verification. Resolve O1 and O2. |
| M1 | Gateway core: `/v1/models`, chat pass-through, device keys, schema, metering without enforcement. |
| M2 | Credits enforcement, rate limits, the events endpoint. Resolve O3 and O4. |
| M3 | App changes A1–A6. Resolve O6. |
| M4 | Deploy on the VPS: Caddy, backups, alerts, load test, runbook. Resolve O7. |
| M5 | Top-ups from payments. Resolve O5. Then A7. |

**Later, not in scope here:**

- Per-tier agent behaviour. Agent `steps` exist in config, but per agent, not per model (`packages/schema/src/config/agent.ts`).
- Per-device revocation from `sid` (§7.6).
- A second VPS with failover.
- An admin web UI.
- Request compression from app to gateway. Not verified to be supported by the app's HTTP client.
