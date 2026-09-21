// ─────────────────────────────────────────────────────────────────────────────
// BL-44 demo data — one invoice per CR-12 case, pinned BY NAME.
//
// Each case is reached through the VALUE the rule computes from the corpus
// (the line outcome), and must return exactly the named invoice. A count would
// be satisfied by the wrong invoice; a stored `matchStatus` alone would be
// satisfied by a fixture that disagrees with the rule. So both are checked:
// the rule is re-run over every receipt-based invoice, and its answer must be
// the named member AND equal what the fixture stores.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, expect, it } from 'vitest';
import { INVOICES } from './invoices';
import { mockPurchaseOrders } from '../../../../data/mockPurchaseOrders';
import { mockGoodsReceipts } from '../../../../data/mockGoodsReceipts';
import { mockContracts } from '../../../../data/mockContracts';
import {
  checkInvoicePrices,
  deriveInvoiceVerdict,
  invoiceLineRefusal,
} from '../../../transitions/fulfilmentRules';
import type { PriceCheckOutcome } from '../../../transitions/invoiceRollup';

const lined = INVOICES.filter((i) => i.lines && i.lines.length > 0);

/** Invoices whose single price line has this outcome under this rule, by id. */
const withOutcome = (rule: 'contract' | 'standard', outcome: PriceCheckOutcome) =>
  lined
    .filter((i) => checkInvoicePrices(i).lines.some((l) => l.rule === rule && l.outcome === outcome))
    .map((i) => i.id)
    .sort();

describe('BL-44 demo — every CR-12 case is present, by name', () => {
  it('population control: the receipt-based invoices are the five demo invoices', () => {
    // A known member present and a known lineless invoice absent, before any
    // case is asserted, so an empty population cannot pass the cases below.
    expect(lined.map((i) => i.id).sort()).toEqual([
      'inv-brl-0061',
      'inv-brl-0062',
      'inv-brl-0063',
      'inv-brl-0064',
      'inv-brl-0065',
    ]);
    expect(lined.map((i) => i.id)).not.toContain('inv-brl-0042');
  });

  it('contract price, billed exactly → passes (inv-brl-0061)', () => {
    expect(withOutcome('contract', 'exact')).toEqual(['inv-brl-0061']);
  });

  it('contract price, off by any amount → held (inv-brl-0062, Rp 10,000 over)', () => {
    expect(withOutcome('contract', 'contractDiffers')).toEqual(['inv-brl-0062']);
    const [line] = checkInvoicePrices(INVOICES.find((i) => i.id === 'inv-brl-0062')!).lines;
    expect(line.difference).toBe(10_000);
  });

  it('no contract, within 2% and under the cap → passes (inv-brl-0063)', () => {
    expect(withOutcome('standard', 'withinTolerance')).toEqual(['inv-brl-0063']);
  });

  it('no contract, within 2% but over the cap → held (inv-brl-0064)', () => {
    expect(withOutcome('standard', 'overCap')).toEqual(['inv-brl-0064']);
    const [line] = checkInvoicePrices(INVOICES.find((i) => i.id === 'inv-brl-0064')!).lines;
    expect(line.percent!).toBeLessThanOrEqual(2);
  });

  it('no contract, over 2% → held (inv-brl-0065)', () => {
    expect(withOutcome('standard', 'overPercent')).toEqual(['inv-brl-0065']);
  });

  it('the stored match status is the verdict the rule gives, on every demo invoice', () => {
    for (const inv of lined) {
      expect({ id: inv.id, match: deriveInvoiceVerdict(inv, mockGoodsReceipts) }).toEqual({
        id: inv.id,
        match: inv.matchStatus,
      });
    }
    // …and a held invoice has not advanced; a matched one has.
    const status = (id: string) => INVOICES.find((i) => i.id === id)!.status;
    expect(['inv-brl-0061', 'inv-brl-0063'].map(status)).toEqual(['Matched', 'Matched']);
    expect(['inv-brl-0062', 'inv-brl-0064', 'inv-brl-0065'].map(status)).toEqual([
      'Submitted',
      'Submitted',
      'Submitted',
    ]);
  });

  it('each total equals its lines, so no demo invoice relies on an unsplit difference', () => {
    expect(lined.filter((i) => checkInvoicePrices(i).unsplit !== null).map((i) => i.id)).toEqual([]);
  });
});

describe('BL-44 demo — the data could have been created through the verb', () => {
  it('every demo line passes the same refusal the create policy runs (receipt, quantity, price, contract)', () => {
    for (const inv of lined) {
      const po = mockPurchaseOrders.find((p) => p.poNumber === inv.poNumber)!;
      for (const line of inv.lines!) {
        expect({
          id: inv.id,
          refusal: invoiceLineRefusal(line, {
            supplierId: inv.supplierId,
            po,
            receipts: mockGoodsReceipts,
            invoices: INVOICES,
            excludeInvoiceId: inv.id,
          }),
        }).toEqual({ id: inv.id, refusal: null });
      }
    }
  });

  it('every PO line contract resolves to a contract of the same supplier', () => {
    const priced = mockPurchaseOrders.flatMap((po) =>
      po.lineItems.filter((li) => li.contractNumber).map((li) => ({ po, li })),
    );
    expect(priced.map(({ li }) => li.id)).toEqual(['li-025a']);
    for (const { po, li } of priced) {
      const contract = mockContracts.find((c) => c.contractNumber === li.contractNumber);
      expect(contract?.supplierId).toBe(po.supplierId);
    }
  });
});
