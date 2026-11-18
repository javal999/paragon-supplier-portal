// ────────────────────────────────────────────────────────────────────────────
// AIB-3 (BL-351) on PTI Call-offs — the missing-ASN chase tab.
//
// The list is the DERIVED chase: co-0006 (confirmed, sent 7 days ago, no ASN)
// and co-0002 (a dispatch notice is not an ASN) are on it; co-0001 (received)
// and co-0007 (missed) are not. (The ASN-covering rule is pinned in
// `callOffChaseCommand.test.js`, where the stores are built for it. The
// walkthrough fixture's CO-2026-0043/0044 reuse the base seed's ids, so a
// seed-based assertion on those two would be ambiguous.) The planner closes one
// with a reason and the row leaves; a seat without `calloffchase:close` reads
// the list but is told whose act the close is.
// ────────────────────────────────────────────────────────────────────────────

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { renderWithProviders, BUYER } from '@test/test-utils';
import BuyerCallOffs from '../BuyerCallOffs';
import { callOffStore } from '@services/data/mock/stores/callOffStore';
import { asnStore } from '@services/data/mock/stores/asnStore';
import { goodsReceiptStore } from '@services/data/mock/stores/goodsReceiptStore';
import { callOffChaseStore } from '@services/data/mock/stores/callOffChaseStore';
import { SEEDED_SEAT_ROLES } from '@services/transitions/businessRoles';
import { callOffChaseRows } from '@services/transitions/callOffChase';
import { sdcClock } from '@services/sdc';
import i18n from '@lib/i18n';

const PLANNER = { ...BUYER, businessRoles: SEEDED_SEAT_ROLES.buyer };
/** A procurement seat: call-off plan/review, but not the chase close. */
const PROCUREMENT = { ...BUYER, businessRoles: /** @type {string[]} */ (['procurement']) };

beforeEach(() => {
  callOffStore.reset();
  asnStore.reset();
  goodsReceiptStore.reset();
  callOffChaseStore.reset();
});
afterEach(() => {
  void i18n.changeLanguage('en');
});

/**
 * @param {string} [route]
 * @param {typeof BUYER} [identity]
 */
const openChase = async (route = '/buyer/call-offs?tab=chase', identity = PLANNER) => {
  renderWithProviders(<BuyerCallOffs />, { identity, route });
  return screen.findByTestId('calloff-chase');
};

describe('AIB-3 — the chase list', () => {
  it('opens from `?tab=chase` and lists the sent call-offs with no ASN', async () => {
    await openChase();
    expect(screen.getByRole('tab', { name: 'Missing ASN' })).toHaveAttribute(
      'aria-selected',
      'true'
    );
    // Confirmed, sent 7 days ago, no ASN — the textbook chase.
    expect(screen.getByTestId('calloff-chase-row-co-0006')).toBeInTheDocument();
    // A dispatch notice is a heads-up, not an ASN.
    expect(screen.getByTestId('calloff-chase-row-co-0002')).toBeInTheDocument();
    expect(screen.getByTestId('calloff-chase-asn-co-0006')).toHaveTextContent('No ASN submitted');
    // A received call-off has no ASN left to chase; a missed one is past it.
    expect(screen.queryByTestId('calloff-chase-row-co-0001')).toBeNull();
    expect(screen.queryByTestId('calloff-chase-row-co-0007')).toBeNull();
    // The honest note travels with the list.
    expect(screen.getByTestId('calloff-chase-note')).toHaveTextContent(
      'The 7-day reminder before the need date (CR-09) still runs separately'
    );
  });

  it('the planner closes one with a reason: the row leaves and the closure is stored', async () => {
    await openChase();
    const row = screen.getByTestId('calloff-chase-row-co-0006');
    fireEvent.click(within(row).getByTestId('calloff-chase-close-co-0006'));
    const reason = within(row).getByTestId('calloff-chase-reason-co-0006');
    // The confirm stays disabled until the reason says something.
    expect(within(row).getByTestId('calloff-chase-confirm-co-0006')).toBeDisabled();
    fireEvent.change(reason, { target: { value: 'Supplier promised the ASN tomorrow' } });
    fireEvent.click(within(row).getByTestId('calloff-chase-confirm-co-0006'));
    await waitFor(() =>
      expect(screen.queryByTestId('calloff-chase-row-co-0006')).not.toBeInTheDocument()
    );
    expect(callOffChaseStore.all()).toEqual([
      expect.objectContaining({
        callOffId: 'co-0006',
        reason: 'Supplier promised the ASN tomorrow'
      })
    ]);
  });

  it('a seat without calloffchase:close reads the list but gets the handoff, not the close', async () => {
    await openChase('/buyer/call-offs?tab=chase', PROCUREMENT);
    expect(screen.getByTestId('calloff-chase-row-co-0006')).toBeInTheDocument();
    expect(screen.getByTestId('handoff-calloff-chase-co-0006')).toBeInTheDocument();
    expect(screen.queryByTestId('calloff-chase-close-co-0006')).toBeNull();
  });

  it('reads in Indonesian', async () => {
    await openChase();
    await i18n.changeLanguage('id');
    expect(await screen.findByText('ASN belum ada')).toBeInTheDocument();
    expect(screen.getByTestId('calloff-chase-asn-co-0006')).toHaveTextContent('Belum ada ASN');
    expect(screen.getByTestId('calloff-chase-close-co-0006')).toHaveTextContent(
      'Tutup tindak lanjut'
    );
  });

  it('the empty list says so', async () => {
    // Close every chase the derivation currently holds open: the list is empty
    // and still honest. Derived, never a hand-kept list of ids.
    const open = callOffChaseRows(
      callOffStore.all(),
      asnStore.all(),
      goodsReceiptStore.all(),
      [],
      sdcClock.now()
    ).filter((r) => r.state === 'open');
    expect(open.length).toBeGreaterThan(0); // control: there really were rows
    for (const r of open)
      callOffChaseStore.append({
        callOffId: r.callOffId,
        reason: 'Handled by phone',
        closedAt: sdcClock.now(),
        closedBy: { kind: 'UNATTRIBUTED', reason: 'NO_PERSON_IN_SESSION' }
      });
    await openChase();
    expect(screen.getByTestId('calloff-chase-empty')).toBeInTheDocument();
  });
});
