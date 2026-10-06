import { Router, Request, Response } from 'express';
import { rateLimit } from 'express-rate-limit';
import { randomBytes, createHash, randomUUID } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

/**
 * OAuth 2.1 wrapper around Home Assistant's own OAuth authorization server.
 *
 * Home Assistant already implements a full OAuth2 authorization-code flow at
 * /auth/authorize and /auth/token (the same flow the official mobile app and
 * other third-party integrations use). This module does NOT reimplement login
 * or token issuance — it proxies the flow so that generic MCP clients like
 * claude.ai, which speak the MCP Authorization Spec, can complete it:
 *
 *   claude.ai --(1) authorize--> THIS SERVER --(2) redirect--> HA /auth/authorize
 *   user logs into HA in the browser as normal
 *   HA --(3) redirect w/ code--> THIS SERVER /callback
 *   THIS SERVER --(4) exchange code--> HA /auth/token --> real HA access_token
 *   THIS SERVER --(5) redirect w/ our own code--> claude.ai
 *   claude.ai --(6) POST /token--> THIS SERVER --> returns the real HA access_token
 *
 * Because step 6 hands back a genuine Home Assistant access token, the
 * existing authenticateToken middleware (src/auth/home-assistant-auth.ts)
 * needs zero changes — it already validates any bearer token against
 * GET /api/config.
 *
 * State is kept in memory only. This is fine for a single-tenant local addon;
 * entries are short-lived and pruned on use / expiry.
 */

interface PendingAuthorization {
  clientRedirectUri: string;
  clientState?: string;
  codeChallenge: string;
  codeChallengeMethod?: string;
  createdAt: number;
  // The client_id/redirect_uri WE told Home Assistant for this specific
  // flow, derived from the request that hit /authorize. Stored here (rather
  // than recomputed in /callback) so the token exchange always uses exactly
  // what HA was actually given, regardless of which host serves /callback.
  ourHaClientId: string;
  ourHaRedirectUri: string;
  clientId: string;
  // Where to send the user's browser to log into Home Assistant; only
  // followed once the redirect_uri has been approved (consent step, or
  // admin-allowlisted redirect_uri).
  haAuthorizeUrl: string;
  approved: boolean;
}

interface IssuedCode {
  haAccessToken: string;
  haRefreshToken?: string;
  haExpiresIn: number;
  codeChallenge: string;
  codeChallengeMethod?: string;
  createdAt: number;
}

interface RegisteredClient {
  clientName?: string;
  redirectUris: string[];
  createdAt: number;
}

const PENDING_TTL_MS = 5 * 60 * 1000; // 5 minutes to complete login
const CODE_TTL_MS = 60 * 1000; // 60 seconds to redeem our own code
const HA_PUBLIC_URL_CACHE_MS = 5 * 60 * 1000; // re-check HA's external_url occasionally, in case it changes

