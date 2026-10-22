/** @import React from 'react' */
import { fireEvent, screen } from '@testing-library/react';
import { useLocation } from 'react-router-dom';
import { renderWithProviders } from '../test/test-utils';
import { usePageTab } from './usePageTab';

// ────────────────────────────────────────────────────────────────────────────
// P-12 — a long page's tab, kept in the address: the first tab by default, a
// whitelisted `?tab=` wins, a tab another param implies is used when the
// address names none, and choosing a tab writes `?tab=` while keeping every
// other param.
// ────────────────────────────────────────────────────────────────────────────

const TABS = /** @type {const} */ (['first', 'second', 'third']);

/** @type {React.FC<{ implied?: (typeof TABS)[number] | null }>} */
const Probe = ({ implied = null }) => {
  const { tab, select } = usePageTab(TABS, implied);
  const { search } = useLocation();
  return (
    <>
      <span data-testid="tab">{tab}</span>
      <span data-testid="search">{search}</span>
      <button type="button" onClick={() => select('third')}>
        third
      </button>
    </>
  );
};

const read = () => screen.getByTestId('tab').textContent;

describe('usePageTab', () => {
  it('opens the first tab on a plain visit', () => {
    renderWithProviders(<Probe />, { route: '/buyer/x' });
    expect(read()).toBe('first');
  });

  it('opens a whitelisted ?tab=, and ignores an unknown one', () => {
    const known = renderWithProviders(<Probe />, { route: '/buyer/x?tab=second' });
    expect(read()).toBe('second');
    known.unmount();
    renderWithProviders(<Probe />, { route: '/buyer/x?tab=bogus' });
    expect(read()).toBe('first');
  });

  it('uses the implied tab when the address names none, and an explicit ?tab= over it', () => {
    const implied = renderWithProviders(<Probe implied="third" />, { route: '/buyer/x?po=1' });
    expect(read()).toBe('third');
    implied.unmount();
    renderWithProviders(<Probe implied="third" />, { route: '/buyer/x?po=1&tab=second' });
    expect(read()).toBe('second');
  });

  it('choosing a tab writes ?tab= and keeps the other params', () => {
    renderWithProviders(<Probe />, { route: '/buyer/x?status=atRisk' });
    fireEvent.click(screen.getByRole('button', { name: 'third' }));
    expect(read()).toBe('third');
    const params = new URLSearchParams(screen.getByTestId('search').textContent ?? '');
    expect(params.get('tab')).toBe('third');
    expect(params.get('status')).toBe('atRisk');
  });
});
