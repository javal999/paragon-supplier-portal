import { describe, it, expect, afterEach, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders, BUYER } from '@test/test-utils';
import DataHealthChip from './DataHealthChip';
import { mockDataService } from '@services/data/mock/mockDataService';
import { PERSONA_SYSTEM_ROLES } from '@services/transitions/businessRoles';
import i18n from '@lib/i18n';
import type { QueryScope } from '@services/data/types';
import type { EngineStep } from '@services/engine/dataHealth';

// ─────────────────────────────────────────────────────────────────────────────
// F-02 — the Data health chip on the result pages. The count is read back from
// the service's own report through its own `affects`, never restated.
// ─────────────────────────────────────────────────────────────────────────────

const buyerScope: QueryScope = { personaType: 'buyer', supplierId: null, businessRoles: PERSONA_SYSTEM_ROLES.buyer };
const report = async () => (await mockDataService.procurement.getDataHealth(buyerScope))!;
const failingFor = (r: Awaited<ReturnType<typeof report>>, step: EngineStep) =>
  r.feeds.filter((f) => f.affects.includes(step)).flatMap((f) => f.checks).filter((c) => !c.passed).length;

afterEach(() => {
  vi.restoreAllMocks();
  void i18n.changeLanguage('en');
});

describe('DataHealthChip', () => {
  it.each(['E14-03', 'E14-05', 'E14-13'] as const)('%s: a failing check that reaches the step shows its count and links to Data health', async (step) => {
    const r = await report();
    const n = failingFor(r, step);
    // The synthetic dataset flags stock accuracy on cycle counts (E14-03 and downstream).
    expect(n).toBeGreaterThan(0);
    renderWithProviders(<DataHealthChip step={step} />, { identity: BUYER, route: '/buyer/order-plan' });
    expect(await screen.findByTestId('data-health-chip-failing')).toHaveTextContent(`Inputs: ${n} check${n === 1 ? '' : 's'} failing`);
    expect(screen.getByTestId('data-health-chip-link')).toHaveAttribute('href', '/buyer/data-health');
    expect(screen.queryByTestId('data-health-chip-pass')).toBeNull();
  });

  it('a failing check on a feed that does not reach the step is not counted: "all checks pass", no link', async () => {
    const r = await report();
    // Same report, with every failing check moved onto a feed that reaches only E14-07/E14-09.
    const failing = r.feeds.flatMap((f) => f.checks).filter((c) => !c.passed);
    const altered = {
      ...r,
      feeds: r.feeds.map((f) =>
        f.feed === 'finishedGoods'
          ? { ...f, checks: [...f.checks, ...failing] }
          : { ...f, checks: f.checks.map((c) => (c.passed ? c : { ...c, passed: true, failures: [] })) },
      ),
    };
    expect(altered.feeds.find((f) => f.feed === 'finishedGoods')!.affects).not.toContain('E14-05');
    vi.spyOn(mockDataService.procurement, 'getDataHealth').mockResolvedValue(altered);
    renderWithProviders(<DataHealthChip step="E14-05" />, { identity: BUYER, route: '/buyer/order-plan' });
    expect(await screen.findByTestId('data-health-chip-pass')).toHaveTextContent('Inputs: all checks pass');
    expect(screen.queryByTestId('data-health-chip-failing')).toBeNull();
    expect(screen.queryByTestId('data-health-chip-link')).toBeNull();
  });

  it('renders in Indonesian', async () => {
    await i18n.changeLanguage('id');
    renderWithProviders(<DataHealthChip step="E14-03" />, { identity: BUYER, route: '/buyer/material-requirement' });
    expect(await screen.findByTestId('data-health-chip-failing')).toHaveTextContent('pemeriksaan gagal');
    expect(screen.getByTestId('data-health-chip-link')).toHaveTextContent('Lihat Kesehatan data');
  });
});
