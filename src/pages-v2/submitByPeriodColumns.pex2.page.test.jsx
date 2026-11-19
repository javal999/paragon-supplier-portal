// @vitest-environment jsdom
// PEX-2 BR-05 — the supplier "Submit by period" table is one COLUMN per period
// with the row labels pinned on the left, as the per-material grid is.
// CAP-1 wave 3 (BL-343) renders it through the shared `WeekGrid`: a real
// table, the four measures as rows, the periods as its columns.
import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PeriodSubmitSection from './SupplierForecastCommitments/components/PeriodSubmitSection';

/** @type {any} */
const mk = (/** @type {string} */ bucket, /** @type {boolean} */ red) => ({
  bucket,
  red,
  pending: [{ key: bucket }],
  checks: [{ group: 'g1', check: { level: 'unconfirmed', upsideUnconfirmedWeek: '2026-11-02' } }],
  wr: { reason: '', note: '' },
  refusal: null
});

const W1 = '2026-11-02';
const W2 = '2026-11-09';

describe('PEX-2 BR-05 — Submit by period as columns', () => {
  it('renders one column per period under four pinned row labels, and the per-period controls in their own column', () => {
    render(
      <MemoryRouter>
        <PeriodSubmitSection
          periodRows={[mk(W1, false), mk(W2, true)]}
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
    // A real table (G-15), one column per period, oldest first.
    const grid = screen.getByTestId('fc-sup-weeks-grid');
    expect(grid.tagName).toBe('TABLE');
    const heads = [...grid.querySelectorAll('thead th[data-week]')];
    expect(heads.map((h) => h.getAttribute('data-week'))).toEqual([W1, W2]);
    // The measures are the rows, their labels pinned on the left (BR-02).
    const labels = [...grid.querySelectorAll('tbody th[scope="row"]')];
    expect(labels.map((h) => h.textContent?.trim())).toEqual([
      'To submit',
      expect.stringMatching(/^LTP against capacity/),
      'Reason',
      'Actions'
    ]);
    for (const h of labels) expect(h.className).toMatch(/\bsticky\b.*\bleft-0\b/);
    // The period's own Submit all sits in its column; only the above-BE period
    // carries a reason select.
    expect(screen.getByTestId(`fc-week-submit-${W2}`)).toBeTruthy();
    expect(screen.getByTestId(`fc-week-submit-${W1}`)).toBeTruthy();
    const reasonRow = /** @type {HTMLElement} */ (
      grid.querySelector('tbody tr[data-row="reason"]')
    );
    const [, reasonOne, reasonTwo] = /** @type {HTMLElement[]} */ ([
      ...reasonRow.querySelectorAll('th, td')
    ]);
    expect(within(reasonOne).queryByRole('combobox')).toBeNull();
    expect(within(reasonTwo).getByRole('combobox')).toBeTruthy();
  });
});
