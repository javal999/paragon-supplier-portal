// BL-78 (BL-19: baseline first, no targets yet) — the sample KPI tiles, the
// radar and the improvement actions show their figures neutrally: no authored
// target, no target colour, no "benchmark" series, no target or gap chip. Where
// a target stood, "Baseline period — no target yet" (ID "Periode dasar — belum
// ada target") says why.

import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderWithProviders, SUPPLIER } from '@test/test-utils';
import { KPIS, IMPROVEMENT_ACTIONS } from '@services/data/mock/fixtures/supplierPerformance';
import SupplierPerformance from './SupplierPerformance';
import BuyerScorecard from './BuyerScorecard';

const NOTE = 'Baseline period — no target yet';

describe('BL-78 — no authored targets on the performance pages', () => {
  it('the fixtures carry no target, targetPct or gap', () => {
    for (const k of KPIS) {
      expect(Object.keys(k)).not.toContain('target');
      expect(Object.keys(k)).not.toContain('targetPct');
    }
    for (const a of IMPROVEMENT_ACTIONS) {
      expect(Object.keys(a)).not.toContain('target');
      expect(Object.keys(a)).not.toContain('gap');
    }
  });

  it('supplier performance: every tile and the radar read the baseline note, uncoloured', async () => {
    renderWithProviders(<SupplierPerformance />, { identity: SUPPLIER });
    const notes = await screen.findAllByTestId('kpi-tile-no-target');
    expect(notes).toHaveLength(KPIS.length);
    for (const n of notes) expect(n).toHaveTextContent(NOTE);
    expect(screen.getByTestId('radar-no-target')).toHaveTextContent(NOTE);
    expect(screen.queryByText(/Target:/)).toBeNull();
    expect(screen.queryByText('Benchmark')).toBeNull();
    expect(screen.getByRole('heading', { name: 'Performance radar' })).toBeInTheDocument();
    // No tile figure is painted with a target colour. (The grade badge and the
    // late/on-time PO counts keep their state colours: not targets.)
    for (const n of notes) {
      const figure = /** @type {HTMLElement} */ (n.parentElement?.querySelector('.text-kpi'));
      expect(figure.style.color).toBe('');
    }
  });

  it('supplier performance: improvement actions show Current, no Target or Gap', async () => {
    renderWithProviders(<SupplierPerformance />, { identity: SUPPLIER });
    fireEvent.click(await screen.findByRole('tab', { name: /Improvement/ }));
    const notes = await screen.findAllByTestId('action-no-target');
    expect(notes).toHaveLength(IMPROVEMENT_ACTIONS.length);
    expect(screen.queryByText(/^Target:/)).toBeNull();
    expect(screen.queryByText(/^Gap:/)).toBeNull();
  });

  it('buyer scorecard: tiles and radar read the baseline note; the radar has no benchmark column', async () => {
    renderWithProviders(<BuyerScorecard />);
    const notes = await screen.findAllByTestId('kpi-tile-no-target');
    expect(notes.length).toBeGreaterThan(0);
    for (const n of notes) expect(n).toHaveTextContent(NOTE);
    expect(screen.getByTestId('radar-no-target')).toHaveTextContent(NOTE);
    const table = screen.getByTestId('scorecard-radar-table');
    expect(table.querySelectorAll('thead th')).toHaveLength(2);
    expect(table.textContent).not.toMatch(/Benchmark/);
  });
});
