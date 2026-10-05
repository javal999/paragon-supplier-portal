// ─────────────────────────────────────────────────────────────────────────────
// BL-53 · THE DEFINITIONS ON BOTH PERFORMANCE PAGES — the same section, the
// same numbers, and "Baseline period" where the 90% target used to be.
// ─────────────────────────────────────────────────────────────────────────────

import { screen, within } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { renderWithProviders, BUYER, SUPPLIER } from '@test/test-utils';
import BuyerScorecard from './BuyerScorecard';
import SupplierPerformance from './SupplierPerformance';
import { MATCH_WINDOW_DAYS, DELIVERY_GRACE_DAYS } from '@services/delivery/fulfillment';
import { EARLY_DELIVERY_WINDOW_DAYS } from '@services/data/kpiWindow';
import i18n from '@lib/i18n';

const expectDefinitions = async () => {
  const section = await screen.findByTestId('kpi-definitions');
  const otif = within(section).getByTestId('kpi-definition-otif');
  // BL-82 — the definitions describe the aligned calculation (BL-66).
  expect(within(otif).getByTestId('kpi-otif-window')).toHaveTextContent(
    `no more than ${EARLY_DELIVERY_WINDOW_DAYS} days before that date and no more than ${MATCH_WINDOW_DAYS} days after it`
  );
  expect(within(otif).getByTestId('kpi-otif-window')).toHaveTextContent(
    `${DELIVERY_GRACE_DAYS} days after the date: missed, even if the supplier sent a notice of dispatch`
  );
  expect(within(otif).getByTestId('kpi-otif-early')).toHaveTextContent(
    `up to ${EARLY_DELIVERY_WINDOW_DAYS} days early`
  );
  expect(within(otif).getByTestId('kpi-otif-early')).toHaveTextContent('a proposal');
  expect(within(otif).getByTestId('kpi-otif-grain')).toHaveTextContent('Per call-off');
  expect(within(otif).getByTestId('kpi-otif-dateChange')).toHaveTextContent(
    'A planner’s change to the need date applies only once the supplier confirms it'
  );
  expect(within(otif).getByTestId('kpi-otif-inFull')).toHaveTextContent(
    'Two partial receipts add up.'
  );
  const cfot = within(section).getByTestId('kpi-definition-cfot');
  expect(within(cfot).getByTestId('kpi-cfot-window')).toHaveTextContent(
    `no more than ${EARLY_DELIVERY_WINDOW_DAYS} days before it`
  );
  expect(within(cfot).getByTestId('kpi-cfot-early')).toHaveTextContent(
    `up to ${EARLY_DELIVERY_WINDOW_DAYS} days early`
  );
  expect(within(cfot).getByTestId('kpi-cfot-grain')).toHaveTextContent(
    'Per purchase order, by quantity'
  );
  expect(within(cfot).getByTestId('kpi-cfot-dateChange')).toHaveTextContent(
    'applies only once the planner accepts it'
  );
  // The retired sentences are gone from both measures.
  expect(section).not.toHaveTextContent('however early');
  expect(section).not.toHaveTextContent('are not added together');
  expect(section).not.toHaveTextContent('as soon as the supplier sends a counter-offer');
  expect(section).not.toHaveTextContent('applies at once');
  for (const id of ['otif', 'cfot']) {
    expect(within(section).getByTestId(`kpi-${id}-target`)).toHaveTextContent(
      'Baseline period — no target yet'
    );
    expect(within(section).getByTestId(`kpi-${id}-target`)).toHaveTextContent('after 3 months');
  }
};

describe('BL-53 · KPI definitions on the performance pages', () => {
  it('PTI scorecard: the definitions, and no 90% target on the calculated OTIF', async () => {
    renderWithProviders(<BuyerScorecard />, { identity: BUYER });
    await expectDefinitions();
    expect(screen.getByTestId('scorecard-otif')).not.toHaveTextContent(/target 9\d%/);
    expect(screen.queryByText('OTIF target')).not.toBeInTheDocument();
  });

  it('supplier performance: the SAME definitions the buyer reads', async () => {
    renderWithProviders(<SupplierPerformance />, { identity: SUPPLIER });
    await expectDefinitions();
    expect(screen.getByTestId('my-performance-otif')).not.toHaveTextContent(/target 9\d%/);
  });

  it('BL-82 · both pages state the new definitions in Bahasa Indonesia too', async () => {
    await i18n.changeLanguage('id');
    try {
      for (const [page, identity] of /** @type {const} */ ([
        [<BuyerScorecard key="b" />, BUYER],
        [<SupplierPerformance key="s" />, SUPPLIER]
      ])) {
        const { unmount } = renderWithProviders(page, { identity });
        const section = await screen.findByTestId('kpi-definitions');
        expect(within(section).getByTestId('kpi-otif-inFull')).toHaveTextContent(
          'Dua penerimaan sebagian dijumlahkan.'
        );
        expect(within(section).getByTestId('kpi-otif-dateChange')).toHaveTextContent(
          'baru berlaku setelah pemasok mengonfirmasinya'
        );
        expect(within(section).getByTestId('kpi-cfot-early')).toHaveTextContent(
          `hingga ${EARLY_DELIVERY_WINDOW_DAYS} hari lebih awal`
        );
        expect(within(section).getByTestId('kpi-cfot-dateChange')).toHaveTextContent(
          'baru berlaku setelah diterima perencana'
        );
        expect(section).not.toHaveTextContent('seawal apa pun');
        unmount();
      }
    } finally {
      await i18n.changeLanguage('en');
    }
  });
});
