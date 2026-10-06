"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isLoopbackRedirect = isLoopbackRedirect;
exports.isValidRedirectUri = isValidRedirectUri;
exports.isAllowedRedirectUri = isAllowedRedirectUri;
exports.isAllowedOrigin = isAllowedOrigin;
exports.derivePublicUrl = derivePublicUrl;
exports.resolveHaPublicUrl = resolveHaPublicUrl;
exports.base64url = base64url;
exports.verifyPkce = verifyPkce;
exports.createOAuthRouter = createOAuthRouter;
const express_1 = require("express");
const express_rate_limit_1 = require("express-rate-limit");
const node_crypto_1 = require("node:crypto");
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const PENDING_TTL_MS = 5 * 60 * 1000; // 5 minutes to complete login
const CODE_TTL_MS = 60 * 1000; // 60 seconds to redeem our own code
const HA_PUBLIC_URL_CACHE_MS = 5 * 60 * 1000; // re-check HA's external_url occasionally, in case it changes
function isLoopbackRedirect(uri) {
    try {
        const parsed = new URL(uri);
        return (parsed.protocol === 'http:' &&
            (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1' || parsed.hostname === '[::1]'));
    }
    catch {
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
function isValidRedirectUri(uri) {
    if (typeof uri !== 'string' || uri.length === 0 || uri.length > 2048)
        return false;
    let parsed;
    try {
        parsed = new URL(uri);
    }
    catch {
        return false;
    }
    if (parsed.hash)
        return false;
    if (parsed.protocol === 'https:')
        return !parsed.username && !parsed.password;
    if (parsed.protocol === 'http:')
        return isLoopbackRedirect(uri);
    return !FORBIDDEN_REDIRECT_SCHEMES.has(parsed.protocol);
}
/**
 * Strict mode (optional): only loopback redirects and explicitly allowlisted
 * redirect_uris may be registered/used. Otherwise any valid redirect_uri that
 * the client registered is accepted.
 */
function isAllowedRedirectUri(uri, extraAllowed, strict = false) {
    if (!isValidRedirectUri(uri))
        return false;
    if (!strict)
        return true;
    return isLoopbackRedirect(uri) || extraAllowed.includes(uri);
}
// Compares browser Origin headers (no path) against loopback and the
// allowlist — only used to scope CORS on /token and /register in strict mode.
function isAllowedOrigin(origin, extraAllowed) {
    if (!origin)
        return false;
    if (isLoopbackRedirect(`${origin}/`))
        return true;
    return extraAllowed.some((uri) => {
        try {
            return new URL(uri).origin === origin;
        }
        catch {
            return false;
        }
    });
}
// In strict mode, overrides the app-wide CORS policy so /token and /register
// are only reachable from trusted browser origins.
function applyRestrictedCors(req, res, extraAllowed) {
    res.setHeader('Vary', 'Origin');
    const origin = req.headers.origin;
    if (origin && isAllowedOrigin(origin, extraAllowed)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    }
    else {
        res.removeHeader('Access-Control-Allow-Origin');
    }
}
function escapeHtml(value) {
    return value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
/**
 * This addon's own public URL, derived from the incoming request rather than
 * a static setting. Requires a `trust proxy` setting upstream so
 * req.protocol/req.get('host') reflect X-Forwarded-Proto/Host from the
 * Cloudflare Tunnel (or any reverse proxy) instead of the internal address.
 * An explicit override (public_url addon option) always wins, for setups
 * where the proxy doesn't forward those headers correctly.
 */
function derivePublicUrl(req, override) {
    if (override)
        return override.replace(/\/$/, '');
    const host = req.get('host');
    if (!host) {
        throw new Error('Could not determine this addon\'s public URL: no Host header on the request, and no public_url override configured.');
    }
    return `${req.protocol}://${host}`;
}
let cachedHaPublicUrl = null;
let cachedHaPublicUrlAt = 0;
/**
 * Home Assistant's own public URL. Auto-detected via HA's REST API
 * (GET /api/config → external_url), using the SUPERVISOR_TOKEN that the
 * Supervisor injects automatically when the addon's config.yaml sets
 * `homeassistant_api: true` — no user-provided credential needed. An
 * explicit override (ha_public_url addon option) always wins and skips
 * this entirely.
 */
async function resolveHaPublicUrl(override) {
    if (override)
        return override.replace(/\/$/, '');
    const now = Date.now();
    if (cachedHaPublicUrl && now - cachedHaPublicUrlAt < HA_PUBLIC_URL_CACHE_MS) {
        return cachedHaPublicUrl;
    }
    const supervisorToken = process.env.SUPERVISOR_TOKEN;
    if (!supervisorToken) {
        throw new Error('Cannot auto-detect Home Assistant\'s public URL: SUPERVISOR_TOKEN is not set. ' +
            'Either add homeassistant_api: true to config.yaml and reinstall the addon, or set ha_public_url manually.');
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
    const config = await response.json();
    if (!config.external_url) {
        throw new Error('Home Assistant has no external_url configured (Settings → System → Network → "External URL"). ' +
            'Set that in Home Assistant, or set ha_public_url manually in this addon\'s configuration.');
    }
    cachedHaPublicUrl = config.external_url.replace(/\/$/, '');
    cachedHaPublicUrlAt = now;
    return cachedHaPublicUrl;
}
const pendingAuthorizations = new Map();
const issuedCodes = new Map();
// No TTL: registrations are rare (once per connector setup) and must survive
// as long as the process runs, or a client's stored client_id would stop
// working until it re-registers. Capped (oldest evicted) and, when possible,
// persisted to disk so they also survive addon restarts.
const MAX_REGISTERED_CLIENTS = 500;
const registeredClients = new Map();
function loadClients(file) {
    try {
        const entries = JSON.parse((0, node_fs_1.readFileSync)(file, 'utf8'));
        for (const [id, client] of entries)
            registeredClients.set(id, client);
    }
    catch {
        // no/invalid file: start empty
    }
}
function saveClients(file) {
    try {
        (0, node_fs_1.mkdirSync)((0, node_path_1.dirname)(file), { recursive: true });
        (0, node_fs_1.writeFileSync)(file, JSON.stringify([...registeredClients]), { mode: 0o600 });
    }
    catch {
        // best effort: stay in-memory if the location is not writable
    }
}
function pruneExpired(map, ttlMs) {
    const now = Date.now();
    for (const [key, value] of map) {
        if (now - value.createdAt > ttlMs) {
            map.delete(key);
        }
    }
}
function base64url(input) {
    return input.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function verifyPkce(codeVerifier, codeChallenge, method) {
    if (method === 'plain') {
        return codeVerifier === codeChallenge;
    }
    // S256 (the only method claude.ai / the MCP spec requires support for)
    const hash = (0, node_crypto_1.createHash)('sha256').update(codeVerifier).digest();
    return base64url(hash) === codeChallenge;
}
function createOAuthRouter(options) {
    const { publicUrlOverride = '', haPublicUrlOverride = '', haBaseUrl, allowedRedirectUris = [], strictRedirectUris = false, clientsFile, } = options;
    const router = (0, express_1.Router)();
    if (clientsFile)
        loadClients(clientsFile);
    const restrictCors = (req, res) => {
        if (strictRedirectUris)
            applyRestrictedCors(req, res, allowedRedirectUris);
    };
    // Unauthenticated-by-design endpoints (that's inherent to OAuth) are
    // otherwise unbounded per-IP; /register in particular has no TTL on what
    // it stores, so a flood would grow memory indefinitely without this.
    const registerLimiter = (0, express_rate_limit_1.rateLimit)({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: true, legacyHeaders: false });
    const authorizeLimiter = (0, express_rate_limit_1.rateLimit)({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: true, legacyHeaders: false });
    const tokenLimiter = (0, express_rate_limit_1.rateLimit)({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false });
    // Periodic sweep independent of request traffic — without this, entries
    // from abandoned/incomplete flows only get pruned the next time someone
    // hits /authorize, so a quiet server could accumulate them indefinitely.
    const sweepInterval = setInterval(() => {
        pruneExpired(pendingAuthorizations, PENDING_TTL_MS);
        pruneExpired(issuedCodes, CODE_TTL_MS);
    }, 60 * 1000);
    sweepInterval.unref(); // don't keep the process alive just for this timer
    // --- Discovery endpoints (required by the MCP Authorization Spec) ---
    router.get('/.well-known/oauth-authorization-server', (req, res) => {
        let publicUrl;
        try {
            publicUrl = derivePublicUrl(req, publicUrlOverride);
        }
        catch (error) {
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
    const protectedResourceHandler = (req, res) => {
        let publicUrl;
        try {
            publicUrl = derivePublicUrl(req, publicUrlOverride);
        }
        catch (error) {
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
    router.post('/register', registerLimiter, (req, res) => {
        restrictCors(req, res);
        const body = req.body;
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
        const clientId = `mcp-${base64url((0, node_crypto_1.randomBytes)(16))}`;
        if (registeredClients.size >= MAX_REGISTERED_CLIENTS) {
            const oldest = registeredClients.keys().next().value;
            if (oldest !== undefined)
                registeredClients.delete(oldest);
        }
        registeredClients.set(clientId, {
            clientName: typeof body.client_name === 'string' ? body.client_name.slice(0, 100) : undefined,
            redirectUris,
            createdAt: Date.now(),
        });
        if (clientsFile)
            saveClients(clientsFile);
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
    router.get('/authorize', authorizeLimiter, async (req, res) => {
        pruneExpired(pendingAuthorizations, PENDING_TTL_MS);
        const { client_id: clientId, redirect_uri: clientRedirectUri, state: clientState, code_challenge: codeChallenge, code_challenge_method: codeChallengeMethod, response_type: responseType, } = req.query;
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
        let publicUrl;
        let haPublicUrl;
        try {
            publicUrl = derivePublicUrl(req, publicUrlOverride);
            haPublicUrl = await resolveHaPublicUrl(haPublicUrlOverride);
        }
        catch (error) {
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
        const ourState = (0, node_crypto_1.randomUUID)();
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
            clientId: clientId,
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
        }
        catch { /* validated above */ }
        // helmet's default `form-action 'self'` also blocks the post-submit redirect
        // to Home Assistant (a different origin), leaving the popup stuck.
        res.setHeader('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'; form-action 'self' https: http:");
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
    router.post('/authorize/consent', authorizeLimiter, (req, res) => {
        const { request_id: requestId, decision } = (req.body || {});
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
    router.get('/callback', async (req, res) => {
        const { code: haCode, state: ourState } = req.query;
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
            const haTokens = await tokenResponse.json();
            pruneExpired(issuedCodes, CODE_TTL_MS);
            const ourCode = base64url((0, node_crypto_1.randomBytes)(32));
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
        }
        catch (error) {
            console.error('OAuth callback error:', error);
            res.status(500).send('Internal error completing Home Assistant login.');
        }
    });
    // --- Step 5/6: claude.ai redeems our code (or refreshes) for the real HA token ---
    router.post('/token', tokenLimiter, async (req, res) => {
        restrictCors(req, res);
        const { grant_type: grantType } = req.body;
        if (grantType === 'authorization_code') {
            const { code, code_verifier: codeVerifier } = req.body;
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
            const { refresh_token: refreshToken } = req.body;
            if (!refreshToken) {
                res.status(400).json({ error: 'invalid_request', error_description: 'refresh_token is required' });
                return;
            }
            let publicUrl;
            try {
                publicUrl = derivePublicUrl(req, publicUrlOverride);
            }
            catch (error) {
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
                const haTokens = await tokenResponse.json();
                res.json({
                    access_token: haTokens.access_token,
                    token_type: 'Bearer',
                    expires_in: haTokens.expires_in,
                    refresh_token: refreshToken, // HA refresh tokens are long-lived / reusable
                });
            }
            catch (error) {
                console.error('OAuth refresh error:', error);
                res.status(500).json({ error: 'server_error' });
            }
            return;
        }
        res.status(400).json({ error: 'unsupported_grant_type' });
    });
    return router;
}
//# sourceMappingURL=oauth-provider.js.map