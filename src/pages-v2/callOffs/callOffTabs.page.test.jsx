// ─────────────────────────────────────────────────────────────────────────────
// P-12 (IA-B06) and IA-B13 on PTI Call-offs: the tabs with the decision
// first, the tab in the address, every link made before the split still
// opening the tab that holds what it filters, and `?highlight=<call-off id>`
// (the link What to order and Make warehouse room show) opening that call-off.
// ─────────────────────────────────────────────────────────────────────────────

import { beforeEach, describe, expect, it, afterEach, vi } from 'vitest';
import { fireEvent, screen, within } from '@testing-library/react';
import { renderWithProviders, BUYER } from '@test/test-utils';
import BuyerCallOffs, { impliedCallOffTab } from '../BuyerCallOffs';
import { callOffStore } from '@services/data/mock/stores/callOffStore';
import { purchaseOrderStore } from '@services/data/mock/stores/purchaseOrderStore';
import { SEEDED_SEAT_ROLES } from '@services/transitions/businessRoles';
import i18n from '@lib/i18n';

const PLANNER = { ...BUYER, businessRoles: SEEDED_SEAT_ROLES.buyer };

// jsdom has no layout, so `scrollIntoView` is not implemented.
const scroll = vi.fn();
beforeEach(() => {
  callOffStore.reset();
  purchaseOrderStore.reset();
  scroll.mockClear();
  Element.prototype.scrollIntoView = scroll;
});
afterEach(() => {
  void i18n.changeLanguage('en');
});

/** @param {string} route */
const render = (route) => renderWithProviders(<BuyerCallOffs />, { identity: PLANNER, route });

/** @param {string} name */
const selected = (name) =>
  expect(screen.getByRole('tab', { name })).toHaveAttribute('aria-selected', 'true');

describe('the tab a link implies (impliedCallOffTab)', () => {
  it('names To act for a status the banner counts, All for the rest, and nothing for a plain visit', () => {
    /** @param {string} q */
    const of = (q) => impliedCallOffTab(new URLSearchParams(q));
    expect(of('status=awaitingApproval')).toBe('toAct');
    expect(of('status=escalated')).toBe('toAct');
    expect(of('status=atRisk')).toBe('toAct');
    expect(of('status=drift')).toBe('toAct');
    expect(of('status=all')).toBe('all');
    expect(of('po=po-007')).toBe('all');
    expect(of('highlight=co-0002')).toBe('all');
    expect(of('newFor=sup-007&material=PK-PETB-8801')).toBe('all');
    expect(of('')).toBeNull();
    expect(of('status=bogus')).toBeNull();
  });
});

