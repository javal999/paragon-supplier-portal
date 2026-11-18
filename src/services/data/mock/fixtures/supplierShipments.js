// ────────────────────────────────────────────────────────────────────────────
// Supplier shipments / ASN fixtures.
//
// Relocated from src/pages-v2/SupplierShipments.jsx in Phase 1B Batch 2.
// Every row carries supplierId so applySupplierScope can enforce identity
// boundaries structurally — a supplier query CANNOT see another supplier's
// ASNs.
//
// ═══ CP-2 · 2B-5b-i — THE REFERENTIAL LEG, SECOND LANE ══════════════════════
//
// ── THE GOVERNING LINE ─────────────────────────────────────────────────────
//   A REFERENCE THAT RESOLVES TO THE WRONG OBJECT IS NOT WEAKER EVIDENCE THAN
//   NO REFERENCE. IT IS EVIDENCE POINTING THE WRONG WAY, AND A RETIREMENT RULE
//   THAT READS IT WILL RETIRE ONTO THE WRONG CODE.
//
//   2B-5b was dispatched to retire the seven `MAT-*` ASN codes onto master
//   codes under R-1's declared-ownership rule. That rule needs a MATCHING
//   master row, and the strongest available evidence of what an ASN line IS
//   would be the PO line it ships against. Every one of those was wrong:
//   ONE OF SIX ASNs NAMED A PO ITS OWN SUPPLIER OWNED; ZERO NAMED A PO
//   CARRYING THE MATERIAL THEY SHIP. The batch stopped and split.
//
// ── WHAT WAS WRONG BEFORE THIS BATCH (six references, five defective) ──────
//   ASN-2025-00211 · sup-007 → PO-2025-00112, owned by sup-003 (Sample Fragrance House)
//   ASN-2025-00198 · sup-007 → PO-2025-00107, owned by sup-007 ✅ (the one)
//   ASN-2025-00201 · sup-007 → PO-2025-00109, owned by sup-008 (Sample Carton)
//   ASN-2025-00215 · sup-007 → PO-2025-00115, owned by sup-009 (Sample Vitamins)
//                     (repaired to PO-2025-00107 here; re-derived to
//                      PO-2026-00124 by the same rule once the demo-data batch
//                      gave sup-007 more than one confirmable order — see the
//                      row itself)
//   ASN-2025-00301 · sup-002 → PO-2025-00120, owned by sup-011 (Sample Salicylics)
//   ASN-2025-00302 · sup-005 → PO-2025-00131, WHICH DID NOT EXIST
//
//   ⚠️ FOUR OF THESE WERE CROSS-TENANT, AND THAT IS NOT COSMETIC. `poReference`
//   renders to the addressee (`SupplierShipments.jsx:331`) and flows into the
//   GR wizard's draft as `poNumber` (`GRInspectionWizard.jsx:181`), so a
//   Sample Fragrance House PO number was being shown to PT Sample Packaging. Identity scoping is
//   enforced on `supplierId` (`applySupplierScope`), which means the ASN was
//   correctly scoped TO the right tenant while carrying ANOTHER tenant's
//   document number inside it — the scope check cannot see a foreign
//   identifier in a string field.
//
// ── THE SELECTION RULE (stated, so the result can be re-derived) ───────────
//   `supplierId` is authoritative — the same ruling 2B-5a made for the chase
//   lane. Each reference moves to a PO selected by an ORDERED rule, applied
//   uniformly, first level that yields a unique answer:
//     1. the PO's `supplierId` equals the ASN's  (the enforced axis);
//     2. the PO IS AT OR PAST CONFIRMATION — the write path offers ASN creation
//        only on CONFIRMED POs (`SupplierShipments.jsx:533`, `:633`), so an ASN
//        against an unconfirmed order is a state the product cannot produce;
//     3. the PO's `orderDate` is on or before the ASN's `eta`  (a shipment
//        cannot precede its own order);
//     4. among survivors, the PO not DETERMINATELY COMPLETE — some line with
//        `confirmedQty < quantity`  (an ASN in flight implies undelivered qty).
//   Every one of the four moves below is unique at level 2, 3 or 4. The rule
//   and its application are pinned in `asnRefIntegrity.test.js`.
//
//   ⚠️ LEVEL 2 IS HERE BECAUSE A TEST FOUND IT, AND THE TEST WAS RIGHT. The
//   rule first ran without it and sent the Draft `ASN-2025-00215` to
//   `PO-2025-00108` on an outstanding-quantity heuristic. `SupplierShipments`
//   went red: `PO-2025-00108` is SENT, not CONFIRMED, and consuming it as an
//   ASN parent also emptied the "awaiting ASN" panel the create affordance
//   lives in. A LEGALITY CONSTRAINT READ OFF THE WRITE PATH BEATS A
//   PLAUSIBILITY HEURISTIC, and the failing test was evidence rather than an
//   obstacle — it is the only reason this rule now derives the answer instead
//   of guessing it.
//
//   ⚠️ AND THE RULE IS AUTHORED, NOT DERIVED — LABELLED, NOT SMOOTHED. 2B-5a
//   could DERIVE the chase lane's repair because the agreement fixture already
//   contained the answer. The PO lane does not: it holds no sup-007 order for
//   a fragrance, a 50 ml bottle, an aluminium closure or an active emulsion.
//   So the rule narrows the candidate set to one; it does not read the answer
//   off a record. The AXIS IT REPAIRS (tenant) is determined by the tree. THE
//   AXIS IT DOES NOT REPAIR (material) IS PINNED OPEN, not quietly satisfied.
//
// ── WHAT THIS BATCH DELIBERATELY DOES NOT DO ──────────────────────────────
//   No `MAT-*` code is retired and no master row is authored (operator rulings
//   R-1/R-2/R-3). Consequently NO ASN line's material can be made to match its
//   parent PO line: the matching PO line would have to carry either a
//   third-space code — widening a space R-3 declared dead INTO the declared
//   document lane — or a master code, which is the retirement 5b-ii owns.
//   The residual is an EXACT SET in `asnRefIntegrity.test.js`, not a silence.
// ────────────────────────────────────────────────────────────────────────────

