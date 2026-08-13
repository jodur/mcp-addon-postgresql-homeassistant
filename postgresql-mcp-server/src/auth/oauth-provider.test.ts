import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import {
  verifyPkce,
  base64url,
  isAllowedRedirectUri,
  isAllowedOrigin,
  isLoopbackRedirect,
  CLAUDE_AI_REDIRECT_URI,
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

describe('isAllowedRedirectUri', () => {
  test('allows the documented claude.ai callback', () => {
    assert.equal(isAllowedRedirectUri(CLAUDE_AI_REDIRECT_URI, []), true);
  });

  test('allows loopback redirects for Claude Code', () => {
    assert.equal(isAllowedRedirectUri('http://127.0.0.1:12345/callback', []), true);
  });

  test('allows an explicitly configured extra redirect_uri', () => {
    const extra = 'https://my-other-client.example.com/callback';
    assert.equal(isAllowedRedirectUri(extra, [extra]), true);
  });

  test('rejects an arbitrary https URL not on the allowlist', () => {
    assert.equal(isAllowedRedirectUri('https://attacker.example.com/callback', []), false);
  });
});

describe('isAllowedOrigin', () => {
  test('allows the claude.ai origin', () => {
    assert.equal(isAllowedOrigin('https://claude.ai', []), true);
  });

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
