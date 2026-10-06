import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import express from 'express';
import { authenticateToken } from './home-assistant-auth';
import {
  verifyPkce,
  base64url,
  isAllowedRedirectUri,
  isAllowedOrigin,
  isLoopbackRedirect,
  isValidRedirectUri,
  createOAuthRouter,
} from './oauth-provider';

describe('base64url', () => {
  test('round-trips without padding or unsafe characters', () => {
    const input = Buffer.from([0xff, 0xee, 0x00, 0x01, 0x02, 0x03]);
    const encoded = base64url(input);
    assert.equal(encoded.includes('+'), false);
    assert.equal(encoded.includes('/'), false);
    assert.equal(encoded.includes('='), false);
  });
});

describe('verifyPkce', () => {
  test('accepts a correct S256 verifier', () => {
    const verifier = 'a-valid-code-verifier-1234567890';
    const challenge = base64url(createHash('sha256').update(verifier).digest());
    assert.equal(verifyPkce(verifier, challenge, 'S256'), true);
  });

  test('rejects an incorrect S256 verifier', () => {
    const challenge = base64url(createHash('sha256').update('correct-verifier').digest());
    assert.equal(verifyPkce('wrong-verifier', challenge, 'S256'), false);
  });

  test('accepts a matching plain verifier', () => {
    assert.equal(verifyPkce('same-value', 'same-value', 'plain'), true);
  });

  test('rejects a mismatched plain verifier', () => {
    assert.equal(verifyPkce('a', 'b', 'plain'), false);
  });
});

describe('isLoopbackRedirect', () => {
  test('accepts http://localhost with a port', () => {
    assert.equal(isLoopbackRedirect('http://localhost:51234/callback'), true);
  });

  test('accepts http://127.0.0.1', () => {
    assert.equal(isLoopbackRedirect('http://127.0.0.1:51234/callback'), true);
  });

  test('rejects https loopback', () => {
    assert.equal(isLoopbackRedirect('https://localhost:51234/callback'), false);
  });

  test('rejects a non-loopback host', () => {
    assert.equal(isLoopbackRedirect('http://example.com/callback'), false);
  });

  test('rejects a malformed URL', () => {
    assert.equal(isLoopbackRedirect('not-a-url'), false);
  });
});

describe('isValidRedirectUri / isAllowedRedirectUri', () => {
  test('accepts any https URL (not Claude-specific)', () => {
    assert.equal(isAllowedRedirectUri('https://grok.com/connectors/callback', []), true);
  });

  test('accepts loopback and native app schemes', () => {
    assert.equal(isAllowedRedirectUri('http://127.0.0.1:12345/callback', []), true);
    assert.equal(isAllowedRedirectUri('http://[::1]:12345/callback', []), true);
    assert.equal(isAllowedRedirectUri('com.example.app:/oauth2redirect', []), true);
  });

  test('rejects plain http non-loopback, dangerous schemes, fragments, garbage', () => {
    assert.equal(isValidRedirectUri('http://example.com/cb'), false);
    assert.equal(isValidRedirectUri('javascript:alert(1)'), false);
    assert.equal(isValidRedirectUri('https://example.com/cb#frag'), false);
    assert.equal(isValidRedirectUri('not-a-url'), false);
    assert.equal(isValidRedirectUri(42), false);
  });

  test('strict mode only allows loopback and allowlisted URIs', () => {
    const extra = 'https://my-other-client.example.com/callback';
    assert.equal(isAllowedRedirectUri(extra, [extra], true), true);
    assert.equal(isAllowedRedirectUri('http://localhost:1/cb', [], true), true);
    assert.equal(isAllowedRedirectUri('https://attacker.example.com/callback', [], true), false);
  });
});

