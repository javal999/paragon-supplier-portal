import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders, BUYER, SUPPLIER } from '@test/test-utils';
import i18n from '@lib/i18n';
import { formatNumber } from '@lib/format';
import { useFixedStockReconcile } from '@services/query/hooks';
/** @import { FsLeftoverRule } from '@services/transitions/feedstockReconcile' */
import { buildFeedstockReconcile } from '@services/transitions/feedstockReconcile';
import { BuyerFixedStockReconcile, SupplierFixedStockReconcile } from './FixedStockReconcile';

// ─────────────────────────────────────────────────────────────────────────────
// DRC-15b (BL-207) [Proposed] — every variant of the leftover switch on the
// page, on the worked example PO 100 / called off 60 / ASN 40 (remainder 40).
// The rows are built by the real pure rule with the variant set; only the read
// hook is stubbed so each variant can be shown.
// ─────────────────────────────────────────────────────────────────────────────

vi.mock('@services/query/hooks', async (importOriginal) => ({
  ...(await /** @type {typeof importOriginal<typeof import('@services/query/hooks')>} */ (
    importOriginal
  )()),
  useFixedStockReconcile: vi.fn()
}));

const KEY = 'sup-a|PK-1';
/** @param {number} n */
const pcs = (n) => `${formatNumber(n)} PCS`;

/**
 * @param {FsLeftoverRule} leftoverRule
 * @param {number | null} max
 */
const rowsFor = (leftoverRule, max) =>
  buildFeedstockReconcile({
    purchaseOrders: [
      {
        poNumber: 'PO-1',
        supplierId: 'sup-a',
        supplierName: 'Supplier A',
        status: 'Confirmed',
        lineItems: [
          {
            id: 'PO-1-1',
            materialCode: 'PK-1',
            description: 'Bottle 100 ml',
            quantity: 100,
            uom: 'PCS',
            unitPrice: 1,
            confirmedQty: 0
          }
        ]
      }
    ],
    callOffs: [
      {
        id: 'c1',
        callOffNumber: 'CO-1',
        supplierId: 'sup-a',
        supplierName: 'Supplier A',
        materialCode: 'PK-1',
        description: 'Bottle 100 ml',
        uom: 'PCS',
        status: 'Confirmed',
        quantity: 60
      }
    ],
    asns: [
      {
        asnNumber: 'ASN-1',
        status: 'Delivered',
        callOffId: 'c1',
        lineItems: [
          { materialCode: 'PK-1', description: '', orderedQty: 40, shippedQty: 40, lotNumber: 'L1' }
        ]
      }
    ],
    maxStock: () => max,
    maxStockSettable: () => true,
    asOf: '2026-08-31',
    leftoverRule
  });

/**
 * @param {FsLeftoverRule} rule
 * @param {number | null} max
 */
const stub = (rule, max) =>
  vi.mocked(useFixedStockReconcile).mockReturnValue(
    /** @type {any} */ ({
      isPending: false,
      isError: false,
      data: { items: rowsFor(rule, max) },
      refetch: vi.fn()
    })
  );

const render = () =>
  renderWithProviders(<BuyerFixedStockReconcile />, {
    identity: BUYER,
    route: '/buyer/fs-reconcile'
  });

const renderSupplier = () =>
  renderWithProviders(<SupplierFixedStockReconcile />, {
    identity: SUPPLIER,
    route: '/supplier/fs-reconcile'
  });

beforeEach(() => {
  vi.mocked(useFixedStockReconcile).mockReset();
});

afterEach(() => {
  void i18n.changeLanguage('en');
});