describe('PTI Call-offs — tabs (P-12)', () => {
  it('opens on To act: the tabs in order, only what needs acting on', async () => {
    render('/buyer/call-offs');
    expect(await screen.findByTestId('calloff-row-co-0004')).toBeInTheDocument();
    expect(screen.getAllByRole('tab').map((tab) => tab.textContent)).toEqual([
      'To act',
      'Missing ASN',
      'All call-offs',
      'Blanket POs running out'
    ]);
    selected('To act');
    // Awaiting approval (0004), escalated (0009) and at risk (0005) are here …
    expect(screen.getByTestId('calloff-row-co-0009')).toBeInTheDocument();
    expect(screen.getByTestId('calloff-row-co-0005')).toBeInTheDocument();
    // … a dispatched call-off with nothing to act on is not.
    expect(screen.queryByTestId('calloff-row-co-0002')).toBeNull();
    // The action banner stays above the tabs.
    const banner = screen.getByTestId('pti-calloff-banner');
    expect(
      banner.compareDocumentPosition(screen.getByRole('tablist')) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
    expect(screen.queryByTestId('calloff-runout-list')).toBeNull();
  });

  it('?tab=runOut opens Blanket POs running out; ?tab=all opens All call-offs', async () => {
    const runOut = render('/buyer/call-offs?tab=runOut');
    expect(await screen.findByTestId('calloff-runout-list')).toBeInTheDocument();
    selected('Blanket POs running out');
    expect(screen.queryByTestId('calloff-row-co-0004')).toBeNull();
    runOut.unmount();

    render('/buyer/call-offs?tab=all');
    expect(await screen.findByTestId('calloff-row-co-0002')).toBeInTheDocument();
    selected('All call-offs');
  });

  it('?status=awaitingApproval from My tasks opens To act with that chip', async () => {
    render('/buyer/call-offs?status=awaitingApproval');
    expect(await screen.findByTestId('calloff-row-co-0004')).toBeInTheDocument();
    selected('To act');
    expect(screen.getByRole('radio', { name: /Awaiting approval/ })).toHaveAttribute(
      'aria-checked',
      'true'
    );
    expect(screen.queryByTestId('calloff-row-co-0005')).toBeNull();
  });

  it('?po= from the order summary opens All call-offs, filtered to that PO', async () => {
    render('/buyer/call-offs?po=po-007');
    expect(await screen.findByTestId('calloff-umbrella-po-007-li-007a')).toBeInTheDocument();
    selected('All call-offs');
    expect(screen.getByTestId('calloff-row-co-0002')).toBeInTheDocument();
  });

  it('an explicit ?tab= wins over the tab a status implies', async () => {
    render('/buyer/call-offs?status=awaitingApproval&tab=all');
    expect(await screen.findByTestId('calloff-row-co-0002')).toBeInTheDocument();
    selected('All call-offs');
  });

  it('choosing a tab moves between them and keeps the page', async () => {
    render('/buyer/call-offs');
    fireEvent.click(await screen.findByRole('tab', { name: 'Blanket POs running out' }));
    expect(await screen.findByTestId('calloff-runout-list')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: 'All call-offs' }));
    expect(await screen.findByTestId('calloff-row-co-0002')).toBeInTheDocument();
    expect(screen.queryByTestId('calloff-runout-list')).toBeNull();
  });

  it('reads in Indonesian', async () => {
    await i18n.changeLanguage('id');
    render('/buyer/call-offs');
    await screen.findByTestId('calloff-row-co-0004');
    expect(screen.getAllByRole('tab').map((tab) => tab.textContent)).toEqual([
      'Perlu tindakan',
      'ASN belum ada',
      'Semua call-off',
      'PO induk yang akan habis'
    ]);
    expect(screen.getByRole('radio', { name: /^Semua yang perlu tindakan/ })).toHaveAttribute(
      'aria-checked',
      'true'
    );
  });
});

describe('PTI Call-offs — one call-off from a link (IA-B13)', () => {
  it('?highlight=<id> opens All call-offs on that row, marks it and opens its panel', async () => {
    const co = /** @type {import('@services/data/types').CallOff} */ (callOffStore.get('co-0002'));
    render('/buyer/call-offs?highlight=co-0002');
    const row = await screen.findByTestId('calloff-row-co-0002');
    selected('All call-offs');
    expect(row).toHaveAttribute('aria-current', 'true');
    expect(row.className).toContain('bg-action-soft');
    expect(scroll.mock.contexts).toContain(row);
    const dialog = /** @type {HTMLElement} */ (
      await screen.findByRole('dialog', { name: new RegExp(co.callOffNumber) })
    );
    expect(within(dialog).getAllByText(new RegExp(co.callOffNumber)).length).toBeGreaterThan(0);
    // Control — another row is not marked.
    expect(screen.getByTestId('calloff-row-co-0001')).not.toHaveAttribute('aria-current');
  });

  it('?highlight= naming no call-off says so and marks nothing', async () => {
    render('/buyer/call-offs?highlight=co-nope');
    expect(await screen.findByTestId('calloff-highlight-missing')).toHaveTextContent(
      'The call-off this link names is not on this page.'
    );
    expect(document.querySelector('[aria-current="true"]')).toBeNull();
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
