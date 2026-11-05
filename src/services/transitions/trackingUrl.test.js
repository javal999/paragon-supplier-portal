// PEX-16 BR-02 (BL-279) — only https:// tracking links are accepted.
import { describe, expect, it } from 'vitest';
import { trackingUrlProblem } from './trackingUrl';

describe('PEX-16 — tracking URL rule', () => {
  it.each(['https://track.example.com/AWB123', '  https://carrier.example/t?id=9  '])(
    'accepts %s',
    (u) => expect(trackingUrlProblem(u)).toBeNull()
  );
  it.each([
    ['', 'empty'],
    ['   ', 'empty'],
    [undefined, 'empty'],
    ['http://track.example.com/1', 'notHttps'],
    ['javascript:alert(1)', 'notHttps'],
    ['track.example.com/1', 'notHttps'],
    ['ftp://x.example', 'notHttps'],
    ['https://', 'invalid'],
    ['https://exa mple.com', 'invalid']
  ])('refuses %j as %s', (u, why) => expect(trackingUrlProblem(u)).toBe(why));
});
