import { createHash, randomBytes } from "node:crypto"
import { createServer, type Server } from "node:http"
import { readFile, rm, writeFile } from "node:fs/promises"
import { join } from "node:path"
import { app, safeStorage, shell } from "electron"

/**
 * Signing in to Context Code with a Contextser account (accounts.contextser.com), as a public OAuth client: no secret,
 * PKCE on every request, the code delivered to a loopback listener.
 *
 * The listener uses one fixed port because the provider matches the redirect URI exactly, port included, even though
 * it registers loopback clients without one. The system browser does the sign-in, never a webview: Google refuses
 * embedded views and passkeys need the real browser.
 */

const issuer = "https://accounts.contextser.com"
const endpoints = {
  // The provider serves discovery under /api, where generic OIDC libraries do not look, so the endpoints are fixed here.
  authorize: `${issuer}/oauth/authorize`,
  token: `${issuer}/api/oauth/token`,
  userinfo: `${issuer}/api/userinfo`,
  revoke: `${issuer}/api/oauth/revoke`,
}
const port = 47823
const redirectUri = `http://127.0.0.1:${port}/callback`
const scope = "openid profile email"
// Sign-in waits this long for the browser before giving up.
const signInTimeout = 5 * 60_000

// Contextser issues each product a live and a sandbox client; which one signs in comes from
// CONTEXTCODE_ACCOUNTS_ENV or MAIN_VITE_CONTEXTSER_ENV, live by default. Their ids and secrets live in the untracked
// packages/desktop/.env.local, never in the source. Sandbox credentials may use the loopback callback; live ones may
// not, so live sign-in needs its client registered as a public client (no secret) with this callback.
const environment =
  (process.env.CONTEXTCODE_ACCOUNTS_ENV ?? import.meta.env.MAIN_VITE_CONTEXTSER_ENV) === "sandbox" ? "sandbox" : "live"
const credentials =
  environment === "sandbox"
    ? {
        id: import.meta.env.MAIN_VITE_CONTEXTSER_SANDBOX_CLIENT_ID,
        secret: import.meta.env.MAIN_VITE_CONTEXTSER_SANDBOX_CLIENT_SECRET,
      }
    : {
        id: import.meta.env.MAIN_VITE_CONTEXTSER_LIVE_CLIENT_ID,
        secret: import.meta.env.MAIN_VITE_CONTEXTSER_LIVE_CLIENT_SECRET,
      }
// Signing in is required either way: without an id the gate stays up and sign-in reports that it is not configured.
const clientId = process.env.CONTEXTCODE_ACCOUNTS_CLIENT_ID ?? credentials.id ?? ""
// A confidential client proves itself with its secret as well as PKCE; a public one sends none.
const client = (): Record<string, string> =>
  credentials.secret ? { client_id: clientId, client_secret: credentials.secret } : { client_id: clientId }

export type AccountProfile = { sub: string; name?: string; email?: string; picture?: string }

type Stored = { refreshToken: string; accessToken: string; expiresAt: number; profile: AccountProfile }

// One file per environment, so sandbox tokens never stand in for a live session.
const storePath = () => join(app.getPath("userData"), `contextser-account-${environment}.bin`)

let pending: { server: Server; finish: (error: string) => void } | undefined
let refreshing: Promise<Stored | undefined> | undefined

/** Who is signed in, refreshing an expired access token first. Offline, the last known profile stands. */
export async function accountSession() {
  const stored = await load()

  if (!stored) return { required: true, profile: null }

  if (stored.expiresAt > Date.now() + 30_000) return { required: true, profile: stored.profile }
  const fresh = await refresh(stored)

  return { required: true, profile: fresh?.profile ?? null }
}

export async function signIn(): Promise<{ profile: AccountProfile | null; error?: string }> {
  if (!clientId) return { profile: null, error: "sign-in is not configured for this build yet" }
  pending?.finish("cancelled")
  const verifier = base64url(randomBytes(32))
  const state = base64url(randomBytes(16))
  const challenge = base64url(createHash("sha256").update(verifier).digest())

  const code = await new Promise<{ code?: string; error?: string }>((resolve) => {
    const server = createServer((request, response) => {
      const url = new URL(request.url ?? "/", redirectUri)

      if (url.pathname !== "/callback") {
        response.writeHead(404, { connection: "close" }).end()
        return
      }
      const error = url.searchParams.get("error")
      const ok = !error && url.searchParams.get("state") === state && !!url.searchParams.get("code")
      // No keep-alive: a browser reuses an open connection, which would carry the next sign-in's callback to this
      // listener after it has finished instead of to the new one.
      response.writeHead(200, { "content-type": "text/html; charset=utf-8", connection: "close" }).end(page(ok))
      finish(ok ? undefined : (url.searchParams.get("error_description") ?? error ?? "state mismatch"))

      if (ok) resolve({ code: url.searchParams.get("code") ?? undefined })
    })
    const timer = setTimeout(() => finish("timed out"), signInTimeout)
    let done = false

    function finish(error: string | undefined) {
      if (done) return
      done = true
      clearTimeout(timer)
      server.close()
      server.closeAllConnections()
      pending = undefined

      if (error) resolve({ error })
    }

    pending = { server, finish }
    server.once("error", (error: NodeJS.ErrnoException) =>
      finish(error.code === "EADDRINUSE" ? `port ${port} is in use` : error.message),
    )
    server.listen(port, "127.0.0.1", () => {
      const url = new URL(endpoints.authorize)
      url.search = new URLSearchParams({
        response_type: "code",
        client_id: clientId,
        redirect_uri: redirectUri,
        scope,
        state,
        code_challenge: challenge,
        code_challenge_method: "S256",
      }).toString()
      void shell.openExternal(url.toString())
    })
  })

  if (!code.code) return { profile: null, error: code.error }
  const tokens = await exchange({
    grant_type: "authorization_code",
    code: code.code,
    redirect_uri: redirectUri,
    code_verifier: verifier,
  })

  if ("offline" in tokens) return { profile: null, error: "could not reach accounts.contextser.com" }

  if ("error" in tokens) return { profile: null, error: tokens.error }
  const profile = await userinfo(tokens.access_token)

  if (!profile) return { profile: null, error: "could not read the account" }
  await save({ ...stored(tokens), profile })

  return { profile }
}