describe('DRC-15b [Proposed BL-207] — the leftover switch on the page', () => {
  it('showOnly: the remainder 40 is shown, with no flag, no carry and no row label', async () => {
    stub('showOnly', 25);
    render();
    expect(await screen.findByTestId(`fsr-uncalled-${KEY}`)).toHaveTextContent(pcs(40));
    expect(screen.queryByTestId(`fsr-liability-${KEY}`)).toBeNull();
    expect(screen.queryByTestId(`fsr-carried-${KEY}`)).toBeNull();
    expect(screen.queryByTestId(`fsr-proposed-${KEY}`)).toBeNull();
    const note = screen.getByTestId('fsr-remainder-note');
    expect(note).toHaveAttribute('data-leftover-rule', 'showOnly');
    expect(note).toHaveTextContent('switch “show only”');
    expect(note).toHaveTextContent('Proposed: awaiting owner review (BL-207)');
  });

  it('flagLiability, max stock 25: liability 25', async () => {
    stub('flagLiability', 25);
    render();
    expect(await screen.findByTestId(`fsr-liability-${KEY}`)).toHaveTextContent(
      `Liability, not priced: ${pcs(25)}`
    );
    expect(screen.queryByTestId(`fsr-liability-nomax-${KEY}`)).toBeNull();
    expect(screen.getByTestId(`fsr-proposed-${KEY}`)).toHaveTextContent(
      'Proposed: awaiting owner review (BL-207)'
    );
  });

  it('flagLiability, no max stock: liability 40 and "No max stock agreed"', async () => {
    stub('flagLiability', null);
    render();
    expect(await screen.findByTestId(`fsr-liability-${KEY}`)).toHaveTextContent(
      `Liability, not priced: ${pcs(40)}`
    );
    expect(screen.getByTestId(`fsr-liability-nomax-${KEY}`)).toHaveTextContent(
      'No max stock agreed'
    );
  });

  it('carryToNextPo: 40 carried into the next PO, nothing flagged', async () => {
    stub('carryToNextPo', 25);
    render();
    expect(await screen.findByTestId(`fsr-carried-${KEY}`)).toHaveTextContent(
      `Carried into the next PO: ${pcs(40)}`
    );
    expect(screen.queryByTestId(`fsr-liability-${KEY}`)).toBeNull();
    expect(screen.getByTestId(`fsr-proposed-${KEY}`)).toBeInTheDocument();
    expect(screen.getByTestId('fsr-remainder-note')).toHaveTextContent('switch “carry to next PO”');
  });

  // [Owner FSR-D2, 2026-11-03] BL-259 — the leftover notes are PTI only until
  // BL-207 is ruled: the same rows, rendered for the supplier, carry none of
  // them under any variant, while the PTI view above still shows them.
  it.each([
    ['flagLiability', 25],
    ['flagLiability', null],
    ['carryToNextPo', 25]
  ])('BL-259: the supplier sees no leftover note under %s (max %s)', async (rule, max) => {
    stub(/** @type {FsLeftoverRule} */ (rule), max);
    renderSupplier();
    expect(await screen.findByTestId(`fsr-uncalled-${KEY}`)).toHaveTextContent(pcs(40));
    expect(screen.queryByTestId(`fsr-liability-${KEY}`)).toBeNull();
    expect(screen.queryByTestId(`fsr-liability-nomax-${KEY}`)).toBeNull();
    expect(screen.queryByTestId(`fsr-carried-${KEY}`)).toBeNull();
    expect(screen.queryByTestId(`fsr-proposed-${KEY}`)).toBeNull();
    expect(screen.queryByTestId('fsr-remainder-note')).toBeNull();
  });

  it('carryToNextPo reads in Indonesian', async () => {
    await i18n.changeLanguage('id');
    stub('carryToNextPo', null);
    render();
    expect(await screen.findByTestId(`fsr-carried-${KEY}`)).toHaveTextContent(
      'Dibawa ke PO berikutnya:'
    );
    expect(screen.getByTestId(`fsr-proposed-${KEY}`)).toHaveTextContent(
      'Usulan: menunggu tinjauan pemilik (BL-207)'
    );
    expect(screen.getByTestId('fsr-remainder-note')).toHaveTextContent(
      'pilihan “bawa ke PO berikutnya”'
    );
  });
});