/** @import { ASN } from '../../types' */
import { shiftFields } from '../../fixturePresent';

// ⚠️ RAW, AUTHORED literals (2025). `MOCK_ASNS` at the foot of the file is the
// shifted export — this corpus belongs to the `purchaseOrder` family, because
// `asnRefIntegrity.test.js`'s level-3 rule compares `po.orderDate <= asn.eta`
// and a cross-family comparison is exactly what the declared present does not
// cancel. Membership follows the coupling, not the directory.
/** @type {ASN[]} */
const MOCK_ASNS_RAW = [
  {
    asnNumber: 'ASN-2025-00211',
    // AIB-1 BR-03 / BR-04 (BL-348) — the ZWME021 sequence and the Surat
    // Jalan (External ID). One sequence = one ASN (AIB-D1).
    sequence: '1',
    externalId: 'SJ-2025-00211',
    supplierId: 'sup-007',
    // 2B-5b-i — was `PO-2025-00112` (sup-003, Sample Fragrance House). Unique at level 2:
    // sup-007 owns PO-2025-00107 (ordered 2025-03-15) and PO-2025-00108
    // (ordered 2025-04-03); only the former precedes this eta of 2025-04-02.
    poReference: 'PO-2025-00107',
    status: 'In Transit',
    carrier: 'Sample Express Courier (illustrative)',
    // BL-51 demo — a 3PL on the list and offered: the tracking number is a link.
    threePlId: 'tpl-sample-express',
    trackingNumber: 'SMPL-EXP-882941-X',
    eta: '2025-04-02',
    details: {
      originCity: 'Surabaya, ID',
      destinationWarehouse: 'Paragon DC Cikarang (WH-04)',
      totalCartons: 312,
      grossWeightKg: 4280,
      temperatureRequirement: 'Ambient (15–25°C)'
    },
    lineItems: [
      {
        materialCode: 'FR-ROUD-4470',
        description: 'Fragrance Concentrate — Rose Oud',
        orderedQty: 1200,
        shippedQty: 1200,
        lotNumber: 'LOT-A4481'
      },
      {
        materialCode: 'PK-PETB-8804',
        description: 'PET Bottle 50ml Clear',
        orderedQty: 15000,
        shippedQty: 14820,
        lotNumber: 'LOT-A4482'
      }
    ]
  },
  {
    asnNumber: 'ASN-2025-00198',
    // AIB-1 BR-03 / BR-04 (BL-348) — the ZWME021 sequence and the Surat
    // Jalan (External ID). One sequence = one ASN (AIB-D1).
    sequence: '2',
    externalId: 'SJ-2025-00198',
    supplierId: 'sup-007',
    // 2B-5b-i — UNCHANGED. The one reference of six that already named a PO its
    // own addressee owns. Its MATERIAL still disagrees (this PO orders
    // `PK-PETB-8801`, a PET bottle; the line below ships an aluminium closure)
    // — see the header: that axis is 5b-ii's.
    poReference: 'PO-2025-00107',
    status: 'Delivered',
    carrier: 'Sample Postal Logistics (illustrative)',
    // BL-51 demo — a second listed 3PL, with a query-string address pattern.
    threePlId: 'tpl-sample-postal',
    trackingNumber: 'SMPL-PST-7723-BC-4401',
    eta: '2025-03-22',
    details: {
      originCity: 'Bandung, ID',
      destinationWarehouse: 'Paragon DC Karawang (WH-02)',
      totalCartons: 188,
      grossWeightKg: 2610,
      temperatureRequirement: 'Ambient (15–25°C)'
    },
    lineItems: [
      {
        materialCode: 'PK-ALCP-2450',
        description: 'Aluminium Closure 24/410',
        orderedQty: 48000,
        shippedQty: 48000,
        lotNumber: 'LOT-C9911'
      }
    ]
  },
  {
    asnNumber: 'ASN-2025-00201',
    // AIB-1 BR-03 / BR-04 (BL-348) — the ZWME021 sequence and the Surat
    // Jalan (External ID). One sequence = one ASN (AIB-D1).
    sequence: '3',
    externalId: 'SJ-2025-00201',
    supplierId: 'sup-007',
    // 2B-5b-i — was `PO-2025-00109` (sup-008, PT Sample Carton). Unique at
    // level 2: PO-2025-00108 is ordered 2025-04-03, after this eta of
    // 2025-03-27.
    poReference: 'PO-2025-00107',
    status: 'Discrepancy',
    carrier: 'Sample Parcel Courier (illustrative)',
    // BL-51 demo — names a 3PL the list does NOT hold: the number stays plain text.
    threePlId: 'tpl-sample-parcel',
    trackingNumber: 'SMPL-PCL-119843-JKT',
    eta: '2025-03-27',
    details: {
      originCity: 'Jakarta, ID',
      destinationWarehouse: 'Paragon DC Cibitung (WH-01)',
      totalCartons: 94,
      grossWeightKg: 1340,
      temperatureRequirement: 'Cool chain (2–8°C)'
    },
    lineItems: [
      {
        materialCode: 'AI-NIAC-6612',
        description: 'Active Emulsion — Niacinamide 5%',
        orderedQty: 800,
        shippedQty: 720,
        lotNumber: 'LOT-E2203'
      },
      {
        materialCode: 'AI-HYALU-6615',
        description: 'Active Emulsion — Hyaluronic 2%',
        orderedQty: 600,
        shippedQty: 540,
        lotNumber: 'LOT-E2204'
      }
    ]
  },
  {
    asnNumber: 'ASN-2025-00215',
    supplierId: 'sup-007',
    // 2B-5b-i — was `PO-2025-00115` (sup-009, Sample Vitamins), repaired to
    // `PO-2025-00107`; REPOINTED AGAIN IN THE DEMO-DATA BATCH, and the rule did
    // the repointing rather than a preference.
    //
    // ⚠️ **LEVEL 2 NO LONGER DECIDES THIS ROW ALONE, AND THAT IS A FACT ABOUT
    // THE FIXTURE, NOT A CHANGE OF MIND.** The note this replaces read:
    //
    //     "A DRAFT with an empty `eta`, so level 3 constrains nothing; LEVEL 2
    //      decides alone: PO-2025-00108 is SENT, and an ASN cannot exist
    //      against an unconfirmed order, leaving PO-2025-00107 (CONFIRMED) as
    //      sup-007's only legal parent."
    //
    // Every word of that was true while sup-007 owned ONE order at or past
    // confirmation. It owns six now (the walkthrough set in
    // `mockPurchaseOrders.js`), so level 2 returns six candidates, the empty
    // `eta` still makes level 3 vacuous, and LEVEL 4 — "NOT determinately
    // complete" — is reached for the first time. It resolves to `PO-2026-00124`,
    // the only sup-007 order with a line the supplier did not confirm in full.
    //
    // ⚠️ The uniqueness is now an INVARIANT ON THE ORDER FIXTURE rather than an
    // accident of its size, and it is stated there: exactly one sup-007 order at
    // or past confirmation may be partially confirmed. `asnRefIntegrity.test.js`
    // re-derives this reference from the rule, so it goes red by name the day a
    // second one is.
    // ⚠️ This row still carries NO line items, so it remains the one ASN whose
    // every referential axis — including material — passes.
    poReference: 'PO-2026-00124',
    status: 'Draft',
    carrier: '—',
    trackingNumber: '—',
    eta: '',
    details: {
      originCity: '—',
      destinationWarehouse: '—',
      totalCartons: 0,
      grossWeightKg: 0,
      temperatureRequirement: '—'
    },
    lineItems: []
  },
  {
    asnNumber: 'ASN-2025-00301',
    // AIB-1 BR-03 / BR-04 (BL-348) — the ZWME021 sequence and the Surat
    // Jalan (External ID). One sequence = one ASN (AIB-D1).
    sequence: '1',
    externalId: 'SJ-2025-00301',
    supplierId: 'sup-002',
    // 2B-5b-i — was `PO-2025-00120` (sup-011, Sample Salicylics). Both sup-002
    // orders precede this eta, so level 3 decides: PO-2025-00102 is confirmed
    // in full (8 000 of 8 000), PO-2025-00116 is PARTIALLY_DELIVERED with
    // 10 000 of 15 000 and 5 000 of 10 000 — outstanding quantity, which an
    // In-Transit ASN implies. That it is ALSO the specialty-fats order is a
    // consequence of the rule, not the reason for it.
    poReference: 'PO-2025-00116',
    status: 'In Transit',
    carrier: 'Sample Interisland Line (illustrative)',
    // BL-51 demo — a 3PL no longer offered on new ASNs still links here.
    threePlId: 'tpl-sample-interisland',
    trackingNumber: 'SMPL-ISL-4471-SBY',
    eta: '2025-05-06',
    details: {
      originCity: 'Medan, ID',
      destinationWarehouse: 'Paragon DC Cikarang (WH-04)',
      totalCartons: 420,
      grossWeightKg: 9800,
      temperatureRequirement: 'Ambient (15–25°C)'
    },
    lineItems: [
      {
        materialCode: 'RM-PSTN-7150',
        description: 'RBD Palm Stearin — Specialty Fat',
        orderedQty: 8000,
        shippedQty: 8000,
        lotNumber: 'LOT-M7781'
      }
    ]
  },
  {
    asnNumber: 'ASN-2025-00302',
    // AIB-1 BR-03 / BR-04 (BL-348) — the ZWME021 sequence and the Surat
    // Jalan (External ID). One sequence = one ASN (AIB-D1).
    sequence: '1',
    externalId: 'SJ-2025-00302',
    supplierId: 'sup-005',
    // 2B-5b-i — REFERENCE UNCHANGED; THE OBJECT WAS AUTHORED (operator ruling
    // R-4). `PO-2025-00131` did not exist in `mockPurchaseOrders.js` while
    // THREE independent fixtures acted as though it did — this ASN, invoice
    // `inv-smpl-1180`, and supplier document `doc-201`. Repointing three
    // references to hide a missing object is worse than the gap, so the object
    // now exists. See `mockPurchaseOrders.js` (`po-131`) for what the three
    // references do and do not determine.
    poReference: 'PO-2025-00131',
    status: 'Delivered',
    carrier: 'Sample Freight Forwarder (illustrative)',
    // BL-51 demo — NO 3PL named, although the typed carrier matches a listed
    // 3PL's name: nothing is matched by name, so the number stays plain text.
    trackingNumber: 'SMPL-FFW-99120-JKT',
    eta: '2025-04-18',
    details: {
      originCity: 'Frankfurt, DE',
      destinationWarehouse: 'Paragon DC Karawang (WH-02)',
      totalCartons: 96,
      grossWeightKg: 2160,
      temperatureRequirement: 'Ambient (15–25°C)'
    },
    lineItems: [
      {
        materialCode: 'RM-EMUL-9440',
        description: 'Sample Blend PF-20 Emulsifier',
        orderedQty: 2400,
        shippedQty: 2400,
        lotNumber: 'LOT-B5540'
      }
    ]
  }
];

// ─────────────────────────────────────────────────────────────────────────────
// THE DECLARED PRESENT — shifted with the purchase orders these ASNs name, so
// `orderDate <= eta` survives the re-anchor by construction rather than by two
// offsets that happen to agree.
// ─────────────────────────────────────────────────────────────────────────────
/** @type {ASN[]} */
export const MOCK_ASNS = shiftFields(MOCK_ASNS_RAW, 'purchaseOrder', ['eta']);
