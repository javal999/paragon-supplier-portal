// ─────────────────────────────────────────────────────────────────────────────
// ONE CLOCK — what the demo user creates is dated on the HUB clock.
//
// The demo hub's present is `DECLARED_PRESENT` (read through `sdcClock.now()`).
// Every seeded row is coherent there. A record or a count taken off the MACHINE
// clock instead lands wherever the laptop's calendar is — an RFQ award read
// "22 Sept 2026" beside a hub at 31 Aug 2026 (PR #34), and the same split sat in
// the goods-receipt wizard, the supplier channel simulator and the dashboard
// widgets.
//
// ⚠️ **EVERY TEST HERE MOVES THE MACHINE CLOCK FAR AWAY FIRST.** The pin puts the
// machine at 2027-03-15 03:07Z — a different day, month, year AND hour from the
// hub's 2026-08-31 12:00Z. Without that, a surface still reading `new Date()`
// would agree with the hub whenever the suite happened to run on the declared
// present, and every assertion below would pass over the defect. The control
// test asserts the pin really moved the machine.
// ─────────────────────────────────────────────────────────────────────────────
import { describe, it, expect, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import { renderWithProviders, SUPPLIER } from '@test/test-utils';
import { usePinnedDemoClock } from '@test/demoClock';
import { DECLARED_PRESENT } from '@services/data/fixturePresent';
import { sdcClock } from '@services/sdc/clock';
import GRInspectionWizard from '@components/v2-features/GRInspectionWizard';
import { asnStore } from '@services/data/mock/stores/asnStore';
import { goodsReceiptStore } from '@services/data/mock/stores/goodsReceiptStore';
import { mockShipments } from '@data/mockShipments';
import { COMPLIANCE_REGISTRY } from '@services/data/mock/fixtures/complianceRegistry';
import { halalOf } from '@services/sdc/halal';
import { bpomOf } from '@services/sdc/bpom';
/** @import { EnforcementSetting } from '@lib/enforcement' */
import SupplierWhatsApp from './SupplierWhatsApp';
import BuyerComplianceWidget from './widgets/BuyerComplianceWidget';
import { computeStatus, daysRemaining } from '@services/data/complianceProjection';

/** The machine's calendar during every test: nowhere near the hub's present. */
const MACHINE = '2027-03-15T03:07:00.000Z';
// `usePinnedDemoClock` is a Vitest setup helper, not a React hook: it registers
// beforeEach/afterEach and must run at module scope (see src/test/demoClock.js).
// eslint-disable-next-line react-hooks/rules-of-hooks
usePinnedDemoClock(MACHINE);

const HHMM = /** @type {const} */ ({ hour: '2-digit', minute: '2-digit' });
const hubTime = () => new Date(sdcClock.now()).toLocaleTimeString('en-GB', HHMM);
const machineTime = () => new Date().toLocaleTimeString('en-GB', HHMM);

describe('the pin really moves the machine clock (else everything below is vacuous)', () => {
  it('machine and hub disagree on the day AND on the time of day', () => {
    expect(new Date().toISOString().slice(0, 10)).toBe('2027-03-15');
    expect(sdcClock.now().slice(0, 10)).toBe(DECLARED_PRESENT);
    expect(DECLARED_PRESENT).toBe('2026-08-31');
    expect(machineTime()).not.toBe(hubTime());
  });
});

// ─── A GOODS RECEIPT RECORDED IN THE WIZARD ──────────────────────────────────
const ELIGIBLE = mockShipments.filter(
  (s) => (s.status === 'At Dock' || s.status === 'Unloading') && s.lineItems.length > 0
);
// The one dock source the wizard can be finished on (wizardSettleSpeaks §91).
const ANSWERABLE = ELIGIBLE.find((s) =>
  s.lineItems.every((li) => halalOf(li.materialCode).ok && bpomOf(li.materialCode).ok)
);
/** @type {readonly EnforcementSetting[]} */
const EMPTY_LEDGER = [];
/**
 * @param {string} check
 * @param {'Pass' | 'Fail'} v
 */
const radioFor = (check, v) => screen.getByRole('radio', { name: new RegExp(`${check}.*${v}`) });

describe('GR wizard — a receipt recorded in the demo is dated at the declared present', () => {
  beforeEach(() => {
    asnStore.reset();
    goodsReceiptStore.reset();
  });

  it('the received-date field opens on the hub day, and the stored GR carries it', async () => {
    expect(
      ANSWERABLE,
      'no finishable dock source — the walk below would test nothing'
    ).toBeDefined();
    const before = new Set(goodsReceiptStore.all().map((g) => g.id));
    renderWithProviders(
      <GRInspectionWizard
        onClose={() => {}}
        onComplete={() => {}}
        shipments={mockShipments}
        asns={[...asnStore.all()]}
        enforcementSettings={EMPTY_LEDGER}
        complianceRegistry={COMPLIANCE_REGISTRY}
      />
    );
    const next = () => screen.getByRole('button', { name: /Next/i });
    fireEvent.click(
      await screen.findByText(
        /** @type {import('@data/mockShipments').Shipment} */ (ANSWERABLE).asnNumber
      )
    );
    fireEvent.click(next()); // → receipt info

    // The field the clerk sees. It read the literal '2026-05-20' before.
    const dateInput = /** @type {HTMLInputElement} */ (
      document.querySelector('input[type="date"]')
    );
    expect(dateInput.value).toBe(DECLARED_PRESENT);

    fireEvent.click(next()); // → quality
    fireEvent.click(radioFor('BPOM Lot Tracking', 'Pass'));
    fireEvent.click(radioFor('Halal Seal Check', 'Pass'));
    expect(next()).toBeEnabled();
    fireEvent.click(next()); // → summary
    fireEvent.click(screen.getByRole('button', { name: /Create GR/i }));

    // The RECORD, not the form: the GR the dispatcher stored.
    await waitFor(() => expect(goodsReceiptStore.all().some((g) => !before.has(g.id))).toBe(true), {
      timeout: 4000
    });
    const created = /** @type {import('@data/mockGoodsReceipts').GoodsReceipt} */ (
      goodsReceiptStore.all().find((g) => !before.has(g.id))
    );
    expect(created.receivedDate).toBe(DECLARED_PRESENT);
    expect(created.receivedDate).not.toBe('2027-03-15');
  });
});

// ─── A SUPPLIER CHANNEL REPLY SENT IN THE DEMO ───────────────────────────────
describe('SupplierWhatsApp — a reply sent in the simulator is stamped on the hub clock', () => {
  it('the new message carries the hub time, never the machine time', async () => {
    renderWithProviders(<SupplierWhatsApp />, { identity: SUPPLIER });
    const hub = hubTime();
    const machine = machineTime();
    const before = screen.queryAllByText(hub).length;
    expect(screen.queryAllByText(machine)).toHaveLength(0);

    // The first quick reply the default scenario offers — a supplier message.
    const reply = /** @type {HTMLButtonElement} */ (
      document.querySelector('button.rounded-full.border')
    );
    expect(reply, 'no quick reply rendered — nothing below would send a message').toBeTruthy();
    fireEvent.click(reply);

    // One more element on screen reads the hub time — the reply just sent.
    await waitFor(() => expect(screen.queryAllByText(hub).length).toBe(before + 1));
    expect(screen.queryAllByText(machine)).toHaveLength(0);
  });

  it('the page states the hub day, not the machine day, as the session date', () => {
    renderWithProviders(<SupplierWhatsApp />, { identity: SUPPLIER });
    const text = document.body.textContent ?? '';
    expect(text).toContain('31 Aug 2026');
    expect(text).not.toContain('15 Mar 2027');
  });
});

// ─── A DASHBOARD WIDGET'S "DAYS LEFT" COUNT ──────────────────────────────────
describe('BuyerComplianceWidget — "Days left" counts from the hub clock', () => {
  it('every flagged row shows the days remaining at the declared present', async () => {
    const hubNow = sdcClock.now();
    const flagged = COMPLIANCE_REGISTRY.filter((e) => {
      const s = computeStatus(e, hubNow);
      return s === 'Expiring' || s === 'Expired';
    });
    // Non-vacuity: the hub present must flag something, and the machine present
    // must disagree about at least one row's count, or this proves nothing.
    expect(flagged.length).toBeGreaterThan(0);
    const machineNow = new Date().toISOString();
    expect(flagged.some((e) => daysRemaining(e, hubNow) !== daysRemaining(e, machineNow))).toBe(
      true
    );

    renderWithProviders(<BuyerComplianceWidget />);
    fireEvent.click(await screen.findByRole('button', { name: /Expand.*Compliance/i }));
    const dialog = await screen.findByRole('dialog');
    const cells = within(dialog)
      .getAllByRole('row')
      .slice(1)
      .map((r) => within(r).getAllByRole('cell')[3]?.textContent);
    expect(cells.sort()).toEqual(flagged.map((e) => `${daysRemaining(e, hubNow)}d`).sort());
  });
});
