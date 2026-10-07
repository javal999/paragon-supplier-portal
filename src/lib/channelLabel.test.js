import { describe, it, expect } from 'vitest';
import {
  channelLabelKey,
  channelResourcesEn,
  channelResourcesId,
  CANONICAL_CHANNELS,
  __channelInternals
} from './channelLabel';
import { resources } from './i18n';

const { CHANNEL, slug } = __channelInternals;

describe('channelLabel — channel SSoT invariants (SEAT2-I18N-CHANNEL-01)', () => {
  it('every canonical channel has both en and id display strings', () => {
    const missing = CANONICAL_CHANNELS.filter((s) => !CHANNEL[s]?.en || !CHANNEL[s]?.id);
    expect(missing).toEqual([]);
  });

  it('every canonical channel resolves to a key present in both en and id resources', () => {
    const en = /** @type {Record<string, string>} */ (resources.en.translation);
    const id = /** @type {Record<string, string>} */ (resources.id.translation);
    for (const ch of CANONICAL_CHANNELS) {
      const key = channelLabelKey(ch);
      expect(key).not.toBeNull();
      expect(en[/** @type {string} */ (key)]).toBeDefined();
      expect(id[/** @type {string} */ (key)]).toBeDefined();
    }
  });

  it('EN resource value equals the canonical string (byte-identical display)', () => {
    for (const ch of CANONICAL_CHANNELS) {
      expect(channelResourcesEn[slug(ch)]).toBe(ch);
    }
  });

  it('channel slugs are unique and namespaced channel.*', () => {
    const slugs = CANONICAL_CHANNELS.map(slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const ch of CANONICAL_CHANNELS) {
      expect(slug(ch).startsWith('channel.')).toBe(true);
    }
  });

  it('proper-noun / protocol channels are intentionally canonical (EN === ID)', () => {
    for (const ch of ['WhatsApp', 'WeChat', 'Email', 'API', 'API Push', 'EDI', 'Web']) {
      expect(channelResourcesId[slug(ch)]).toBe(channelResourcesEn[slug(ch)]);
    }
  });

  it('only Web Portal carries a distinct ID display (Portal Web)', () => {
    expect(channelResourcesId[slug('Web Portal')]).toBe('Portal Web');
    expect(channelResourcesEn[slug('Web Portal')]).toBe('Web Portal');
  });

  it('case-insensitive resolution lifts lowercase fixture variants to canonical casing', () => {
    // fixtures store 'whatsapp' / 'api' / 'email' / 'wechat' / 'edi' lowercase
    expect(channelLabelKey('whatsapp')).toBe('channel.whatsapp');
    expect(channelResourcesEn[/** @type {string} */ (channelLabelKey('whatsapp'))]).toBe(
      'WhatsApp'
    );
    expect(channelLabelKey('api')).toBe('channel.api');
    expect(channelResourcesEn[/** @type {string} */ (channelLabelKey('api'))]).toBe('API');
    expect(channelLabelKey('  Web Portal  ')).toBe('channel.web_portal');
  });

  it('channelLabelKey returns null for unknown tokens', () => {
    expect(channelLabelKey('Telex')).toBeNull();
    expect(channelLabelKey('')).toBeNull();
  });
});