export function isLoopbackRedirect(uri: string): boolean {
  try {
    const parsed = new URL(uri);
    return (
      parsed.protocol === 'http:' &&
      (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1' || parsed.hostname === '[::1]')
    );
  } catch {
    return false;
  }
}

// Schemes that can execute code or never make sense as an OAuth callback.
const FORBIDDEN_REDIRECT_SCHEMES = new Set([
  'javascript:', 'data:', 'vbscript:', 'file:', 'about:', 'blob:', 'ftp:', 'ws:', 'wss:',
]);

/**
 * Generic redirect_uri sanity check used at dynamic client registration:
 * https URLs, http loopback (native apps, RFC 8252 7.3) and private-use
 * custom schemes (RFC 8252 7.1) are accepted; fragments, credentials, and
 * dangerous or plaintext non-loopback schemes are rejected.
 */
export function isValidRedirectUri(uri: unknown): uri is string {
  if (typeof uri !== 'string' || uri.length === 0 || uri.length > 2048) return false;
  let parsed: URL;
  try {
    parsed = new URL(uri);
  } catch {
    return false;
  }
  if (parsed.hash) return false;
  if (parsed.protocol === 'https:') return !parsed.username && !parsed.password;
  if (parsed.protocol === 'http:') return isLoopbackRedirect(uri);
  return !FORBIDDEN_REDIRECT_SCHEMES.has(parsed.protocol);
}

/**
 * Strict mode (optional): only loopback redirects and explicitly allowlisted
 * redirect_uris may be registered/used. Otherwise any valid redirect_uri that
 * the client registered is accepted.
 */
export function isAllowedRedirectUri(uri: string, extraAllowed: string[], strict = false): boolean {
  if (!isValidRedirectUri(uri)) return false;
  if (!strict) return true;
  return isLoopbackRedirect(uri) || extraAllowed.includes(uri);
}

// Compares browser Origin headers (no path) against loopback and the
// allowlist — only used to scope CORS on /token and /register in strict mode.
export function isAllowedOrigin(origin: string | undefined, extraAllowed: string[]): boolean {
  if (!origin) return false;
  if (isLoopbackRedirect(`${origin}/`)) return true;
  return extraAllowed.some((uri) => {
    try {
      return new URL(uri).origin === origin;
    } catch {
      return false;
    }
  });
}

// In strict mode, overrides the app-wide CORS policy so /token and /register
// are only reachable from trusted browser origins.
function applyRestrictedCors(req: Request, res: Response, extraAllowed: string[]): void {
  res.setHeader('Vary', 'Origin');
  const origin = req.headers.origin;
  if (origin && isAllowedOrigin(origin, extraAllowed)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    res.removeHeader('Access-Control-Allow-Origin');
  }
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
}

/**
 * This addon's own public URL, derived from the incoming request rather than
 * a static setting. Requires a `trust proxy` setting upstream so
 * req.protocol/req.get('host') reflect X-Forwarded-Proto/Host from the
 * Cloudflare Tunnel (or any reverse proxy) instead of the internal address.
 * An explicit override (public_url addon option) always wins, for setups
 * where the proxy doesn't forward those headers correctly.
 */
export function derivePublicUrl(req: Request, override: string): string {
  if (override) return override.replace(/\/$/, '');
  const host = req.get('host');
  if (!host) {
    throw new Error('Could not determine this addon\'s public URL: no Host header on the request, and no public_url override configured.');
  }
  return `${req.protocol}://${host}`;
}

let cachedHaPublicUrl: string | null = null;
let cachedHaPublicUrlAt = 0;

/**
 * Home Assistant's own public URL. Auto-detected via HA's REST API
 * (GET /api/config → external_url), using the SUPERVISOR_TOKEN that the
 * Supervisor injects automatically when the addon's config.yaml sets
 * `homeassistant_api: true` — no user-provided credential needed. An
 * explicit override (ha_public_url addon option) always wins and skips
 * this entirely.
 */
export async function resolveHaPublicUrl(override: string): Promise<string> {
  if (override) return override.replace(/\/$/, '');

  const now = Date.now();
  if (cachedHaPublicUrl && now - cachedHaPublicUrlAt < HA_PUBLIC_URL_CACHE_MS) {
    return cachedHaPublicUrl;
  }

  const supervisorToken = process.env.SUPERVISOR_TOKEN;
  if (!supervisorToken) {
    throw new Error(
      'Cannot auto-detect Home Assistant\'s public URL: SUPERVISOR_TOKEN is not set. ' +
      'Either add homeassistant_api: true to config.yaml and reinstall the addon, or set ha_public_url manually.'
    );
  }

  // Must go through the Supervisor's own proxy, not the user-configurable
  // ha_base_url — SUPERVISOR_TOKEN is only valid there, not against Home
  // Assistant Core directly (e.g. http://homeassistant:8123).
  const SUPERVISOR_CORE_URL = 'http://supervisor/core';
  const response = await fetch(`${SUPERVISOR_CORE_URL}/api/config`, {
    headers: { Authorization: `Bearer ${supervisorToken}` },
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok) {
    throw new Error(`Auto-detecting Home Assistant's public URL failed (HTTP ${response.status} from ${SUPERVISOR_CORE_URL}/api/config).`);
  }

  const config = await response.json() as { external_url?: string | null };
  if (!config.external_url) {
    throw new Error(
      'Home Assistant has no external_url configured (Settings → System → Network → "External URL"). ' +
      'Set that in Home Assistant, or set ha_public_url manually in this addon\'s configuration.'
    );
  }

  cachedHaPublicUrl = config.external_url.replace(/\/$/, '');
  cachedHaPublicUrlAt = now;
  return cachedHaPublicUrl;
}

const pendingAuthorizations = new Map<string, PendingAuthorization>();
const issuedCodes = new Map<string, IssuedCode>();
// No TTL: registrations are rare (once per connector setup) and must survive
// as long as the process runs, or a client's stored client_id would stop
// working until it re-registers. Capped (oldest evicted) and, when possible,
// persisted to disk so they also survive addon restarts.
const MAX_REGISTERED_CLIENTS = 500;
const registeredClients = new Map<string, RegisteredClient>();

function loadClients(file: string): void {
  try {
    const entries = JSON.parse(readFileSync(file, 'utf8')) as Array<[string, RegisteredClient]>;
    for (const [id, client] of entries) registeredClients.set(id, client);
  } catch {
    // no/invalid file: start empty
  }
}

function saveClients(file: string): void {
  try {
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, JSON.stringify([...registeredClients]), { mode: 0o600 });
  } catch {
    // best effort: stay in-memory if the location is not writable
  }
}

function pruneExpired<T extends { createdAt: number }>(map: Map<string, T>, ttlMs: number) {
  const now = Date.now();
  for (const [key, value] of map) {
    if (now - value.createdAt > ttlMs) {
      map.delete(key);
    }
  }
}

export function base64url(input: Buffer): string {
  return input.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function verifyPkce(codeVerifier: string, codeChallenge: string, method: string): boolean {
  if (method === 'plain') {
    return codeVerifier === codeChallenge;
  }
  // S256 (the only method claude.ai / the MCP spec requires support for)
  const hash = createHash('sha256').update(codeVerifier).digest();
  return base64url(hash) === codeChallenge;
}

export function createOAuthRouter(options: {
  /**
   * Override for this addon's own public URL. Leave empty to auto-derive it
   * per-request from the incoming Host header / X-Forwarded-Proto (requires
   * a suitable `trust proxy` setting on the Express app).
   */
  publicUrlOverride?: string;
  /**
   * Override for Home Assistant's public URL. Leave empty to auto-detect via
   * HA's own /api/config (external_url), using the Supervisor-injected token.
   * Only used for the /authorize redirect, since that response goes to the
   * user's browser, which cannot resolve internal Docker hostnames.
   */
  haPublicUrlOverride?: string;
  /**
   * Internal/Docker-network URL of Home Assistant, e.g. http://homeassistant:8123
   * (no trailing slash). Used for the server-to-server code/token exchange in
   * /callback and the refresh_token grant, and for the Supervisor API call
   * used to auto-detect haPublicUrl — this traffic never touches the user's
   * browser, so it doesn't need to round-trip through the public tunnel.
   */
  haBaseUrl: string;
  /**
   * Trusted redirect_uris. These skip the consent page and, in strict mode,
   * are the only non-loopback redirect_uris that may be registered.
   */
  allowedRedirectUris?: string[];
  /** Only accept loopback and allowlisted redirect_uris (default false) */
  strictRedirectUris?: boolean;
  /** File used to persist registered clients across restarts (optional) */
  clientsFile?: string;
}): Router {
  const {
    publicUrlOverride = '',
    haPublicUrlOverride = '',
    haBaseUrl,
    allowedRedirectUris = [],
    strictRedirectUris = false,
    clientsFile,
  } = options;
  const router = Router();
  if (clientsFile) loadClients(clientsFile);
  const restrictCors = (req: Request, res: Response) => {
    if (strictRedirectUris) applyRestrictedCors(req, res, allowedRedirectUris);
  };

  // Unauthenticated-by-design endpoints (that's inherent to OAuth) are
  // otherwise unbounded per-IP; /register in particular has no TTL on what
  // it stores, so a flood would grow memory indefinitely without this.
  const registerLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: true, legacyHeaders: false });
  const authorizeLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: true, legacyHeaders: false });
  const tokenLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false });

  // Periodic sweep independent of request traffic — without this, entries
  // from abandoned/incomplete flows only get pruned the next time someone
  // hits /authorize, so a quiet server could accumulate them indefinitely.
  const sweepInterval = setInterval(() => {
    pruneExpired(pendingAuthorizations, PENDING_TTL_MS);
    pruneExpired(issuedCodes, CODE_TTL_MS);
  }, 60 * 1000);
  sweepInterval.unref(); // don't keep the process alive just for this timer

  // --- Discovery endpoints (required by the MCP Authorization Spec) ---

  router.get('/.well-known/oauth-authorization-server', (req: Request, res: Response) => {
    let publicUrl: string;
    try {
      publicUrl = derivePublicUrl(req, publicUrlOverride);
    } catch (error) {
      res.status(500).json({ error: 'server_error', error_description: String(error instanceof Error ? error.message : error) });
      return;
    }
    res.json({
      issuer: publicUrl,
      authorization_endpoint: `${publicUrl}/authorize`,
      token_endpoint: `${publicUrl}/token`,
      registration_endpoint: `${publicUrl}/register`,
      response_types_supported: ['code'],
      response_modes_supported: ['query'],
      grant_types_supported: ['authorization_code', 'refresh_token'],
      code_challenge_methods_supported: ['S256', 'plain'],
      token_endpoint_auth_methods_supported: ['none'],
    });
  });

  const protectedResourceHandler = (req: Request, res: Response) => {
    let publicUrl: string;
    try {
      publicUrl = derivePublicUrl(req, publicUrlOverride);
    } catch (error) {
      res.status(500).json({ error: 'server_error', error_description: String(error instanceof Error ? error.message : error) });
      return;
    }
    res.json({
      resource: `${publicUrl}/mcp`,
      authorization_servers: [publicUrl],
      bearer_methods_supported: ['header'],
      resource_name: 'PostgreSQL MCP Server',
    });
  };
  // RFC 9728: root form and the path-aware form for the /mcp resource.
  router.get('/.well-known/oauth-protected-resource', protectedResourceHandler);
  router.get('/.well-known/oauth-protected-resource/mcp', protectedResourceHandler);

  // --- Dynamic Client Registration (RFC 7591) ---
  // The MCP Authorization Spec expects servers to support this so clients
  // like claude.ai can obtain a client_id without any manual setup. Without
  // it, claude.ai's connector fails at the "sign-in service" step before
  // ever reaching /authorize.
  router.post('/register', registerLimiter, (req: Request, res: Response) => {
    restrictCors(req, res);

    const body = req.body as {
      redirect_uris?: string[];
      client_name?: string;
      grant_types?: string[];
      response_types?: string[];
    };

    const redirectUris = Array.isArray(body.redirect_uris) ? body.redirect_uris : [];
    if (redirectUris.length === 0) {
      res.status(400).json({ error: 'invalid_client_metadata', error_description: 'redirect_uris is required' });
      return;
    }

    const disallowed = redirectUris.filter((uri) => !isAllowedRedirectUri(uri, allowedRedirectUris, strictRedirectUris));
    if (disallowed.length > 0) {
      res.status(400).json({
        error: 'invalid_redirect_uri',
        error_description: strictRedirectUris
          ? `redirect_uri not accepted (strict mode: loopback or allowlisted only): ${disallowed.map(String).join(', ')}`
          : `redirect_uri must be https, http loopback, or a custom app scheme without fragment: ${disallowed.map(String).join(', ')}`,
      });
      return;
    }

    const clientId = `mcp-${base64url(randomBytes(16))}`;
    if (registeredClients.size >= MAX_REGISTERED_CLIENTS) {
      const oldest = registeredClients.keys().next().value;
      if (oldest !== undefined) registeredClients.delete(oldest);
    }
    registeredClients.set(clientId, {
      clientName: typeof body.client_name === 'string' ? body.client_name.slice(0, 100) : undefined,
      redirectUris,
      createdAt: Date.now(),
    });
    if (clientsFile) saveClients(clientsFile);

    res.status(201).json({
      client_id: clientId,
      client_id_issued_at: Math.floor(Date.now() / 1000),
      redirect_uris: redirectUris,
      client_name: body.client_name,
      grant_types: body.grant_types?.length ? body.grant_types : ['authorization_code', 'refresh_token'],
      response_types: body.response_types?.length ? body.response_types : ['code'],
      token_endpoint_auth_method: 'none',
    });
  });

  // --- Step 1/2: claude.ai starts the flow, we hand off to HA's login ---

  router.get('/authorize', authorizeLimiter, async (req: Request, res: Response) => {
    pruneExpired(pendingAuthorizations, PENDING_TTL_MS);

    const {
      client_id: clientId,
      redirect_uri: clientRedirectUri,
      state: clientState,
      code_challenge: codeChallenge,
      code_challenge_method: codeChallengeMethod,
      response_type: responseType,
    } = req.query as Record<string, string | undefined>;

    if (responseType !== 'code' || !clientRedirectUri) {
      res.status(400).json({ error: 'invalid_request', error_description: 'response_type=code and redirect_uri are required' });
      return;
    }

    // The redirect_uri must exactly match one the client registered via
    // /register — checked BEFORE we ever redirect anywhere, to close the
    // open-redirect: an unregistered redirect_uri must never receive a Home
    // Assistant authorization code.
    const client = clientId ? registeredClients.get(clientId) : undefined;
    if (!client) {
      res.status(400).json({
        error: 'invalid_client',
        error_description: 'Unknown client_id; register via /register first',
      });
      return;
    }
    if (!client.redirectUris.includes(clientRedirectUri) || !isAllowedRedirectUri(clientRedirectUri, allowedRedirectUris, strictRedirectUris)) {
      res.status(400).json({
        error: 'invalid_request',
        error_description: 'redirect_uri does not match the client registration',
      });
      return;
    }

    // PKCE is mandatory (not optional) — without it, a leaked/intercepted
    // authorization code would be directly redeemable by anyone.
    if (!codeChallenge || (codeChallengeMethod && codeChallengeMethod !== 'S256' && codeChallengeMethod !== 'plain')) {
      res.status(400).json({
        error: 'invalid_request',
        error_description: 'code_challenge (PKCE, method S256) is required',
      });
      return;
    }

    let publicUrl: string;
    let haPublicUrl: string;
    try {
      publicUrl = derivePublicUrl(req, publicUrlOverride);
      haPublicUrl = await resolveHaPublicUrl(haPublicUrlOverride);
    } catch (error) {
      console.error('OAuth /authorize setup error:', error);
      res.status(500).json({
        error: 'server_error',
        error_description: String(error instanceof Error ? error.message : error),
      });
      return;
    }

    // Our own "client_id" for Home Assistant's local OAuth flow. HA's
    // implicit-trust model requires client_id to be a URL whose origin
    // matches redirect_uri's origin — using our own root URL satisfies that
    // with zero pre-registration in HA.
    const ourHaClientId = `${publicUrl}/`;
    const ourHaRedirectUri = `${publicUrl}/callback`;

    const ourState = randomUUID();
    const haAuthorizeUrl = new URL(`${haPublicUrl}/auth/authorize`);
    haAuthorizeUrl.searchParams.set('client_id', ourHaClientId);
    haAuthorizeUrl.searchParams.set('redirect_uri', ourHaRedirectUri);
    haAuthorizeUrl.searchParams.set('state', ourState);
    pendingAuthorizations.set(ourState, {
      clientRedirectUri,
      clientState,
      codeChallenge,
      codeChallengeMethod,
      createdAt: Date.now(),
      ourHaClientId,
      ourHaRedirectUri,
      clientId: clientId as string,
      haAuthorizeUrl: haAuthorizeUrl.toString(),
      approved: allowedRedirectUris.includes(clientRedirectUri),
    });

    if (allowedRedirectUris.includes(clientRedirectUri)) {
      res.redirect(haAuthorizeUrl.toString());
      return;
    }

    // Dynamic registration is open, so anyone can register a redirect_uri.
    // Ask the user to confirm where they will be sent before starting login.
    let destination = clientRedirectUri;
    try {
      const parsed = new URL(clientRedirectUri);
      destination = parsed.origin !== 'null' ? parsed.origin : `${parsed.protocol}//`;
    } catch { /* validated above */ }
    res.status(200).type('html').send(`<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Authorize access</title></head>
<body style="font-family:sans-serif;max-width:32em;margin:3em auto;padding:0 1em">
<h1>Authorize access</h1>
<p><strong>${escapeHtml(client.clientName || 'An application')}</strong> wants to connect to your PostgreSQL MCP Server using your Home Assistant account.</p>
<p>After you sign in, you will be sent to:<br><code>${escapeHtml(destination)}</code></p>
<p>Only continue if you started this connection yourself.</p>
<form method="post" action="/authorize/consent">
<input type="hidden" name="request_id" value="${escapeHtml(ourState)}">
<button type="submit" name="decision" value="approve">Approve</button>
<button type="submit" name="decision" value="deny">Deny</button>
</form></body></html>`);
  });

  router.post('/authorize/consent', authorizeLimiter, (req: Request, res: Response) => {
    const { request_id: requestId, decision } = (req.body || {}) as Record<string, string | undefined>;
    const pending = requestId ? pendingAuthorizations.get(requestId) : undefined;
    if (!requestId || !pending || Date.now() - pending.createdAt > PENDING_TTL_MS) {
      res.status(400).send('Unknown or expired authorization request. Please retry connecting.');
      return;
    }
    if (decision !== 'approve') {
      pendingAuthorizations.delete(requestId);
      res.status(200).send('Access denied. You can close this window.');
      return;
    }
    pending.approved = true;
    res.redirect(pending.haAuthorizeUrl);
  });

  // --- Step 3/4: HA redirects back here with its own code; we exchange it ---

  router.get('/callback', async (req: Request, res: Response) => {
    const { code: haCode, state: ourState } = req.query as Record<string, string | undefined>;

    if (!haCode || !ourState) {
      res.status(400).send('Missing code or state from Home Assistant');
      return;
    }

    const pending = pendingAuthorizations.get(ourState);
    pendingAuthorizations.delete(ourState);

    if (!pending || !pending.approved) {
      res.status(400).send('Unknown or expired authorization request. Please retry connecting from your MCP client.');
      return;
    }

    try {
      const tokenResponse = await fetch(`${haBaseUrl}/auth/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code: haCode,
          client_id: pending.ourHaClientId,
        }),
        signal: AbortSignal.timeout(10000),
      });

      if (!tokenResponse.ok) {
        const errBody = await tokenResponse.text();
        console.error('HA token exchange failed:', tokenResponse.status, errBody);
        res.status(502).send('Home Assistant rejected the token exchange. Check ha_public_url and that the addon is reachable at public_url.');
        return;
      }

      const haTokens = await tokenResponse.json() as {
        access_token: string;
        refresh_token?: string;
        expires_in: number;
      };

      pruneExpired(issuedCodes, CODE_TTL_MS);
      const ourCode = base64url(randomBytes(32));
      issuedCodes.set(ourCode, {
        haAccessToken: haTokens.access_token,
        haRefreshToken: haTokens.refresh_token,
        haExpiresIn: haTokens.expires_in,
        codeChallenge: pending.codeChallenge,
        codeChallengeMethod: pending.codeChallengeMethod,
        createdAt: Date.now(),
      });

      const redirectBack = new URL(pending.clientRedirectUri);
      redirectBack.searchParams.set('code', ourCode);
      if (pending.clientState) {
        redirectBack.searchParams.set('state', pending.clientState);
      }

      res.redirect(redirectBack.toString());
    } catch (error) {
      console.error('OAuth callback error:', error);
      res.status(500).send('Internal error completing Home Assistant login.');
    }
  });

  // --- Step 5/6: claude.ai redeems our code (or refreshes) for the real HA token ---

  router.post('/token', tokenLimiter, async (req: Request, res: Response) => {
    restrictCors(req, res);

    const { grant_type: grantType } = req.body as Record<string, string | undefined>;

    if (grantType === 'authorization_code') {
      const { code, code_verifier: codeVerifier } = req.body as Record<string, string | undefined>;

      if (!code) {
        res.status(400).json({ error: 'invalid_request', error_description: 'code is required' });
        return;
      }

      const issued = issuedCodes.get(code);
      if (!issued) {
        res.status(400).json({ error: 'invalid_grant', error_description: 'Unknown, expired, or already-used code' });
        return;
      }
      issuedCodes.delete(code); // codes are single-use

      // PKCE is mandatory (enforced already at /authorize, where every issued
      // code is guaranteed to have a codeChallenge) — verify unconditionally
      // rather than only "if present", so a missing verifier always fails
      // closed instead of silently skipping the check.
      if (!codeVerifier || !verifyPkce(codeVerifier, issued.codeChallenge, issued.codeChallengeMethod || 'S256')) {
        res.status(400).json({ error: 'invalid_grant', error_description: 'PKCE verification failed' });
        return;
      }

      res.json({
        access_token: issued.haAccessToken,
        token_type: 'Bearer',
        expires_in: issued.haExpiresIn,
        refresh_token: issued.haRefreshToken,
      });
      return;
    }

    if (grantType === 'refresh_token') {
      const { refresh_token: refreshToken } = req.body as Record<string, string | undefined>;

      if (!refreshToken) {
        res.status(400).json({ error: 'invalid_request', error_description: 'refresh_token is required' });
        return;
      }

      let publicUrl: string;
      try {
        publicUrl = derivePublicUrl(req, publicUrlOverride);
      } catch (error) {
        res.status(500).json({ error: 'server_error', error_description: String(error instanceof Error ? error.message : error) });
        return;
      }

      try {
        const tokenResponse = await fetch(`${haBaseUrl}/auth/token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: refreshToken,
            client_id: `${publicUrl}/`,
          }),
          signal: AbortSignal.timeout(10000),
        });

        if (!tokenResponse.ok) {
          res.status(400).json({ error: 'invalid_grant', error_description: 'Home Assistant rejected the refresh token' });
          return;
        }

        const haTokens = await tokenResponse.json() as { access_token: string; expires_in: number };

        res.json({
          access_token: haTokens.access_token,
          token_type: 'Bearer',
          expires_in: haTokens.expires_in,
          refresh_token: refreshToken, // HA refresh tokens are long-lived / reusable
        });
      } catch (error) {
        console.error('OAuth refresh error:', error);
        res.status(500).json({ error: 'server_error' });
      }
      return;
    }

    res.status(400).json({ error: 'unsupported_grant_type' });
  });

  return router;
}
