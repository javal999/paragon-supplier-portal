// ─────────────────────────────────────────────────────────────────────────────
// Purchase-order fixtures · two single-purpose rows: po-028 (BL-49 value-limit line) and po-131 (CP-2 PO-2025-00131).
// Separate so each authored group reads alone; `retimed.js` concatenates the
// groups in this file order, so the exported array order is unchanged.
// Rows are RAW 2025 literals; a comment below that says "the foot of this
// file" means `retimed.js`, where the shift now lives.
// ─────────────────────────────────────────────────────────────────────────────
/** @import { PurchaseOrder, POLineItem } from '@services/data/types' */
import { POStatus, ChannelType } from '@services/data/types';

/** @type {PurchaseOrder[]} */
export const singleCaseOrdersRaw = [
  // ══ BL-49 — `PO-2026-00128`, THE ONE VALUE-LIMIT LINE ═════════════════════
  //
  // BL-13 decided that the umbrella PO holds a QUANTITY per line, so a call-off
  // release is checked against remaining quantity. CR-04 keeps VALUE as the
  // check only "where a line has no quantity" — an SAP value-limit line. Every
  // other line in this fixture has a quantity, so without this row the value
  // branch of the release check had no reachable example on the screen.
  //
  // ⚠️ `quantity: 0` HERE MEANS "NO QUANTITY", NOT "NOTHING ORDERED". The line
  // commits `valueLimit`; `unitPrice` is the agreed price a call-off's value is
  // priced at. `totalValue` is the limit, which is what the line is worth.
  // Supplier `sup-003` and material `FR-WARD-4410` (with its existing meaning)
  // are already in the document lane, so no census moves; no ASN or receipt
  // names this order.
  {
    id: 'po-028',
    poNumber: 'PO-2026-00128',
    prReference: 'PR-2026-00425',
    supplierId: 'sup-003',
    supplierName: 'Sample Fragrance House Indonesia',
    status: POStatus.CONFIRMED,
    channel: ChannelType.API,
    currency: 'IDR',
    totalValue: 500_000_000,
    orderDate: '2025-04-03',
    requestedDeliveryDate: '2025-06-30',
    confirmedDeliveryDate: '2025-06-30',
    daysOverdue: 0,
    acknowledgmentTimeHours: 6,
    lineItems: [
      /** @satisfies {POLineItem} */ ({
        id: 'li-028a',
        materialCode: 'FR-WARD-4410',
        description: 'Wardah Signature Floral Compound',
        quantity: 0,
        uom: 'KG',
        unitPrice: 2_200_000,
        confirmedQty: 0,
        valueLimit: 500_000_000
      })
    ],
    response: {
      option: 'approve',
      respondedAt: '2025-04-03T08:00:00.000Z',
      confirmedDeliveryDate: '2025-06-30'
    }
  },

  // ══ CP-2 · 2B-5b-i — `PO-2025-00131`, AUTHORED (operator ruling R-4) ═══════
  //
  // ── WHY IT EXISTS NOW ─────────────────────────────────────────────────────
  //   Until this batch, THREE INDEPENDENT FIXTURES referenced this PO and no
  //   fixture authored it:
  //     · `invoices.js`            — `inv-smpl-1180`, poId `po-131`
  //     · `supplierDocuments.js`   — `doc-201`, `linkedTo: 'PO-2025-00131'`
  //     · `supplierShipments.js`   — `ASN-2025-00302`, `poReference`
  //   The ruling: REPOINTING THREE REFERENCES TO HIDE A MISSING OBJECT IS
  //   WORSE THAN THE GAP. The object should exist because three lanes already
  //   act as though it does.
  //
  // ── WHAT THE THREE REFERENCES DETERMINE ───────────────────────────────────
  //   Supplier (`sup-005`, Sample Personal Care Emulsifiers GmbH), currency
  //   (IDR, from the invoice), and that the supply was DELIVERED — the ASN is
  //   `Delivered` with an eta of 2025-04-18. `orderDate` is set before that
  //   eta so the ASN's own selection rule (level 2) holds for the reference
  //   that was already correct.
  //
  // ── ⚠️ WHAT THEY DO NOT DETERMINE, AND IS THEREFORE NOT INVENTED ──────────
  //   **NO LINE ITEM.** None of the three references states a material for this
  //   PO: the invoice carries no lines, `doc-201` carries no material, and the
  //   ASN's lines are the ASN's. Authoring one would mean choosing between
  //   `MAT-40220` — widening a space R-3 declared dead into this, the DECLARED
  //   DOCUMENT LANE — and a master code, which is the retirement R-1 sent to
  //   5b-ii. Both are forbidden here, so the line set is EMPTY AND PINNED
  //   (`asnRefIntegrity.test.js`), not silently plausible.
  //   `totalValue` is 0 for the same reason: every other PO in this fixture
  //   satisfies `totalValue === Σ(quantity × unitPrice)`, and 0 is that sum
  //   over an empty line set. Picking a value would be picking a side in the
  //   disagreement below.
  //
  // ── WHAT THE THREE REFERENCES DISAGREE ABOUT (reported, not resolved) ─────
  //   1. MONEY. `inv-smpl-1180` bills 1 120 000 000 IDR. The storefront's own
  //      offer for what the ASN shipped (`c201`, 210 000 IDR/KG) against the
  //      2 400 KG shipped is 504 000 000 — a 2.2× gap. The invoice ALREADY
  //      states this: `matchStatus: 'Price Variance'`, `status: 'Disputed'`.
  //      The tree asserts the invoice and its PO do not agree on money, so no
  //      authored total can make them agree without erasing the dispute.
  //   2. TIME. The ASN delivered 2025-04-18; the invoice was submitted
  //      2026-05-14 — thirteen months later. Left as found.
  //
  // ── ⚠️ AND THE FINDING THAT MATTERS MOST HANGS OFF THIS ROW ───────────────
  //   `doc-201` is a **BPOM Notification (SAMPLE-BPOM-0005A)**, category
  //   `BPOM Regulatory`, linked to THIS PO — whose ASN carries `MAT-40220`,
  //   for which `inferBpom` returns **false**. The tree already states that a
  //   BPOM registration governs this supply. That `false` is ASSERTED AGAINST
  //   IN-TREE EVIDENCE, NOT MERELY IN ITS ABSENCE. See `BPOM-OFF-BY-SPACE-01`.
  {
    id: 'po-131',
    poNumber: 'PO-2025-00131',
    supplierId: 'sup-005',
    supplierName: 'Sample Personal Care Emulsifiers GmbH',
    status: POStatus.DELIVERED,
    channel: ChannelType.EMAIL,
    currency: 'IDR',
    totalValue: 0,
    orderDate: '2025-03-12',
    requestedDeliveryDate: '2025-04-18',
    confirmedDeliveryDate: '2025-04-18',
    daysOverdue: 0,
    acknowledgmentTimeHours: 12,
    lineItems: []
  }
];
