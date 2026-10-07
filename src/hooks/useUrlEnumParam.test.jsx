/** @import React from 'react' */
import { useState } from 'react';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../test/test-utils';
import { useUrlEnumParam } from './useUrlEnumParam';

// ────────────────────────────────────────────────────────────────────────────
// The shared read half of the deep-link pattern: a whitelisted value in the
// address is applied once; anything else — absent, unknown, malformed — is
// ignored, so a plain nav-menu visit (no query at all) is unaffected. Every
// destination page reads its tab/filter through this ONE hook.
// ────────────────────────────────────────────────────────────────────────────

/** @typedef {'all' | 'open' | 'closed'} Tab */
/** @type {readonly Tab[]} */
const TABS = ['all', 'open', 'closed'];

/** @type {React.FC} */
const Probe = () => {
  const [tab, setTab] = useState(/** @type {Tab} */ ('all'));
  useUrlEnumParam('tab', TABS, setTab);
  return <span data-testid="tab">{tab}</span>;
};

const read = () => screen.getByTestId('tab').textContent;

describe('useUrlEnumParam', () => {
  it('leaves the default when the param is absent (a plain nav visit)', () => {
    renderWithProviders(<Probe />, { route: '/buyer/alerts' });
    expect(read()).toBe('all');
  });

  it('applies a whitelisted value from the address', () => {
    renderWithProviders(<Probe />, { route: '/buyer/alerts?tab=open' });
    expect(read()).toBe('open');
  });

  it('ignores a value outside the whitelist — the default is KEPT, not blanked', () => {
    renderWithProviders(<Probe />, { route: '/buyer/alerts?tab=bogus' });
    expect(read()).toBe('all');
  });
});
