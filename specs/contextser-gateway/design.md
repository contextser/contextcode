# Contextser Gateway — Design

Status: draft for review · Written: 2026-10-29 · Upstream decided 2026-10-30 (DeepSeek API, §3.1) · Two wire formats
and the admin API added 2026-10-30

This document specifies the service that gives Context Code users access to models. It covers:

- per-user authentication;
- models in two wire formats, OpenAI Chat Completions and Anthropic Messages, added and changed at any time through an
  admin API;
- rate limits, metering and credits;
- remote delivery of the system prompt and skills.

Everything here runs on **one VPS**.

Every statement about Context Code, accounts.contextser.com or DeepSeek in §2–§3 was checked against the code (paths
given) or the live service on the dates given. Anything not verified is listed as an **open decision** in §5 and must
be resolved before the part that depends on it is built. Numbers that depend on real traffic are given as formulas plus
a load test (§16), not as estimates.

---

## 1. Goals and constraints

**Goals**

1. Serve Context Code's model traffic for up to 10,000 registered users.
2. Serve models in **both** wire formats, **OpenAI Chat Completions** and **Anthropic Messages**, without translating
   between them.
3. Add and change models, upstreams and plans **at any time through an authenticated admin API**. No model is
   hard-coded in the gateway or the app.
4. Offer the product models **Context Neo** (low), **Context Spark** (medium) and **Context Apex** (high). They are
   ordinary model rows created through the admin API (Appendix A).
5. Per-user authentication, rate limits, usage metering and prepaid credits.
6. Change the system prompt and skills without an app release.

**Constraints**

- Runs entirely on one VPS. The VPS is the only infrastructure cost introduced by this design.
- Lightweight and low-maintenance: few processes, few dependencies, no translation between formats.

**Costs that exist regardless of this design** (listed so nothing is hidden):

- Model usage billed per token by each upstream. The first upstream is the DeepSeek API (§3.1), whose prices differ by
  cache hit, cache miss and output, and by peak and off-peak hours. This is the cost of selling model access, not
  infrastructure.
- The domain `contextser.com`, already owned. The gateway needs one DNS record.
- accounts.contextser.com, an existing service this design depends on over HTTPS and does not change (§3).

**Non-goals for the first release**

- Translation between formats. A model is served only in its upstream's format (D2).
- Image, audio or embedding endpoints.
- Per-model agent behaviour (step limits, subagents). This needs an app change (§20).
- An admin web UI. The admin HTTP API (§8) is what a future UI, such as the accounts admin panel, will call.
- Failover across machines. A single VPS is a single point of failure, and that is accepted (§17).

---

## 2. What Context Code does today (verified)

The gateway must satisfy these behaviours exactly. Paths are relative to the `contextcode` repository.

