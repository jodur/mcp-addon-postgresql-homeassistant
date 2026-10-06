"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const node_crypto_1 = require("node:crypto");
const node_http_1 = __importDefault(require("node:http"));
const express_1 = __importDefault(require("express"));
const home_assistant_auth_1 = require("./home-assistant-auth");
const oauth_provider_1 = require("./oauth-provider");
(0, node_test_1.describe)('base64url', () => {
    (0, node_test_1.test)('round-trips without padding or unsafe characters', () => {
        const input = Buffer.from([0xff, 0xee, 0x00, 0x01, 0x02, 0x03]);
        const encoded = (0, oauth_provider_1.base64url)(input);
        strict_1.default.equal(encoded.includes('+'), false);
        strict_1.default.equal(encoded.includes('/'), false);
        strict_1.default.equal(encoded.includes('='), false);
    });
});
(0, node_test_1.describe)('verifyPkce', () => {
    (0, node_test_1.test)('accepts a correct S256 verifier', () => {
        const verifier = 'a-valid-code-verifier-1234567890';
        const challenge = (0, oauth_provider_1.base64url)((0, node_crypto_1.createHash)('sha256').update(verifier).digest());
        strict_1.default.equal((0, oauth_provider_1.verifyPkce)(verifier, challenge, 'S256'), true);
    });
    (0, node_test_1.test)('rejects an incorrect S256 verifier', () => {
        const challenge = (0, oauth_provider_1.base64url)((0, node_crypto_1.createHash)('sha256').update('correct-verifier').digest());
        strict_1.default.equal((0, oauth_provider_1.verifyPkce)('wrong-verifier', challenge, 'S256'), false);
    });
    (0, node_test_1.test)('accepts a matching plain verifier', () => {
        strict_1.default.equal((0, oauth_provider_1.verifyPkce)('same-value', 'same-value', 'plain'), true);
    });
    (0, node_test_1.test)('rejects a mismatched plain verifier', () => {
        strict_1.default.equal((0, oauth_provider_1.verifyPkce)('a', 'b', 'plain'), false);
    });
});
(0, node_test_1.describe)('isLoopbackRedirect', () => {
    (0, node_test_1.test)('accepts http://localhost with a port', () => {
        strict_1.default.equal((0, oauth_provider_1.isLoopbackRedirect)('http://localhost:51234/callback'), true);
    });
    (0, node_test_1.test)('accepts http://127.0.0.1', () => {
        strict_1.default.equal((0, oauth_provider_1.isLoopbackRedirect)('http://127.0.0.1:51234/callback'), true);
    });
    (0, node_test_1.test)('rejects https loopback', () => {
        strict_1.default.equal((0, oauth_provider_1.isLoopbackRedirect)('https://localhost:51234/callback'), false);
    });
    (0, node_test_1.test)('rejects a non-loopback host', () => {
        strict_1.default.equal((0, oauth_provider_1.isLoopbackRedirect)('http://example.com/callback'), false);
    });
    (0, node_test_1.test)('rejects a malformed URL', () => {
        strict_1.default.equal((0, oauth_provider_1.isLoopbackRedirect)('not-a-url'), false);
    });
});
(0, node_test_1.describe)('isValidRedirectUri / isAllowedRedirectUri', () => {
    (0, node_test_1.test)('accepts any https URL (not Claude-specific)', () => {
        strict_1.default.equal((0, oauth_provider_1.isAllowedRedirectUri)('https://grok.com/connectors/callback', []), true);
    });
    (0, node_test_1.test)('accepts loopback and native app schemes', () => {
        strict_1.default.equal((0, oauth_provider_1.isAllowedRedirectUri)('http://127.0.0.1:12345/callback', []), true);
        strict_1.default.equal((0, oauth_provider_1.isAllowedRedirectUri)('http://[::1]:12345/callback', []), true);
        strict_1.default.equal((0, oauth_provider_1.isAllowedRedirectUri)('com.example.app:/oauth2redirect', []), true);
    });
    (0, node_test_1.test)('rejects plain http non-loopback, dangerous schemes, fragments, garbage', () => {
        strict_1.default.equal((0, oauth_provider_1.isValidRedirectUri)('http://example.com/cb'), false);
        strict_1.default.equal((0, oauth_provider_1.isValidRedirectUri)('javascript:alert(1)'), false);
        strict_1.default.equal((0, oauth_provider_1.isValidRedirectUri)('https://example.com/cb#frag'), false);
        strict_1.default.equal((0, oauth_provider_1.isValidRedirectUri)('not-a-url'), false);
        strict_1.default.equal((0, oauth_provider_1.isValidRedirectUri)(42), false);
    });
    (0, node_test_1.test)('strict mode only allows loopback and allowlisted URIs', () => {
        const extra = 'https://my-other-client.example.com/callback';
        strict_1.default.equal((0, oauth_provider_1.isAllowedRedirectUri)(extra, [extra], true), true);
        strict_1.default.equal((0, oauth_provider_1.isAllowedRedirectUri)('http://localhost:1/cb', [], true), true);
        strict_1.default.equal((0, oauth_provider_1.isAllowedRedirectUri)('https://attacker.example.com/callback', [], true), false);
    });
});
(0, node_test_1.describe)('isAllowedOrigin', () => {
    (0, node_test_1.test)('allows a loopback origin for Claude Code', () => {
        strict_1.default.equal((0, oauth_provider_1.isAllowedOrigin)('http://127.0.0.1:54321', []), true);
    });
    (0, node_test_1.test)('allows an explicitly configured extra origin', () => {
        const extraRedirectUri = 'https://my-other-client.example.com/callback';
        strict_1.default.equal((0, oauth_provider_1.isAllowedOrigin)('https://my-other-client.example.com', [extraRedirectUri]), true);
    });
    (0, node_test_1.test)('rejects an arbitrary origin not on the allowlist', () => {
        strict_1.default.equal((0, oauth_provider_1.isAllowedOrigin)('https://attacker.example.com', []), false);
    });
    (0, node_test_1.test)('rejects a missing origin (non-browser requests are not a CORS concern)', () => {
        strict_1.default.equal((0, oauth_provider_1.isAllowedOrigin)(undefined, []), false);
    });
});
async function withServer(fn) {
    const app = (0, express_1.default)();
    app.set('trust proxy', 1);
    app.use(express_1.default.json());
    app.use(express_1.default.urlencoded({ extended: false }));
    app.use((0, oauth_provider_1.createOAuthRouter)({ haBaseUrl: 'http://ha.invalid', haPublicUrlOverride: 'https://ha.example.com' }));
    app.post('/mcp', home_assistant_auth_1.authenticateToken, (_req, res) => { res.json({ ok: true }); });
    const server = node_http_1.default.createServer(app);
    await new Promise((r) => server.listen(0, '127.0.0.1', r));
    const base = `http://127.0.0.1:${server.address().port}`;
    try {
        await fn(base);
    }
    finally {
        server.close();
    }
}
(0, node_test_1.describe)('HTTP behaviour', () => {
    (0, node_test_1.test)('401 on /mcp carries a resource_metadata challenge', async () => {
        await withServer(async (base) => {
            const res = await fetch(`${base}/mcp`, { method: 'POST', headers: { 'x-forwarded-proto': 'https' } });
            strict_1.default.equal(res.status, 401);
            const header = res.headers.get('www-authenticate') || '';
            strict_1.default.ok(header.startsWith('Bearer '));
            strict_1.default.ok(header.includes(`resource_metadata="https://${new URL(base).host}/.well-known/oauth-protected-resource"`));
            strict_1.default.ok(!header.includes('invalid_token'));
        });
    });
    (0, node_test_1.test)('discovery documents are aligned with the /mcp endpoint', async () => {
        await withServer(async (base) => {
            const prm = await (await fetch(`${base}/.well-known/oauth-protected-resource`)).json();
            strict_1.default.equal(prm.resource, `${base}/mcp`);
            strict_1.default.deepEqual(prm.authorization_servers, [base]);
            const as = await (await fetch(`${base}/.well-known/oauth-authorization-server`)).json();
            strict_1.default.equal(as.issuer, base);
            strict_1.default.ok(as.code_challenge_methods_supported.includes('S256'));
            strict_1.default.equal(as.registration_endpoint, `${base}/register`);
        });
    });
    (0, node_test_1.test)('registration + authorize enforce the registered redirect_uri and show consent', async () => {
        await withServer(async (base) => {
            const bad = await fetch(`${base}/register`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ redirect_uris: ['http://evil.example.com/cb'] }) });
            strict_1.default.equal(bad.status, 400);
            const reg = await fetch(`${base}/register`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ redirect_uris: ['https://grok.example/cb'], client_name: 'Grok' }) });
            strict_1.default.equal(reg.status, 201);
            const { client_id } = await reg.json();
            const q = (redirect) => `${base}/authorize?response_type=code&client_id=${client_id}&redirect_uri=${encodeURIComponent(redirect)}&code_challenge=abc&code_challenge_method=S256`;
            const mismatch = await fetch(q('https://attacker.example/cb'), { redirect: 'manual' });
            strict_1.default.equal(mismatch.status, 400);
            const ok = await fetch(q('https://grok.example/cb'), { redirect: 'manual' });
            strict_1.default.equal(ok.status, 200);
            strict_1.default.ok((await ok.text()).includes('/authorize/consent'));
        });
    });
});
//# sourceMappingURL=oauth-provider.test.js.map