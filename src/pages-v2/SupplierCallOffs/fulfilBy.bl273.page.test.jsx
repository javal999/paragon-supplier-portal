// PEX-10 (BL-273) — every supplier call-off confirmation shows
// "Fulfil by <date> (lead time n days)": the confirmation date + the material's
// DRC-6 lead time. Before the supplier confirms, the same window counted from
// today, labelled "If confirmed today". The expected dates are DERIVED from the
// store and the read model, not typed in, so a fixture shift cannot rot them.

import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { renderWithProviders, SUPPLIER } from '@test/test-utils';
import { callOffStore } from '@services/data/mock/stores/callOffStore';
import { leadTimeDaysOf } from '@services/data/mock/leadTimeReadModel';
import { fulfilmentWindow } from '@services/transitions/fulfilmentWindow';
import { sdcClock } from '@services/sdc';
import { formatDate } from '@lib/format';
import i18n from '@lib/i18n';
import SupplierCallOffs from './index';

beforeEach(() => {
  callOffStore.reset();
});

const mine = () => callOffStore.all().filter((c) => c.supplierId === SUPPLIER.supplierId);

describe('BL-273 — fulfil-by on the supplier call-offs', () => {
  it('a confirmed call-off reads "Fulfil by <confirmation + lead time> (lead time n days)"', async () => {
    const c = mine().find((x) => x.confirmation);
    if (!c?.confirmation) throw new Error('fixture has no confirmed call-off for the supplier');
    const lead = leadTimeDaysOf(c.supplierId, c.materialCode);
    expect(lead).not.toBeNull();
    const w = fulfilmentWindow(c.confirmation.confirmedAt, lead);
    renderWithProviders(<SupplierCallOffs />, { identity: SUPPLIER });
    const cell = await screen.findByTestId(`supplier-calloff-fulfil-by-${c.id}`);
    expect(cell).toHaveAttribute('data-sla', 'confirmed');
    expect(cell.textContent).toBe(`Fulfil by ${formatDate(w?.by)} (lead time ${lead} days)`);
  });

  it('a call-off still awaiting the answer shows the window from today, labelled', async () => {
    const c = mine().find((x) => x.status === 'Awaiting Confirmation' && !x.confirmation);
    if (!c) throw new Error('fixture has no unanswered call-off for the supplier');
    const lead = leadTimeDaysOf(c.supplierId, c.materialCode);
    const w = fulfilmentWindow(sdcClock.now(), lead);
    renderWithProviders(<SupplierCallOffs />, { identity: SUPPLIER });
    const cell = await screen.findByTestId(`supplier-calloff-fulfil-by-${c.id}`);
    expect(cell).toHaveAttribute('data-sla', 'today');
    expect(cell.textContent).toBe(
      `If confirmed today, fulfil by ${formatDate(w?.by)} (lead time ${lead} days)`
    );
  });

  it('a rejected call-off shows no window', async () => {
    renderWithProviders(<SupplierCallOffs />, { identity: SUPPLIER });
    await screen.findAllByTestId(/^supplier-calloff-row-/);
    for (const c of mine().filter((x) => x.status === 'Rejected')) {
      expect(screen.queryByTestId(`supplier-calloff-fulfil-by-${c.id}`)).toBeNull();
    }
  });

  it('the Indonesian wording', () => {
    expect(i18n.t('co.sla.fulfilBy', { lng: 'id' })).toBe('Penuhi paling lambat');
    expect(i18n.t('co.sla.leadTime', { lng: 'id', count: 28 })).toBe('(waktu tunggu 28 hari)');
    expect(i18n.t('co.sla.leadTime', { lng: 'en', count: 1 })).toBe('(lead time 1 day)');
  });
});
