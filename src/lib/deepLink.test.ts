import { describe, expect, it } from 'vitest';
import { HIGHLIGHT_PARAM, deepLink } from './deepLink';

describe('deepLink — the one place a task/alert destination URL is built', () => {
  it('returns the bare path when every param is absent', () => {
    expect(deepLink('/buyer/alerts', {})).toBe('/buyer/alerts');
    expect(deepLink('/buyer/alerts')).toBe('/buyer/alerts');
  });

  it('appends every defined, non-empty param', () => {
    expect(deepLink('/buyer/alerts', { tab: 'open', risk: 'high' })).toBe(
      '/buyer/alerts?tab=open&risk=high',
    );
  });

  it('drops undefined and empty-string params, keeping the rest', () => {
    expect(deepLink('/buyer/capacity', { supplier: undefined, status: 'gap', materialGroup: '' })).toBe(
      '/buyer/capacity?status=gap',
    );
  });

  it('encodes values that need it', () => {
    expect(deepLink('/buyer/collaboration', { material: 'RM 100/A' })).toBe(
      '/buyer/collaboration?material=RM+100%2FA',
    );
  });

  it('exposes the one highlight param name every destination reads', () => {
    expect(HIGHLIGHT_PARAM).toBe('highlight');
  });
});