| # | Behaviour | Source |
|---|---|---|
| C1 | Models come from the `contextser` provider plugin. Its default origin is `http://localhost:20128`. The base URL is `origin + "/v1"` unless `providers.contextser.settings.baseURL` is set in config. | `packages/core/src/plugin/provider/contextser.ts`, `local.ts` `configured()` |
| C2 | The API key is read **only** from config `providers.contextser.settings.apiKey`. | `local.ts` `configured()` |
| C3 | Discovery is `GET {base}/models` with `Authorization: Bearer <key>`. It expects `{ data: [{ id, owned_by?, capabilities?: { vision?, tools?, contextWindow?, maxOutput? }, context_length?, max_completion_tokens? }] }`. The display name is the `id` with an `owned_by + "/"` prefix removed. `tools` defaults to `true`. | `contextser.ts`, `local.ts` `createClient()` |
| C4 | Every running app repeats discovery every **30 s** (`make()` default `interval = "30 seconds"`, `Schedule.spaced(interval)`). Each discovery call times out after **1 s**. On failure the last inventory is kept. With no inventory, the provider contributes no models. | `local.ts` |
| C5 | The plugin sets the provider package `@contextcode/ai/providers/openai-compatible` for every model. Core resolves a model's package as `model.package ?? provider.package`, so one provider can mix packages per model. | `local.ts`; `packages/core/src/model.ts` (lines 148, 210) |
| C6 | **OpenAI format** (`openai-compatible`): `POST {base}/chat/completions`, `Authorization: Bearer <key>`, always `stream: true`, with `stream_options: { include_usage: true }` unless a model's compatibility settings turn it off. | `packages/ai/src/providers/openai-compatible.ts`; `protocols/openai-compatible-chat.ts`; `protocols/openai-chat.ts` |
| C7 | For provider `contextser` on a URL that is not in the known list, the OpenAI format sends `max_completion_tokens`, not `max_tokens`. | `openai-chat.ts` `detectMaxTokensField` |
| C8 | The OpenAI format reads `prompt_tokens`, `completion_tokens`, `prompt_tokens_details.cached_tokens` and `completion_tokens_details.reasoning_tokens`, and reasoning text from `reasoning_content`. | `openai-chat.ts` response schema |
| C9 | **Anthropic format** (`anthropic-compatible`): `POST {base}/messages` with header `anthropic-version: 2023-06-01`. Auth is `x-api-key: <apiKey>`, or `Authorization: Bearer` when configured with `authToken`. Requests always carry `stream: true` and `max_tokens` (the protocol's `DEFAULT_MAX_TOKENS` is 32000). Thinking is `{ type: "enabled", budget_tokens }` with a 1024 minimum, or adaptive. | `packages/ai/src/providers/anthropic-compatible.ts`; `protocols/anthropic-messages.ts` |
| C10 | The Anthropic format reads usage `input_tokens`, `output_tokens`, `cache_creation_input_tokens`, `cache_read_input_tokens` and `output_tokens_details.thinking_tokens`. It consumes the named SSE events `message_start`, `message_delta`, `message_stop`, `content_block_start`, `content_block_delta`, `content_block_stop`, `ping`, `error` and `message`. | `anthropic-messages.ts` |
| C11 | Each agent step is one streamed call that re-sends the conversation history. | `AGENTS.md`, "Session Core" |
| C12 | HTTP errors are classified the same way for both formats. **402** means quota exceeded and is not retried. **401/403** mean an authentication error and are not retried. **429** is a rate limit: retried, honouring `retry-after-ms` or `retry-after`. **5xx/408/409** are provider errors and are retried. **413** means payload too large. `context_length_exceeded` means context overflow. Any other 4xx is an invalid request. A response header `x-should-retry: true\|false` overrides the retry decision. | `packages/ai/src/provider-error.ts` (`classifyProviderFailure`, `isRetryable`); `route/executor.ts` |
| C13 | The SSE framing consumes only parsed `Event` items (Effect `makeParser`), so SSE comment lines are not treated as data. | `packages/ai/src/route/framing.ts` |
| C14 | Config `instructions` entries that are `http(s)` URLs are fetched when config loads. A failed fetch keeps the last good copy or skips the URL. | `packages/core/src/config/plugin/instruction.ts` |
| C15 | Config `skills` entries that are `http(s)` URLs are pulled as follows. The app fetches `<url>/index.json`, shaped `{ skills: [{ name, version?, files: string[] }] }`. A skill is skipped unless its `files` include `SKILL.md` or `<name>.md`. Files must be on the same origin. They are cached and downloaded again when `version` changes. Requests are plain GETs with no auth header. | `packages/core/src/skill/discovery.ts`, `config/plugin/skill.ts` |
| C16 | The legacy `small_model` maps to `agents.title.model`, so session titles also call a model. | `packages/core/src/config/normalize.ts` |
| C17 | `PATCH /api/experimental/config` accepts only `shell`. `POST /api/credential` stores integration credentials, but the `contextser` plugin does not read them: it removes its integration once models load. | `packages/schema/src/config.ts` (`Patch`); `packages/protocol/src/groups/credential.ts`; `local.ts` |
| C18 | Desktop sign-in runs in the desktop main process. It uses OAuth with PKCE and a loopback redirect against accounts.contextser.com, as a public client. It stores tokens encrypted and refreshes them single-flight, because refresh tokens rotate. | `packages/desktop/src/main/account/contextser.ts` |
| C19 | Today's upstream through `contextser` is `river1/deepseek-ai/DeepSeek-V4.1-Flash-1017`, reached through a 9router on the developer's machine. Tool calling works on this path in current use. | local 9router `/v1/models` |

---

## 3. What accounts.contextser.com provides (verified)

| # | Fact | Source |
|---|---|---|
| A1 | The live OIDC discovery document at `https://accounts.contextser.com/api/.well-known/openid-configuration` lists the issuer `https://accounts.contextser.com`, `id_token_signing_alg_values_supported: ["EdDSA"]`, and `jwks_uri` `…/api/.well-known/jwks.json`. It also lists `userinfo_endpoint` `…/api/userinfo` and `revocation_endpoint` `…/api/oauth/revoke`. | fetched 2026-10-29 |
| A2 | Refresh tokens last 60 days and rotate; a replayed one revokes the chain. Access tokens are short-lived (code comments say ten minutes), and clients take the exact lifetime from `expires_in`. | accounts `src/lib/oauth/refresh.ts`, `src/server/app.ts` |
| A3 | Accounts delivers signed JWT events to a client's configured event endpoint. Events carry `aud` = client id and `sub`, plus optional `sid` and an `events` claim. Types are `http://schemas.openid.net/event/backchannel-logout` and `https://contextser.com/event/user-updated`. Missed events can be replayed with `GET /api/events?since=<seq>`. | accounts `src/lib/oauth/events.ts` |
| A4 | Context Code's live client is a public client with the loopback callback `http://127.0.0.1:47823/callback`. | admin configuration, 2026-10-29 |

The gateway uses only A1's userinfo endpoint and JWKS, plus A3's events. It never reads accounts' database.

### 3.1 First upstream: DeepSeek API (verified 2026-10-30)

Decision O1: production uses the provider's official API with a commercial key. Re-check these facts before launch,
because prices and limits change.

| # | Fact | Source |
|---|---|---|
| U1 | The OpenAI-format base URL is `https://api.deepseek.com`, with chat at `/chat/completions`. An Anthropic-format base URL, `https://api.deepseek.com/anthropic`, is also offered. | api-docs.deepseek.com (home) |
| U2 | Model id `deepseek-flash` "is now served by DeepSeek-V4.1-Flash-1017", the model Context Code uses today (C19). The legacy ids `deepseek-v4-flash` and `deepseek-v4-flash-vision-exp` are retired and route to the same model at the Flash price. | home, Models & Pricing |
| U3 | `deepseek-flash`: context length 1M; max output up to 384K; both non-thinking and thinking modes, with thinking as the default; supports tool calls and JSON output. | Models & Pricing |
| U4 | OpenAI format: `thinking: { type: "enabled" \| "disabled" }`, default `enabled`. `reasoning_effort` accepts `none`, `low`, `high` or `max`, default `high`. `minimal` maps to `low`, and `medium`/`xhigh` map to `high`. | API reference, create chat completion |
| U5 | The output limit field is `max_tokens`, from 1 to 393216; `max_completion_tokens` is not a parameter. Defaults when unset: 8K non-thinking, 64K thinking, 128K with `reasoning_effort: "max"`. | API reference |
| U6 | `stream_options.include_usage` is supported with `stream: true`. Usage carries the following fields: `prompt_tokens`, which equals hits plus misses; `prompt_cache_hit_tokens` and `prompt_cache_miss_tokens`; `prompt_tokens_details.cached_tokens`, which equals hits; `completion_tokens`; `completion_tokens_details.reasoning_tokens`; and `total_tokens`. The docs do **not** say whether `completion_tokens` includes reasoning tokens. | API reference |
| U7 | Reasoning text streams in `delta.reasoning_content` (thinking mode), and tool calls in `delta.tool_calls`. Both are fields Context Code reads (C8). | API reference |
| U8 | In thinking mode, `temperature` has no effect and `top_p` is clamped to 0.95–1.0. `tool_choice` set to `required` or a named tool returns **400**. `frequency_penalty` and `presence_penalty` are ignored in every mode. | API reference |
| U9 | Concurrency is limited per **account**, not per key: 2500 in flight for `deepseek-flash`. Going over returns 429. A request counts until its response completes. Capacity expansion can be requested at no extra cost. | Rate Limit & Isolation |
| U10 | While a request waits, streams receive SSE `: keep-alive` comments. If inference has not started after 10 minutes, the server closes the connection. | Rate Limit & Isolation |
| U11 | The optional `user_id` (up to 512 chars, `[a-zA-Z0-9\-_]+`, no personal information) isolates end users for content safety, KV-cache privacy and scheduling. On standard accounts every `user_id` shares the account limit. | Rate Limit & Isolation |
| U12 | Prices per 1M tokens for `deepseek-flash`, as shown on the page in $ (off-peak / peak): input cache hit 0.003 / 0.006; input cache miss 0.15 / 0.3; output 0.6 / 1.2. Off-peak is half of peak. Peak is 01:00–04:00 and 06:00–10:00 UTC on weekdays, excluding Chinese public holidays. | Models & Pricing |
| U13 | The Open Platform Terms (released 2026-04-22, effective 2026-04-29) cover building applications for end users. They require developers to: make agreements with end users (§3.2); disclose personal-information processing before providing service (§3.3); put user-management measures in place (§3.4); and disclose that output is AI-generated (§8.1). They forbid sharing the API key or exposing it in client-side code (§2.2). They **do not explicitly address** reselling or sublicensing API access. | cdn.deepseek.com Open Platform Terms of Service |

DeepSeek's Anthropic-format endpoint (U1) was **not** examined beyond its base URL. Its exact messages URL, auth
header, thinking and tool support, usage fields, and per-user field are open decision O8.

---

## 4. Decisions

| ID | Decision | Why |
|---|---|---|
| D1 | One VPS runs Caddy, two identical gateway processes and PostgreSQL, under Docker Compose. There is no Redis. | Every piece of shared state (rate windows, active streams, balances, the catalog) fits in indexed PostgreSQL rows. That leaves one stateful service to back up and upgrade. |
| D2 | **Two inbound formats, pass-through, no translation.** OpenAI-format models are served at `POST /v1/chat/completions` and Anthropic-format models at `POST /v1/messages`. A model's format is its upstream's format. A request for a model at the other format's endpoint gets 400 `model_format_mismatch`. The gateway rewrites only the request fields in §10 and never rewrites response bytes. | The app already has a client for each format (C6, C9) and can choose one per model (C5). Not translating removes the largest source of bugs in model gateways. |
| D3 | The app authenticates to the gateway with an opaque per-device key, minted once after sign-in (§7.4). It never sends the accounts access token on model requests. Both endpoints accept the key as `Authorization: Bearer` or `x-api-key`, the two headers the app's clients send (C6, C9). | Desktop main stays the only holder of the rotating refresh token (C18). Core already sends a static key. Accounts is called once per device sign-in. Keys are revocable per device. |
| D4 | When a key is minted, the access token is verified by calling accounts `GET /api/userinfo` with it. | This needs no JWT handling on this path and honours grant revocation. It runs once per sign-in. |
| D5 | **Models, upstreams, plans and concurrency groups exist only as rows created through the admin API (§8).** The serving path reads an in-memory catalog snapshot, reloaded every `CATALOG_REFRESH_SECONDS`. | New or changed models need no deploy and no app release. Discovery answers from memory, well inside the app's 1 s timeout (C4). |
| D6 | Caddy serves the system prompt and skills as static files from the VPS. The app consumes them through its existing remote `instructions` and `skills` support (C14, C15). | No new code. They are **public** URLs, because the app fetches them without auth, so they must contain nothing secret. |
| D7 | Credits are an append-only ledger plus a balance row, debited once per request from the usage the upstream reports, idempotently by request id. | Exactly-once charging survives retries and restarts. |
| D8 | The runtime is Bun with its built-in PostgreSQL client (`Bun.sql`) and Hono, the only third-party runtime dependency. Request validation, the two SSE usage parsers and secret encryption are in-house: small, unit tested, using Web Crypto. | Few dependencies means few upgrades. If `Bun.sql` shows a defect, swap it for `postgres` (porsager) behind the same small `db` module. |
| D9 | Upstream API keys are submitted through the admin API and stored **encrypted** with AES-256-GCM. The key-encryption key is `SECRETS_KEY` in the environment file. The API never returns a stored key, only its last 4 characters. Upstream keys are used only server-side. | Models must be addable through the API at any time (goal 3), which includes their credentials. Encrypting at rest keeps a database dump from leaking the keys. DeepSeek forbids exposing the key client-side (U13 §2.2). |
| D10 | Every upstream request carries a per-user id, the lowercase hex SHA-256 of `sub`, in the field the upstream names (`user_field`; for the DeepSeek OpenAI endpoint, `user_id`, U11). | It gives per-user isolation without sending personal information. |
| D11 | Upstreams belong to a **concurrency group** with its own cap, enforced with the same lease table as per-user concurrency (§12.2). Every upstream on one provider account shares that account's group: for DeepSeek, cap it below the account's 2500 (U9). Requests over the cap get 429 from the gateway. | Provider limits are per account, not per endpoint (U9). Failing fast with `retry-after` beats letting the upstream queue for up to 10 minutes (U10). |
| D12 | The admin API is served over HTTPS under `/admin/` and needs an admin token: `ctxa_` + 32 random bytes, stored as SHA-256, named and revocable. Every write is recorded in an audit table with secrets redacted. Caddy can restrict `/admin/*` to listed IPs (`ADMIN_ALLOW_IPS`). | This is the owner's choice. A future admin panel can call it. Tokens can be rotated without a deploy. |

---

## 5. Open decisions (resolve before building the dependent part)

| ID | Question | Blocks |
|---|---|---|
| O1 | **Resolved 2026-10-30:** the DeepSeek API with a commercial key (§3.1). Still to do: a legal review of offering paid access, because the terms neither allow nor forbid it explicitly (U13). | — |
| O2 | DeepSeek OpenAI format: (a) does `completion_tokens` include `reasoning_tokens`? The answer decides the cost formula (§11.1). (b) Does `deepseek-flash` accept images? Keep `vision = false` until tested. (c) Settle final Neo/Spark/Apex values from the Phase-0 measurements, starting from Appendix A. | model rows, pricing |
| O3 | **Pricing.** Credits per 1M tokens per model: input, cached input, cache write (Anthropic format) and output. Is there a free allowance? How do credits map to the payment currency? | M2 |
| O4 | **Aborted streams.** If a stream ends without usage, either (a) charge nothing, or (b) charge a calibrated estimate. | M2 |
| O5 | **Top-ups.** How does payments.contextser.com tell the gateway a payment succeeded? §7.8 proposes the shape. | M5 |
| O6 | **Default app config.** How do shipped builds set `baseURL`, the default model, `agents.title.model`, `instructions` and `skills`: built-in defaults, or a config file written on first run? | M3 |
| O7 | **Hostname,** for example `api.contextser.com`. Only a DNS record is needed. | M4 |
| O8 | **DeepSeek Anthropic-format endpoint**, before any Anthropic-format model is offered: the exact messages URL; the auth header; support for thinking and tools; usage field semantics (does `input_tokens` exclude cache reads and writes?); and whether it accepts a per-user field. Answer with the model test (§8.4) and DeepSeek's docs. | Anthropic-format models |

---

## 6. Architecture

```
Context Code (desktop)
  core ── POST /v1/chat/completions (OpenAI-format models)  ┐
  core ── POST /v1/messages (Anthropic-format models)       ├─ device key (Bearer or x-api-key)
  core ── GET  /v1/models (both, with each model's format)  ┘
  core ── GET /instructions/*.md, /skills/index.json (public, static)
  desktop main ── POST /v1/auth/device-keys (Bearer <accounts access token>), once per sign-in
Admin (owner, later the accounts admin panel) ── /admin/* (Bearer ctxa_…)
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
      upstream APIs (OpenAI or Anthropic format)     accounts.contextser.com
      first: DeepSeek (§3.1)                         (userinfo, JWKS, events)
```

Each gateway process runs four things beside request handling:

- a catalog refresher (D5);
- a cleanup job for expired rate windows and stale leases (§12);
- a JWKS cache for verifying events;
- a decrypted-key cache that is cleared on every catalog reload.

---

## 7. Public HTTP API

Errors use the format of the endpoint that received the request:

- OpenAI endpoints: `{"error":{"message","type","code"}}`
- `/v1/messages`: `{"type":"error","error":{"type","message"}}`

Status codes follow C12 in both cases.

### 7.1 `GET /v1/models`

- Auth: device key. Lists the enabled models the user's plan allows, from memory:

```json
{
  "object": "list",
  "data": [
    {
      "id": "context-spark",
      "object": "model",
      "owned_by": "contextser",
      "name": "Context Spark",
      "protocol": "openai",
      "capabilities": { "tools": true, "vision": false, "contextWindow": 1000000, "maxOutput": 65536 }
    }
  ]
}
```

- `protocol` is `"openai"` or `"anthropic"`. The current app ignores `name` and `protocol` (C3). App change A3 makes the
  app use them.
- `Cache-Control: private, max-age=30`.

### 7.2 `POST /v1/chat/completions` (OpenAI format)

Device key auth. The `model` must be an OpenAI-format model. Pipeline in §10. The response passes the upstream's SSE
bytes through unchanged, plus an `x-request-id` header.

### 7.3 `POST /v1/messages` (Anthropic format)

Device key auth (Bearer or `x-api-key`). The `model` must be an Anthropic-format model. Pipeline in §10. The response
passes the upstream's SSE bytes through unchanged, plus an `x-request-id` header.

### 7.4 `POST /v1/auth/device-keys`

- Auth: `Authorization: Bearer <accounts access token>`.
- Body: `{ "device_name": string }`, up to 120 characters.
- Steps:
  1. Call `GET https://accounts.contextser.com/api/userinfo` with the same token. Anything but 200 returns 401.
  2. Upsert `users(sub, email)`.
  3. Refuse with 409 if the user already has `MAX_KEYS_PER_USER` active keys.
  4. Create the key: `ctxk_` + 32 random bytes in base64url. Store only its SHA-256 and the first 12 characters as
     `prefix`.
- Response 201: `{ "key": "ctxk_…", "id", "created_at" }`. The key is returned only once.
- Rate-limited per IP and per `sub` (§12).

### 7.5 `DELETE /v1/auth/device-keys/current`

Revokes the key used for this request. Returns 204.

### 7.6 `GET /v1/account`

Device key auth. Returns `{ balance, unit, models: [ids the user may use], usage_this_month }` (app change A7).

### 7.7 `POST /v1/accounts/events`

This is Context Code's event endpoint, configured on its client in the accounts admin panel.

- The body is a JWT. Verify it with the JWKS (A1): EdDSA, `iss` = `https://accounts.contextser.com`, `aud` = Context
  Code's client id.
- Reject a reused `jti` (kept for 24 h).
- `backchannel-logout` revokes all active device keys of `sub`. `user-updated` refreshes `users.email`.
- Respond 200 quickly. Catch up after downtime with `POST /admin/events/replay` (§8), which reads
  `GET /api/events?since=<seq>` (A3).

### 7.8 `POST /internal/credits` (proposal, depends on O5)

- Called by payments. The body `{ payment_id, sub, amount, unit }` is signed with HMAC-SHA256 using a shared secret,
  sent in `x-signature`.
- Idempotent on `payment_id`.

### 7.9 Operations

- `GET /healthz` reports process and DB status. It returns 503 while draining (§13).
- `GET /metrics` serves Prometheus text format and is bound to localhost.

### 7.10 Static content (Caddy `file_server`, no gateway code)

- `/instructions/context-code.md`
- `/skills/index.json`, plus `/skills/<name>/SKILL.md` and that skill's other files (format C15)

The content lives in a git repository at `/srv/content`. Bump a skill's `version` to make clients download it again.

---

## 8. Admin API (D12)

All endpoints live under `/admin/` and need `Authorization: Bearer ctxa_…`. Bodies are JSON and validated strictly:
unknown fields are rejected. Each write commits to PostgreSQL and is recorded in `admin_audit`.

Catalog changes take effect on every gateway process within `CATALOG_REFRESH_SECONDS`. Write responses include
`applies_within_seconds`.

### 8.1 Upstreams

| Method | Path | Body or effect |
|---|---|---|
| GET | `/admin/upstreams` | Lists upstreams. Keys appear only as `api_key_last4`. |
| POST | `/admin/upstreams` | Creates one. Body fields below. |
| PATCH | `/admin/upstreams/:id` | Any body field except `id` and `protocol`. Sending `api_key` replaces it. |
| POST | `/admin/upstreams/:id/disable` | Its models stop being served (404 `model_not_found`). |

Body fields for `POST /admin/upstreams`:

- `id`
- `protocol`: `"openai"` or `"anthropic"`
- `endpoint_url`: the **full** chat URL, so no path joining is guessed. Example:
  `https://api.deepseek.com/chat/completions` (U1).
- `api_key`: write-only.
- `auth_header`: `"authorization_bearer"` or `"x_api_key"`.
- `max_tokens_field`: OpenAI format only, `"max_tokens"` or `"max_completion_tokens"`.
- `version_header`: Anthropic format only, the value sent as `anthropic-version`.
- `user_field`: `"user_id"`, `"metadata.user_id"` or `null`.
- `concurrency_group`

### 8.2 Concurrency groups

| Method | Path | Body |
|---|---|---|
| GET | `/admin/concurrency-groups` | — |
| PUT | `/admin/concurrency-groups/:id` | `{ max_concurrent }` |

### 8.3 Models

| Method | Path | Body or effect |
|---|---|---|
| GET | `/admin/models` | Lists models. |
| POST | `/admin/models` | Creates one. Body fields below. |
| PATCH | `/admin/models/:id` | Any body field except `id`. |
| POST | `/admin/models/:id/disable` | The model leaves `/v1/models` and its requests get 404. |

Body fields for `POST /admin/models`:

- `id`, matching `^[a-z0-9][a-z0-9._-]{0,63}$`
- `name`, `description`
- `upstream_id`, `upstream_model`
- `overrides`: a JSON object of at most 4 KB, merged into requests in the upstream's format
- `locked_fields`: field names removed from client requests first
- `max_output`, `context_window`, `vision`, `tools`
- `price_in`, `price_cached`, `price_cache_write`, `price_out`: micro-credits per 1M tokens (O3)
- `enabled`, `sort`

A model's format is its upstream's `protocol`.

### 8.4 Model test

`POST /admin/models/:id/test` sends a minimal streamed request to the upstream in its own format: one user message,
`max_tokens` 16, the model's overrides applied. It returns the HTTP status, time to first byte, and the **raw usage
object** as received, plus the parsed usage the gateway would bill. This verifies a newly added model, its credentials
and its usage parsing before users see it. It costs a few upstream tokens.

### 8.5 Users, plans, credits, keys

| Method | Path | Body or effect |
|---|---|---|
| GET | `/admin/plans` | — |
| PUT | `/admin/plans/:id` | `{ models: string[] \| null, rpm, max_concurrent }`. `models: null` allows every enabled model. |
| GET | `/admin/users/:sub` | Plan, balance, active keys (prefix only), month's usage. |
| PUT | `/admin/users/:sub/plan` | `{ plan_id }` |
| POST | `/admin/credits` | `{ sub, amount, ref }`. Idempotent on `ref`. Negative amounts are corrections. |
| POST | `/admin/keys/revoke` | `{ key_id }` or `{ sub }` (all of the user's keys) |
| GET | `/admin/usage` | `?from&to&model&sub`: totals of tokens, cost and upstream cost |
| POST | `/admin/events/replay` | Fetches missed accounts events (§7.7). |

### 8.6 Admin tokens

| Method | Path | Body or effect |
|---|---|---|
| POST | `/admin/tokens` | `{ name }` returns `{ token }` once. |
| GET | `/admin/tokens` | Name, created, last used. |
| DELETE | `/admin/tokens/:id` | Revokes it. |

The first admin token is created over SSH with `bun run admin token:create <name>` (§14.5). That is the only admin
action without an API.

---

## 9. Choosing the format in the app

For each model in `/v1/models`, the `contextser` plugin (app change A3) sets:

- `protocol: "openai"`: no package override. The provider's `@contextcode/ai/providers/openai-compatible` applies
  (C5), sending `POST {base}/chat/completions` with Bearer (C6).
- `protocol: "anthropic"`: `model.package = "@contextcode/ai/providers/anthropic-compatible"`, sending
  `POST {base}/messages` with `x-api-key` (C9).

`{base}` is the gateway's `…/v1` (C1), so the two calls land on §7.2 and §7.3.

---

## 10. Model request pipeline (both endpoints)

1. **Auth.** Hash the bearer or `x-api-key` value and look it up in `device_keys`, with an in-process cache of up to
   `KEY_CACHE_SECONDS`, so revocation takes effect within that many seconds. Unknown or revoked keys return 401.
2. **Size.** Caddy's `request_body max_size` rejects oversized bodies with 413 (C12: payload too large).
3. **Model.** Parse the JSON and find `model` in the catalog snapshot.
   - Unknown or disabled: 404 `model_not_found`.
   - Excluded by the user's plan: 403 `model_not_allowed`.
   - The model's format differs from the endpoint's: 400 `model_format_mismatch`.
4. **Limits.** Check requests per minute, the user's concurrent streams, and the upstream's concurrency group (§12).
   Over any of them returns 429 with `retry-after` and `retry-after-ms`.
5. **Balance.** If `balance <= 0`, return 402 (`insufficient_quota`). C12: quota, not retried.
6. **Rewrite** (only these changes):
   - Set `model` to `upstream_model`.
   - Delete every field in `locked_fields`, then merge `overrides`.
   - OpenAI format:
     - Take the requested output limit from `max_completion_tokens`, or else `max_tokens`.
     - Send `min(requested, max_output)` in `upstream.max_tokens_field`, and remove the other field (C7, U5).
     - Set `stream_options.include_usage = true`.
   - Anthropic format: set `max_tokens = min(requested, max_output)`. The field is always present (C9).
   - Set the per-user id in `upstream.user_field` (D10).
   - Headers to the upstream:
     - the upstream key in `upstream.auth_header`;
     - `anthropic-version: <version_header>` for the Anthropic format;
     - `content-type`, `accept`.

     No client header is forwarded.
7. **Upstream call.**
   - `fetch(upstream.endpoint_url)` with an `AbortController` that is aborted when the client disconnects
     (`request.signal`).
   - Timeouts are configurable: connect, time to first byte, idle between chunks. A timeout returns 504.
   - Keep-alive comments (U10) count as activity, and are passed through unchanged. The app ignores them (C13).
     `TTFB_TIMEOUT_MS` stays below DeepSeek's 10-minute close (U10).
8. **Upstream errors**, before any byte is sent to the client:
   - **429**: return 429, copying `retry-after` and `retry-after-ms` when present.
   - **400/413/422**: return the same status and body, so context-overflow detection works (C12).
   - **401/403**: our upstream credential, not the user's. Return 502 with `x-should-retry: false`, and alert.
   - **5xx or a network error**: return 502. The app retries it (C12).
9. **Success.** Return `new Response(stream)` at once. The body is `tee()`d:
   - one branch goes to the client unchanged;
   - the other goes to the usage parser for the model's format (§11.2), which ignores comment lines.
10. **Settle** when the stream ends or aborts (§11). Then release the leases (§12).

The gateway never logs request or response bodies. It logs `request_id`, user, model, status, byte counts, token counts
and timings.

---

## 11. Metering and credits

### 11.1 Cost (integers in micro-credits; prices per 1M tokens from the model row, O3)

```
OpenAI format:     cost = (prompt − cached)·price_in + cached·price_cached + completion·price_out
Anthropic format:  cost = input·price_in + cache_read·price_cached + cache_write·price_cache_write + output·price_out
```

All values are rounded up after dividing by 1e6.

- OpenAI format: `prompt` = `prompt_tokens` and `cached` = `prompt_tokens_details.cached_tokens` (for DeepSeek, equal to
  `prompt_cache_hit_tokens`, U6). Whether `completion_tokens` includes reasoning is O2(a). Reasoning tokens are stored
  separately so charges can be recomputed.
- Anthropic format: `input`, `cache_read` and `cache_write` are `input_tokens`, `cache_read_input_tokens` and
  `cache_creation_input_tokens`. The formula assumes `input_tokens` excludes cache reads and writes; that must be
  confirmed per upstream (O8).

`upstream_cost` is also stored per request, computed from the upstream's price schedule (for DeepSeek, U12's peak and
off-peak). It is used to watch the margin. Keeping those schedules current is a manual maintenance item.

### 11.2 Usage parsers

- **OpenAI format:** SSE `data:` lines. Keep the last `usage` object seen; it comes after the final choice when
  `include_usage` is set. Ignore `[DONE]` and comment lines.
- **Anthropic format:** named events. Take the input and cache fields from `message_start.message.usage`, and
  `output_tokens` from the last `message_delta.usage`. Ignore `ping`.

### 11.3 Settlement (one transaction)

1. `INSERT INTO usage … ON CONFLICT (request_id) DO NOTHING RETURNING request_id`.
2. If that inserted a row and `cost > 0`:
   - insert a ledger row with `ref = 'usage:' || request_id`, debiting the cost;
   - update the balance.

`ledger.ref` is unique, so a settlement can never charge twice.

### 11.4 Overdraft, missing usage, top-ups

- Requests are admitted while `balance > 0`, so the overdraft is bounded by one request. Its output side is capped by
  `max_output`.
- A stream without usage is recorded as `no_usage` and charged per O4.
- Top-ups arrive through §7.8. Grants and corrections go through `POST /admin/credits`.

---

## 12. Rate limits and concurrency (PostgreSQL)

Limit values are product decisions, kept in `plans` and `concurrency_groups` and set through the admin API.

### 12.1 Requests per minute

```sql
INSERT INTO rl_window (scope, window_start, count) VALUES ('u:' || $1, date_trunc('minute', now()), 1)
ON CONFLICT (scope, window_start) DO UPDATE SET count = rl_window.count + 1
RETURNING count;
```

Reject when the count exceeds the plan's `rpm`. The cleanup job deletes windows older than 2 minutes. Key minting uses
the same table with the scopes `ip:<addr>` and `mint:<sub>`.

### 12.2 Concurrent streams

Every streaming request holds two leases in `active_streams`: one with `scope = 'u:<sub>'`, checked against the plan's
`max_concurrent`, and one with `scope = 'g:<group>'`, checked against the group's `max_concurrent`.

Each lease is taken in a transaction holding `pg_advisory_xact_lock(hashtext(scope))`:

1. Count unexpired rows for that scope.
2. Insert `(request_id, scope, expires_at = now() + LEASE)` if the count is under the cap.

A long stream extends its leases every `LEASE/2`. The leases are deleted when the stream ends. If a process crashes,
its leases simply expire.

---

## 13. Streaming and deploy correctness

- **No buffering.** Caddy uses `reverse_proxy … { flush_interval -1 }`. The gateway returns the stream object
  directly.
- **Cancellation.** A client disconnect aborts the upstream call (§10 step 7).
- **Graceful shutdown.** On SIGTERM:
  1. `/healthz` returns 503, so Caddy stops routing to this process.
  2. The process stops accepting new requests.
  3. It waits for active streams up to `DRAIN_SECONDS`, then exits.
- **Zero-downtime deploy.** Restart `gateway-a`, wait until it is healthy, then restart `gateway-b`.

---

## 14. Deployment on one VPS

### 14.1 Host

- An Ubuntu LTS release with SSH key-only login.
- `ufw` allows only 22, 80 and 443. PostgreSQL is reachable only on the Docker network.
- `unattended-upgrades` handles security updates.
- Docker logs use the `json-file` driver with `max-size` and `max-file` set.

### 14.2 Compose services

`caddy`, `gateway-a`, `gateway-b`, `postgres` and `backup`.

- Images are pinned by version.
- The two gateways run one image with different `INSTANCE` values.

### 14.3 Caddyfile sketch

```
api.contextser.com {
  header Strict-Transport-Security "max-age=31536000"
  request_body { max_size {$MAX_BODY} }
  handle_path /instructions/* { root * /srv/content/instructions; file_server }
  handle_path /skills/*       { root * /srv/content/skills; file_server }
  @admin path /admin/*
  handle @admin {
    # Optional: restrict to ADMIN_ALLOW_IPS with a remote_ip matcher.
    reverse_proxy gateway-a:8080 gateway-b:8080 { health_uri /healthz }
  }
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

### 14.4 Environment file (`chmod 600`)

- `DATABASE_URL`
- `SECRETS_KEY`: 32 random bytes in base64, used to encrypt upstream keys (D9)
- `ACCOUNTS_ISSUER`, `CONTEXT_CODE_CLIENT_ID`
- `CREDITS_HMAC_SECRET`
- timeouts: `CONNECT_TIMEOUT_MS`, `TTFB_TIMEOUT_MS`, `IDLE_TIMEOUT_MS`
- `DRAIN_SECONDS`, `KEY_CACHE_SECONDS`, `CATALOG_REFRESH_SECONDS`, `LEASE_SECONDS`, `MAX_KEYS_PER_USER`, `MAX_BODY`
- `ADMIN_ALLOW_IPS` (optional)

Losing `SECRETS_KEY` makes stored upstream keys unreadable; they must then be re-entered through the admin API. Keep a
copy of it apart from the database backups.

### 14.5 CLI (bootstrap and maintenance only, run over SSH)

```
bun run migrate                       # apply numbered SQL migrations
bun run admin token:create <name>     # first admin token
bun run admin secrets:rotate          # re-encrypt upstream keys under a new SECRETS_KEY
```

### 14.6 Backups (no paid storage)

- A nightly `pg_dump -Fc` to `/var/backups`, keeping `N` days.
- Copy dumps off the machine by pulling them over SSH (`rsync`) from a machine you already operate.
- Provider snapshots are used only if the VPS plan includes them.
- Run a restore drill monthly.

---

## 15. Data model (PostgreSQL)

```sql
CREATE TABLE plans (
  id             text PRIMARY KEY,
  models         text[],                       -- NULL = every enabled model
  rpm            integer NOT NULL,
  max_concurrent integer NOT NULL
);

CREATE TABLE users (
  sub        text PRIMARY KEY,                 -- accounts subject
  email      text,
  plan_id    text NOT NULL DEFAULT 'default' REFERENCES plans(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE device_keys (
  id           text PRIMARY KEY,
  user_sub     text NOT NULL REFERENCES users(sub),
  key_hash     bytea NOT NULL UNIQUE,          -- sha256(key)
  prefix       text NOT NULL,
  device_name  text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz,
  revoked_at   timestamptz
);
CREATE INDEX ON device_keys (user_sub) WHERE revoked_at IS NULL;

CREATE TABLE concurrency_groups (
  id             text PRIMARY KEY,
  max_concurrent integer NOT NULL
);

CREATE TABLE upstreams (
  id                text PRIMARY KEY,
  protocol          text NOT NULL CHECK (protocol IN ('openai','anthropic')),
  endpoint_url      text NOT NULL,             -- full chat URL
  auth_header       text NOT NULL CHECK (auth_header IN ('authorization_bearer','x_api_key')),
  api_key_cipher    bytea NOT NULL,            -- AES-256-GCM(ciphertext || tag)
  api_key_iv        bytea NOT NULL,
  api_key_last4     text NOT NULL,
  max_tokens_field  text CHECK (max_tokens_field IN ('max_tokens','max_completion_tokens')),
  version_header    text,                      -- anthropic-version, Anthropic format only
  user_field        text CHECK (user_field IN ('user_id','metadata.user_id')),
  concurrency_group text NOT NULL REFERENCES concurrency_groups(id),
  enabled           boolean NOT NULL DEFAULT true,
  updated_at        timestamptz NOT NULL DEFAULT now(),
  CHECK (protocol <> 'openai' OR max_tokens_field IS NOT NULL)
);

CREATE TABLE models (
  id                text PRIMARY KEY,
  name              text NOT NULL,
  description       text,
  upstream_id       text NOT NULL REFERENCES upstreams(id),
  upstream_model    text NOT NULL,
  overrides         jsonb NOT NULL DEFAULT '{}',
  locked_fields     text[] NOT NULL DEFAULT '{}',
  max_output        integer NOT NULL,
  context_window    integer NOT NULL,
  vision            boolean NOT NULL DEFAULT false,
  tools             boolean NOT NULL DEFAULT true,
  price_in          bigint NOT NULL,           -- micro-credits per 1M tokens
  price_cached      bigint NOT NULL,
  price_cache_write bigint,                    -- Anthropic format
  price_out         bigint NOT NULL,
  enabled           boolean NOT NULL DEFAULT true,
  sort              integer NOT NULL DEFAULT 0,
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE balances (
  user_sub   text PRIMARY KEY REFERENCES users(sub),
  balance    bigint NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE ledger (
  id         bigserial PRIMARY KEY,
  user_sub   text NOT NULL REFERENCES users(sub),
  delta      bigint NOT NULL,
  reason     text NOT NULL CHECK (reason IN ('usage','topup','grant','adjust')),
  ref        text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE usage (
  request_id        text PRIMARY KEY,
  user_sub          text NOT NULL,
  key_id            text NOT NULL,
  model_id          text NOT NULL,
  protocol          text NOT NULL,
  input_tokens      integer, cached_tokens integer, cache_write_tokens integer,
  output_tokens     integer, reasoning_tokens integer,
  raw_usage         jsonb,                     -- as received, for recomputation
  cost              bigint NOT NULL DEFAULT 0,
  upstream_cost     bigint,
  status            text NOT NULL CHECK (status IN ('complete','aborted','no_usage','upstream_error')),
  request_bytes     integer, response_bytes integer,
  ttfb_ms           integer, duration_ms integer,
  started_at        timestamptz NOT NULL
);
CREATE INDEX ON usage (user_sub, started_at);

CREATE TABLE rl_window (
  scope        text NOT NULL,
  window_start timestamptz NOT NULL,
  count        integer NOT NULL,
  PRIMARY KEY (scope, window_start)
);

CREATE TABLE active_streams (
  request_id text NOT NULL,
  scope      text NOT NULL,                    -- 'u:<sub>' | 'g:<group>'
  expires_at timestamptz NOT NULL,
  PRIMARY KEY (request_id, scope)
);
CREATE INDEX ON active_streams (scope, expires_at);

CREATE TABLE admin_tokens (
  id           text PRIMARY KEY,
  name         text NOT NULL,
  token_hash   bytea NOT NULL UNIQUE,
  created_at   timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz,
  revoked_at   timestamptz
);

CREATE TABLE admin_audit (
  id         bigserial PRIMARY KEY,
  token_id   text NOT NULL,
  method     text NOT NULL,
  path       text NOT NULL,
  body       jsonb,                            -- secrets replaced with "<redacted>"
  status     integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE seen_jti (jti text PRIMARY KEY, seen_at timestamptz NOT NULL DEFAULT now());
```

The first migration seeds a `default` plan, because `users.plan_id` defaults to it. Migrations are plain numbered SQL
files applied by `bun run migrate`, which records each one in `schema_migrations`.

---

## 16. Capacity planning: formulas, then measure

Let `A` be the number of app instances running at once, `R` the model requests per month, and `S_req` and `S_resp` the
average request and response bytes.

- **Discovery load:** `A / interval` requests per second. That is `A/30` today, or `A/300` after A4.
- **Bandwidth per month:** about `R × (S_req + S_resp) × 2`. `S_req` grows with conversation length (C11). Read it from
  `usage.request_bytes`, and compare the total against the VPS plan's included transfer.
- **Database writes per model request:** one rate-window upsert, two leases (insert and delete), one settlement
  transaction, and lease heartbeats.

**Load test before launch** (k6 against mock upstreams of both formats that stream, inject errors and drop
connections):

| Check | Pass condition |
|---|---|
| Added time to first byte (gateway vs direct upstream) | p99 within the owner's target |
| `/v1/models` | p99 far below 1 s (C4) |
| Streams, both formats | byte-for-byte equal to the mock |
| Settlement | exactly one `usage` row and at most one ledger row per request |
| Client abort | upstream request cancelled |
| Resources at target load | CPU and memory within the owner's headroom |

Choose the smallest VPS plan that passes with headroom. No plan size is claimed before the test.

---

## 17. Failure modes and runbook

| Failure | Effect | Response |
|---|---|---|
| Upstream down or erroring | 502s. The app retries (C12). | Alert on error rate. |
| Upstream credential rejected | 502 with `x-should-retry: false` | `PATCH /admin/upstreams/:id` with a new key. No restart needed. |
| Concurrency group full (U9) | 429 from the gateway. The app retries after `retry-after`. | Watch the in-flight metric. For DeepSeek, request a free capacity expansion (U9) and raise the group cap. |
| `tool_choice` `required` or named in DeepSeek thinking mode (U8) | 400 passed through | Phase 0 checks whether Context Code sends these. |
| Bad model row (wrong URL or upstream model) | Errors for that model only | `POST /admin/models/:id/test` before enabling. `disable` to withdraw it. |
| PostgreSQL down | 503 with `x-should-retry: true` | Restart the container, check the disk. |
| One gateway instance crashes | Caddy routes to the other. Leases expire. | Compose restart policy. |
| VPS down | All users down: the accepted single-VPS limit | Restore from backup on a new VPS. Re-supply `SECRETS_KEY`. |
| Admin token leaked | Catalog and credit changes are possible | `DELETE /admin/tokens/:id`. Review `admin_audit`. |
| Device key leaked | Misuse until revoked | `POST /admin/keys/revoke`. Effective within `KEY_CACHE_SECONDS`. |

**Alerts without paid services:**

- `/metrics` plus a cron check on the VPS that sends to a free channel, for example a Telegram bot.
- A liveness check of the VPS itself must run from **outside** it, for example on a machine you already operate.

---

## 18. Security and privacy

- No prompt or response bodies are logged or stored. `usage.raw_usage` holds token counts only.
- Device keys and admin tokens are 256-bit random values, stored as SHA-256 and shown once.
- Upstream keys are AES-256-GCM encrypted at rest (D9), never returned, and used only server-side.
- Accounts access tokens are used only on `POST /v1/auth/device-keys` and never stored.
- Events are verified with EdDSA, `iss`, `aud` and `jti` checks.
- TLS is mandatory. Caddy obtains certificates automatically. HSTS is not sent by default, so the site block adds the
  header (§14.3). `/admin/*` can be restricted to listed IPs.
- Static instructions and skills are public (D6).
- **Obligations from DeepSeek's terms (U13):**
  - Context Code's terms of service and privacy policy must exist before launch.
  - The privacy policy must state that prompts and code are sent to the model provider.
  - The app must disclose that output is AI-generated.
  - User management exists (device keys, plans, revocation).
- **Legal review** of selling access (O1). Repeat it for every new provider added through the admin API.

---

## 19. Testing

- **Phase 0, before M1** (answers O2; with an Anthropic-format endpoint, O8). With a DeepSeek API key, run the
  Appendix A settings on a fixed set of real Context Code tasks. Record:
  - time to first token and total time;
  - raw usage (O2(a));
  - whether tool calls work;
  - whether Context Code sends `tool_choice` `required` or named (U8);
  - whether image input is accepted (O2(b)).
- **Unit:** both usage parsers (split chunks, `[DONE]`, comments, missing usage), both cost formulas, both rewrites,
  secret encryption round-trip, admin input validation.
- **Integration** (Compose test profile, with mock upstreams of both formats):
  - pass-through is byte-identical;
  - settlement is exactly once under retries and restarts;
  - an abort cancels the upstream;
  - `model_format_mismatch` is returned for a model at the other endpoint;
  - every status maps as §10 says, asserted with the app's own `classifyProviderFailure` from `@contextcode/ai`;
  - admin writes reach both processes within `CATALOG_REFRESH_SECONDS`;
  - the audit log redacts secrets.
- **Load:** §16.
- **End to end:** a dev build of Context Code against a staging hostname, with one OpenAI-format and one
  Anthropic-format model.

---

## 20. Context Code changes required

| ID | Change | Where |
|---|---|---|
| A1 | Point `contextser` at the gateway, through `providers.contextser.settings.baseURL` (already supported, C1) or a new default in shipped builds (O6). | `contextser.ts` or the default config |
| A2 | The `contextser` plugin reads its key from the Credential service when config has none. Desktop stores the key with `POST /api/credential` (C17). The alternative, desktop editing the user's JSONC config, is not recommended. | `packages/core/src/plugin/provider/local.ts` / `contextser.ts`; desktop main |
| A3 | Read `name` and `protocol` from discovery. Use `name` as the display name. For `protocol: "anthropic"`, set `model.package = "@contextcode/ai/providers/anthropic-compatible"` (§9, C5). | `contextser.ts`, `local.ts` (model update) |
| A4 | Call `make()` with a longer interval for `contextser`, such as 5 minutes. The 1 s timeout (C4) still applies. | `contextser.ts` |
| A5 | Device-key lifecycle in desktop main. After sign-in: mint a key and store it (A2). On sign-out: `DELETE /v1/auth/device-keys/current` and remove the credential. On a 401 from the gateway: treat the user as signed out. | `packages/desktop/src/main/account/contextser.ts`, `ipc-handlers/account.ts` |
| A6 | Default config (the hostname is a placeholder until O7): `model: contextser/context-spark`, `agents.title.model: contextser/context-neo`, `instructions: ["https://api.contextser.com/instructions/context-code.md"]`, `skills: ["https://api.contextser.com/skills/"]`. | per O6 |
| A7 (later) | Show the balance from `GET /v1/account`, and on 402 a message that leads to top-up. | app UI |

**Later, not in scope here:**

- Per-model agent behaviour. Agent `steps` exist, but per agent (`packages/schema/src/config/agent.ts`).
- Per-device revocation from `sid`.
- Translation between formats.
- A second VPS.
- An admin web UI on top of §8.

---

## 21. Milestones

| Milestone | Content |
|---|---|
| M0 | Phase-0 measurements on the DeepSeek API. Resolve O2. Start the legal review (O1). |
| M1 | Gateway core: admin API (§8), catalog, `/v1/models`, both model endpoints, device keys, schema, metering without enforcement. |
| M2 | Credits enforcement, rate limits and concurrency groups, the events endpoint. Resolve O3 and O4. |
| M3 | App changes A1–A6. Resolve O6. |
| M4 | Deploy on the VPS: Caddy, backups, alerts, load test, runbook. Resolve O7. |
| M5 | Top-ups from payments (O5), then A7. Anthropic-format models once O8 is answered. |

---

## Appendix A — Creating the first models through the admin API

These are proposals, to be confirmed by Phase 0. Prices are placeholders for O3. `context_window` also controls when
Context Code compacts the conversation, because the app takes the model's context limit from discovery (`local.ts`).

```http
PUT /admin/concurrency-groups/deepseek-main
{ "max_concurrent": 2000 }

POST /admin/upstreams
{ "id": "deepseek-openai", "protocol": "openai",
  "endpoint_url": "https://api.deepseek.com/chat/completions",
  "auth_header": "authorization_bearer", "api_key": "<DeepSeek key>",
  "max_tokens_field": "max_tokens", "user_field": "user_id",
  "concurrency_group": "deepseek-main" }
```

`max_concurrent` 2000 leaves room under the account's 2500 (U9).

| `id` / `name` | `overrides` | `locked_fields` | `max_output` | Basis |
|---|---|---|---|---|
| `context-neo` / Context Neo | `{"thinking":{"type":"disabled"}}` | `thinking`, `reasoning_effort` | 8192 | The non-thinking default output (U5). Fastest; no reasoning tokens. |
| `context-spark` / Context Spark | `{"thinking":{"type":"enabled"},"reasoning_effort":"low"}` | same | 65536 | The thinking default output (U5) at the lowest thinking effort (U4). |
| `context-apex` / Context Apex | `{"thinking":{"type":"enabled"},"reasoning_effort":"max"}` | same | 131072 | The default output with `max` effort (U5). The deepest reasoning. |

Each row is created with:

```http
POST /admin/models
{ "id": "context-spark", "name": "Context Spark", "upstream_id": "deepseek-openai",
  "upstream_model": "deepseek-flash", "overrides": { … }, "locked_fields": ["thinking","reasoning_effort"],
  "max_output": 65536, "context_window": 1000000, "vision": false, "tools": true,
  "price_in": <O3>, "price_cached": <O3>, "price_out": <O3>, "enabled": false }
```

Run `POST /admin/models/context-spark/test`, then `PATCH` it to `"enabled": true`.

An Anthropic-format model on DeepSeek (U1) would use a second upstream with `"protocol": "anthropic"`. Its
`endpoint_url`, `auth_header`, `version_header` and `user_field` depend on O8, so it is not given here.

## Appendix B — Sources (read 2026-10-30)

- DeepSeek API docs, home: https://api-docs.deepseek.com/
- Create chat completion (API reference): https://api-docs.deepseek.com/api/create-chat-completion
- Models & Pricing: https://api-docs.deepseek.com/quick_start/pricing
- Rate Limit & Isolation: https://api-docs.deepseek.com/quick_start/rate_limit
- DeepSeek Open Platform Terms of Service: https://cdn.deepseek.com/policies/en-US/deepseek-open-platform-terms-of-service.html
- accounts.contextser.com OIDC discovery: https://accounts.contextser.com/api/.well-known/openid-configuration
