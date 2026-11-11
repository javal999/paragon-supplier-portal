// @vitest-environment jsdom
// PEX-2 BR-05 — the supplier "Submit by period" table is one COLUMN per period
// with the row labels pinned on the left, as the per-material grid is.
import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PeriodSubmitSection from './SupplierForecastCommitments/components/PeriodSubmitSection';

/** @type {any} */
const mk = (/** @type {string} */ bucket, /** @type {boolean} */ red) => ({
  bucket,
  red,
  pending: [{ key: bucket }],
  checks: [{ group: 'g1', check: { level: 'unconfirmed', upsideUnconfirmedWeek: '2026-W45' } }],
  wr: { reason: '', note: '' },
  refusal: null
});

describe('PEX-2 BR-05 — Submit by period as columns', () => {
  it('renders one column wrapper per period under five pinned row labels', () => {
    render(
      <MemoryRouter>
        <PeriodSubmitSection
          periodRows={[mk('2026-W45', false), mk('2026-W46', true)]}
          periodLabel={(b) => `P ${b}`}
          canCommit
          pending={false}
          submitAvail={/** @type {any} */ ({ available: true })}
          commitmentReasons={[]}
          reasonLabel={() => 'x'}
          groupLabel={(g) => g}
          setWeekReasons={() => {}}
          onSubmitAll={async () => {}}
        />
      </MemoryRouter>
    );
    const grid = screen.getByTestId('fc-sup-weeks-grid');
    expect(grid.querySelectorAll('[data-grid-label]')).toHaveLength(5);
    expect(grid.className).toContain('grid-flow-col');
    const col = within(screen.getByTestId('fc-week-2026-W46'));
    expect(col.getByTestId('fc-week-submit-2026-W46')).toBeTruthy();
    expect(screen.queryByRole('table')).toBeNull();
    // only the above-BE period carries a reason select
    expect(within(screen.getByTestId('fc-week-2026-W45')).queryByRole('combobox')).toBeNull();
    expect(col.getByRole('combobox')).toBeTruthy();
  });
});
