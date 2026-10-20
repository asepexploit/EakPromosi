import { describe, expect, it } from 'vitest';

import { extractLinks } from './link-detect.worker.js';

describe('extractLinks', () => {
  it('normalizes public usernames to lowercase t.me paths', () => {
    const links = extractLinks('join https://t.me/CoolChannel and telegram.me/AnotherOne', false);
    expect(links.map((l) => l.normalized).sort()).toEqual(['t.me/anotherone', 't.me/coolchannel']);
    expect(new Set(links.map((l) => l.kind))).toEqual(new Set(['public_username']));
  });

  it('separates private invite links', () => {
    const links = extractLinks('here is t.me/+AbCdEfGhIj12 — invite', false);
    expect(links).toHaveLength(1);
    expect(links[0]?.normalized).toBe('t.me/+AbCdEfGhIj12');
    expect(links[0]?.kind).toBe('private_invite');
  });

  it('skips mentions when flag is false', () => {
    const links = extractLinks('ping @support please', false);
    expect(links).toHaveLength(0);
  });

  it('picks up mentions when enabled', () => {
    const links = extractLinks('ping @Support please', true);
    expect(links).toEqual([{ raw: '@Support', normalized: 't.me/support', kind: 'public_mention' }]);
  });

  it('deduplicates across patterns', () => {
    const links = extractLinks('https://t.me/fooBar and @fooBar again', true);
    expect(links).toHaveLength(1);
  });
});