describe('isAllowedOrigin', () => {
  test('allows a loopback origin for Claude Code', () => {
    assert.equal(isAllowedOrigin('http://127.0.0.1:54321', []), true);
  });

  test('allows an explicitly configured extra origin', () => {
    const extraRedirectUri = 'https://my-other-client.example.com/callback';
    assert.equal(isAllowedOrigin('https://my-other-client.example.com', [extraRedirectUri]), true);
  });

  test('rejects an arbitrary origin not on the allowlist', () => {
    assert.equal(isAllowedOrigin('https://attacker.example.com', []), false);
  });

  test('rejects a missing origin (non-browser requests are not a CORS concern)', () => {
    assert.equal(isAllowedOrigin(undefined, []), false);
  });
});

async function withServer(fn: (base: string) => Promise<void>) {
  const app = express();
  app.set('trust proxy', 1);
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  app.use(createOAuthRouter({ haBaseUrl: 'http://ha.invalid', haPublicUrlOverride: 'https://ha.example.com' }));
  app.post('/mcp', authenticateToken, (_req, res) => { res.json({ ok: true }); });
  const server = http.createServer(app);
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  try { await fn(base); } finally { server.close(); }
}

describe('HTTP behaviour', () => {
  test('401 on /mcp carries a resource_metadata challenge', async () => {
    await withServer(async (base) => {
      const res = await fetch(`${base}/mcp`, { method: 'POST', headers: { 'x-forwarded-proto': 'https' } });
      assert.equal(res.status, 401);
      const header = res.headers.get('www-authenticate') || '';
      assert.ok(header.startsWith('Bearer '));
      assert.ok(header.includes(`resource_metadata="https://${new URL(base).host}/.well-known/oauth-protected-resource"`));
      assert.ok(!header.includes('invalid_token'));
    });
  });

  test('discovery documents are aligned with the /mcp endpoint', async () => {
    await withServer(async (base) => {
      const prm = await (await fetch(`${base}/.well-known/oauth-protected-resource`)).json() as any;
      assert.equal(prm.resource, `${base}/mcp`);
      assert.deepEqual(prm.authorization_servers, [base]);
      const as = await (await fetch(`${base}/.well-known/oauth-authorization-server`)).json() as any;
      assert.equal(as.issuer, base);
      assert.ok(as.code_challenge_methods_supported.includes('S256'));
      assert.equal(as.registration_endpoint, `${base}/register`);
    });
  });

  test('registration + authorize enforce the registered redirect_uri and redirect to Home Assistant', async () => {
    await withServer(async (base) => {
      const bad = await fetch(`${base}/register`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ redirect_uris: ['http://evil.example.com/cb'] }) });
      assert.equal(bad.status, 400);

      const reg = await fetch(`${base}/register`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ redirect_uris: ['https://grok.example/cb'], client_name: 'Grok' }) });
      assert.equal(reg.status, 201);
      const { client_id } = await reg.json() as any;

      const q = (redirect: string) => `${base}/authorize?response_type=code&client_id=${client_id}&redirect_uri=${encodeURIComponent(redirect)}&code_challenge=abc&code_challenge_method=S256`;
      const mismatch = await fetch(q('https://attacker.example/cb'), { redirect: 'manual' });
      assert.equal(mismatch.status, 400);

      const ok = await fetch(q('https://grok.example/cb'), { redirect: 'manual' });
      assert.equal(ok.status, 302);
    });
  });

  test('authorize redirects straight to Home Assistant', async () => {
    await withServer(async (base) => {
      const reg = await fetch(`${base}/register`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ redirect_uris: ['https://grok.example/cb'] }) });
      const { client_id } = await reg.json() as any;
      const res = await fetch(`${base}/authorize?response_type=code&client_id=${client_id}&redirect_uri=${encodeURIComponent('https://grok.example/cb')}&code_challenge=abc&code_challenge_method=S256`, { redirect: 'manual' });
      assert.equal(res.status, 302);
      assert.ok((res.headers.get('location') || '').startsWith('https://ha.example.com/auth/authorize'));
    });
  });
});