export function cancelSignIn() {
  pending?.finish("cancelled")
}

/** Revokes the refresh token so it cannot be replayed, then forgets the account here. */
export async function signOut() {
  const current = await load()
  await rm(storePath(), { force: true })

  if (!current) return
  await fetch(endpoints.revoke, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ token: current.refreshToken, token_type_hint: "refresh_token", ...client() }),
  }).catch(() => undefined)
}

// One refresh at a time: the provider rotates refresh tokens and treats a replayed one as theft, ending the session
// everywhere, so two overlapping refreshes would sign the person out.
function refresh(current: Stored) {
  refreshing ??= (async () => {
    const tokens = await exchange({ grant_type: "refresh_token", refresh_token: current.refreshToken })

    if ("offline" in tokens) return current

    if ("error" in tokens) {
      await rm(storePath(), { force: true })
      return undefined
    }
    const next = { ...stored(tokens, current.refreshToken), profile: current.profile }
    // Saved before anything else can fail, so a crash never leaves the rotated-out token as the only copy.
    await save(next)
    const profile = await userinfo(next.accessToken)

    if (!profile) return next
    const updated = { ...next, profile }
    await save(updated)

    return updated
  })().finally(() => {
    refreshing = undefined
  })

  return refreshing
}

type TokenResponse = { access_token: string; refresh_token?: string; expires_in?: number }

async function exchange(body: Record<string, string>): Promise<TokenResponse | { error: string } | { offline: true }> {
  const response = await fetch(endpoints.token, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded", accept: "application/json" },
    body: new URLSearchParams({ ...body, ...client() }),
  }).catch(() => undefined)

  if (!response) return { offline: true }
  const json = (await response.json().catch(() => ({}))) as Partial<TokenResponse> & {
    error?: string
    error_description?: string
  }

  if (!response.ok || !json.access_token)
    return { error: json.error_description ?? json.error ?? `token request failed (${response.status})` }

  return { access_token: json.access_token, refresh_token: json.refresh_token, expires_in: json.expires_in }
}

function stored(tokens: TokenResponse, previousRefresh?: string): Omit<Stored, "profile"> {
  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token ?? previousRefresh ?? "",
    expiresAt: Date.now() + (tokens.expires_in ?? 600) * 1000,
  }
}

async function userinfo(accessToken: string): Promise<AccountProfile | undefined> {
  const response = await fetch(endpoints.userinfo, { headers: { authorization: `Bearer ${accessToken}` } }).catch(
    () => undefined,
  )

  if (!response?.ok) return
  const json = (await response.json().catch(() => undefined)) as Record<string, unknown> | undefined

  if (!json || typeof json.sub !== "string") return
  const text = (key: string) => (typeof json[key] === "string" ? (json[key] as string) : undefined)

  return { sub: json.sub, name: text("name"), email: text("email"), picture: text("picture") }
}

// Tokens are encrypted with the OS keychain's key; without one they are not written at all.
async function save(value: Stored) {
  if (!safeStorage.isEncryptionAvailable()) return
  await writeFile(storePath(), safeStorage.encryptString(JSON.stringify(value)))
}

async function load(): Promise<Stored | undefined> {
  if (!safeStorage.isEncryptionAvailable()) return
  const data = await readFile(storePath()).catch(() => undefined)

  if (!data) return
  // A file another keychain key wrote, or a damaged one, reads as signed out rather than failing startup.
  const value = await Promise.resolve()
    .then(() => JSON.parse(safeStorage.decryptString(data)) as Partial<Stored>)
    .catch(() => undefined)

  if (!value?.refreshToken || !value.profile?.sub) return

  return value as Stored
}

function base64url(buffer: Buffer) {
  return buffer.toString("base64url")
}

function page(ok: boolean) {
  const title = ok ? "You're signed in" : "Sign-in didn't finish"
  const body = ok ? "You can close this tab and return to Context Code." : "Return to Context Code and try again."

  return `<!doctype html><meta charset="utf-8"><title>${title}</title><style>body{margin:0;display:grid;place-items:center;height:100vh;font:15px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#f6f6f9;color:#141414}main{text-align:center}h1{font-size:22px;margin:0 0 6px}p{margin:0;color:#494852}</style><main><h1>${title}</h1><p>${body}</p></main>`
}
