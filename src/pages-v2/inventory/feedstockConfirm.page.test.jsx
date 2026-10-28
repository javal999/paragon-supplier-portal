import { describe, it, expect, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import { renderWithProviders, BUYER, SUPPLIER } from '@test/test-utils';
import { feedstockConfirmationStore } from '@services/data/mock/stores/feedstockConfirmationStore';
import { MockCommandService } from '@services/data/mock/MockCommandService';
import { PERSONA_SYSTEM_ROLES } from '@services/transitions/businessRoles';
import { addDays, dayOf } from '@services/transitions/inventoryRules';
import { sdcClock } from '@services/sdc';
import { NO_PERSON } from '@context/noPerson';
import SupplierInventory from '../SupplierInventory';
import BuyerInventory from '../BuyerInventory';
import { osipParamStore } from '@services/data/mock/stores/osipParamStore';
import { seedOsipParam } from '@test/osipParamSeed';

// ─────────────────────────────────────────────────────────────────────────────
// BL-194 · the feedstock confirmation on the real pages (DRC-8; DRC-D17):
// the supplier's weekly "Current feedstock" panel on its Stock page, and PTI's
// read-only "Feedstock (confirmed …)" line beside the supplier stock.
// ─────────────────────────────────────────────────────────────────────────────

const CODE = 'PK-PETB-8801';
// Inventory UX S-01 — the feedstock confirmation is the Stock page's own tab.
const FEEDSTOCK_TAB = '/supplier/inventory?tab=feedstock';
const today = () => dayOf(sdcClock.now());

beforeEach(() => {
  feedstockConfirmationStore.reset();
  osipParamStore.reset();
  sdcClock.reset();
});

describe('supplier · Current feedstock', () => {
  it('lists every assigned material as due, weekly, with no Provisional label (E1, E2 answered) and no DA figure', async () => {
    renderWithProviders(<SupplierInventory />, { identity: SUPPLIER, route: FEEDSTOCK_TAB });
    const panel = await screen.findByTestId('feedstock-confirm');
    expect(within(panel).queryByTestId('feedstock-provisional')).toBeNull();
    expect(within(panel).getByTestId('feedstock-intro')).toHaveTextContent(
      'weekly with the stock update'
    );
    expect(within(panel).getByTestId('feedstock-due')).toHaveTextContent(
      'Due with the weekly stock update'
    );
    expect(within(panel).getByTestId(`feedstock-status-${CODE}`).textContent).toBe('Due');
    expect(within(panel).getByTestId(`feedstock-latest-${CODE}`).textContent).toBe(
      'Not confirmed yet'
    );
    // DRC-D10 — no demand anticipation reaches a supplier.
    expect(within(panel).queryByText(/anticipation|Target/i)).toBeNull();
  });

  it('[Team E2] a supplier on a pull agreement confirms daily: the panel says so and its cycle is today', async () => {
    seedOsipParam('pullAgreement', { supplierId: 'sup-007' }, true);
    renderWithProviders(<SupplierInventory />, { identity: SUPPLIER, route: FEEDSTOCK_TAB });
    const panel = await screen.findByTestId('feedstock-confirm');
    expect(within(panel).getByTestId('feedstock-intro')).toHaveTextContent(
      'You are on a pull agreement: confirm the feedstock you hold for each material every day.'
    );
    expect(within(panel).getByTestId('feedstock-due')).toHaveTextContent(
      'Due today, by the end of the day:'
    );
    expect(within(panel).getByTestId(`feedstock-status-${CODE}`).textContent).toBe('Due');
  });

  it('refuses a future date in the form, then confirms; the material reads Confirmed', async () => {
    renderWithProviders(<SupplierInventory />, { identity: SUPPLIER, route: FEEDSTOCK_TAB });
    fireEvent.click(await screen.findByTestId(`feedstock-open-${CODE}`));
    fireEvent.change(screen.getByTestId('feedstock-qty'), { target: { value: '0' } });
    fireEvent.change(screen.getByTestId('feedstock-date'), {
      target: { value: addDays(today(), 1) }
    });
    expect(screen.getByTestId('feedstock-refusal').textContent).toBe(
      'The confirmation date cannot be in the future.'
    );
    const submit = /** @type {HTMLButtonElement} */ (screen.getByTestId('feedstock-submit'));
    expect(submit.disabled).toBe(true);
    fireEvent.change(screen.getByTestId('feedstock-date'), { target: { value: today() } });
    expect(screen.queryByTestId('feedstock-refusal')).toBeNull();
    fireEvent.click(submit);
    await waitFor(() =>
      expect(screen.getByTestId(`feedstock-status-${CODE}`).textContent).toBe('Confirmed')
    );
    // 0 is allowed (BR-a), and the record is the supplier's own.
    expect(feedstockConfirmationStore.all()).toMatchObject([
      { supplierId: 'sup-007', materialCode: CODE, feedstockQty: 0, confirmedOn: today() }
    ]);
  });

  it('a material confirmed in an earlier week but not this one reads Missed (MR-1 cycle)', async () => {
    const now = sdcClock.now();
    // 16 days back lies before the cycle that just closed, whatever weekday now is.
    sdcClock.set(new Date(Date.parse(now) - 16 * 24 * 3_600_000).toISOString());
    const r = await new MockCommandService().dispatch(
      {
        personaType: 'supplier',
        supplierId: 'sup-007',
        businessRoles: PERSONA_SYSTEM_ROLES.supplier,
        actor: NO_PERSON
      },
      {
        transitionId: 't_feedstock_confirm',
        entity: 'feedstockConfirmation',
        payload: {
          supplierId: 'sup-007',
          materialCode: CODE,
          feedstockQty: 40,
          confirmedOn: today()
        }
      }
    );
    expect(r.status, r.reason).toBe('done');
    sdcClock.reset();
    renderWithProviders(<SupplierInventory />, { identity: SUPPLIER, route: FEEDSTOCK_TAB });
    expect((await screen.findByTestId(`feedstock-status-${CODE}`)).textContent).toBe('Missed');
    expect(screen.getByTestId('feedstock-missed').textContent).toContain('1 materials');
  });

  it('the stock figure on the row does not move after a confirmation (MoM 2B)', async () => {
    renderWithProviders(<SupplierInventory />, { identity: SUPPLIER });
    const before = (await screen.findByTestId(`sup-stock-row-${CODE}`)).textContent;
    // S-01 — feedstock is its own tab beside My stock.
    fireEvent.click(screen.getByRole('tab', { name: 'Feedstock to confirm' }));
    fireEvent.click(await screen.findByTestId(`feedstock-open-${CODE}`));
    fireEvent.change(screen.getByTestId('feedstock-qty'), { target: { value: '987654' } });
    fireEvent.click(screen.getByTestId('feedstock-submit'));
    await waitFor(() =>
      expect(screen.getByTestId(`feedstock-status-${CODE}`).textContent).toBe('Confirmed')
    );
    fireEvent.click(screen.getByRole('tab', { name: 'My stock' }));
    expect((await screen.findByTestId(`sup-stock-row-${CODE}`)).textContent).toBe(before);
  });
});

describe('PTI · the feedstock line beside the supplier stock', () => {
  it('reads "Feedstock not confirmed" until the supplier confirms, then the figure, who, and target 0 (E1)', async () => {
    const { unmount } = renderWithProviders(<BuyerInventory />, {
      identity: BUYER,
      route: '/buyer/inventory?type=VERP'
    });
    // Inventory UX P-01 — the feedstock line sits in the material drawer.
    fireEvent.click(await screen.findByTestId(`pti-stock-row-sup-007-${CODE}`));
    expect((await screen.findByTestId(`pti-feedstock-none-sup-007-${CODE}`)).textContent).toBe(
      'Feedstock not confirmed'
    );
    unmount();

    const r = await new MockCommandService().dispatch(
      {
        personaType: 'supplier',
        supplierId: 'sup-007',
        businessRoles: PERSONA_SYSTEM_ROLES.supplier,
        actor: NO_PERSON
      },
      {
        transitionId: 't_feedstock_confirm',
        entity: 'feedstockConfirmation',
        payload: {
          supplierId: 'sup-007',
          materialCode: CODE,
          feedstockQty: 1500,
          confirmedOn: today()
        }
      }
    );
    expect(r.status, r.reason).toBe('done');

    renderWithProviders(<BuyerInventory />, {
      identity: BUYER,
      route: '/buyer/inventory?type=VERP'
    });
    fireEvent.click(await screen.findByTestId(`pti-stock-row-sup-007-${CODE}`));
    const line = await screen.findByTestId(`pti-feedstock-sup-007-${CODE}`);
    expect(line.textContent).toMatch(/^Feedstock \(confirmed .+\) 1,500 /);
    expect(screen.getByTestId(`pti-feedstock-by-sup-007-${CODE}`).textContent).toMatch(
      /^Confirmed by supplier on /
    );
    expect(screen.getByTestId(`pti-feedstock-target-sup-007-${CODE}`).textContent).toMatch(
      /^Target 0 /
    );
    // E1 and E2 answered [Team, 2026-10-28]: no Provisional label.
    expect(screen.queryByTestId(`pti-feedstock-provisional-sup-007-${CODE}`)).toBeNull();
  });
});
