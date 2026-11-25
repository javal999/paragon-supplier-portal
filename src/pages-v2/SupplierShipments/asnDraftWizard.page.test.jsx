// ─────────────────────────────────────────────────────────────────────────────
// UCX-P3 (BL-364) — "Complete the delivery details" on the draft ASN that
// "Mark as shipped" opened.
//
// The drawer's step 1 creates the draft from the call-off (its quantity and
// need date); this spec pins step 2: the wizard opens on the DRAFT's details
// (never on the PO's open quantity), one message names what is missing, and
// completing the wizard SUBMITS that draft — it does not create a second ASN
// for the same shipment (UCX-F10).
// ─────────────────────────────────────────────────────────────────────────────

import { screen, fireEvent, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { renderWithProviders, SUPPLIER } from '@test/test-utils';
import { callOffStore } from '@services/data/mock/stores/callOffStore';
import { asnStore } from '@services/data/mock/stores/asnStore';
import { purchaseOrderStore } from '@services/data/mock/stores/purchaseOrderStore';
import { DECLARED_PRESENT } from '@services/data/fixturePresent';
import { nextFreeSequence } from '@services/transitions/shipmentNotice';
/** @import { ASN, CallOff } from '@services/data/types' */
import SupplierShipments from './index';

beforeEach(() => {
  callOffStore.reset();
  asnStore.reset();
  purchaseOrderStore.reset();
});

const DRAFT = 'ASN-2026-901';

/** The draft "Mark as shipped" opens for co-0006, added to the ASN store. */
const seedDraft = () => {
  const c = /** @type {CallOff} */ (callOffStore.get('co-0006'));
  // The sequence "Mark as shipped" prefills: the next free number for sup-007.
  const sequence = nextFreeSequence(asnStore.all().filter((a) => a.supplierId === 'sup-007'));
  /** @type {ASN} */
  const draft = {
    asnNumber: DRAFT,
    supplierId: 'sup-007',
    poReference: c.poNumber,
    status: 'Draft',
    carrier: 'Sample Express Courier (illustrative)',
    trackingNumber: '',
    eta: c.needDate,
    // The drawer's step 1 sent the shipped date (the hub's today) with it.
    shipDate: DECLARED_PRESENT,
    sequence,
    externalId: '',
    callOffId: c.id,
    details: {
      originCity: 'Bekasi, ID',
      destinationWarehouse: 'Paragon Plant J6',
      totalCartons: 0,
      grossWeightKg: 0,
      temperatureRequirement: 'Ambient'
    },
    lineItems: [
      {
        materialCode: c.materialCode,
        description: c.description,
        orderedQty: c.quantity,
        shippedQty: c.quantity,
        lotNumber: '',
        uom: c.uom
      }
    ]
  };
  asnStore.add(draft);
  return { callOff: c, draft };
};

/** @param {CallOff} c */
const route = (c) => `/supplier/shipments?tab=create&po=${c.poId}&callOff=${c.id}&draft=${DRAFT}`;

/**
 * Type the batch, whether the line offers declared batches or not.
 * @param {string} material
 * @param {string} value
 */
const enterBatch = (material, value) => {
  const field = screen.getByLabelText(new RegExp(`^Batch number for ${material}`));
  if (field.tagName === 'SELECT') {
    fireEvent.change(field, { target: { value: '__typed__' } });
    fireEvent.change(
      screen.getByLabelText(new RegExp(`^Batch number not in the list for ${material}`)),
      {
        target: { value }
      }
    );
    return;
  }
  fireEvent.change(field, { target: { value } });
};

describe('UCX-P3 — the draft ASN opens on its details and submits once', () => {
  it('shows the draft’s values, names every remaining gap, and submits THAT draft', async () => {
    const { callOff: c, draft } = seedDraft();
    const before = asnStore.all().length;
    renderWithProviders(<SupplierShipments />, { identity: SUPPLIER, route: route(c) });

    // Step 2 is current: the draft's sequence, arrival and quantity are there.
    const sequence = await screen.findByLabelText('Sequence');
    expect(sequence).toHaveValue(draft.sequence);
    expect(screen.getByLabelText(/^Estimated arrival/)).toHaveValue(c.needDate);
    expect(screen.getByLabelText(`Shipped quantity for ${c.materialCode}`)).toHaveValue(
      String(c.quantity)
    );
    // One message names every remaining field, the batch included.
    expect(screen.getByTestId('asn-wizard-missing')).toHaveTextContent(
      `To continue, fill in: Tracking or vehicle number, Surat Jalan (External ID), Batch number for ${c.materialCode}.`
    );

    fireEvent.change(screen.getByLabelText(/^Tracking or vehicle number/), {
      target: { value: 'SMPL-TRK-UCX-1' }
    });
    fireEvent.change(screen.getByLabelText(/^Surat Jalan/), {
      target: { value: 'SJ-2026-9001' }
    });
    enterBatch(c.materialCode, 'LOT-UCX-1');

    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    // The review step: tick, then submit.
    fireEvent.click(await screen.findByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: 'Submit ASN' }));

    await waitFor(() => expect(/** @type {ASN} */ (asnStore.get(DRAFT)).status).toBe('Submitted'));
    const submitted = /** @type {ASN} */ (asnStore.get(DRAFT));
    expect(submitted.trackingNumber).toBe('SMPL-TRK-UCX-1');
    expect(submitted.externalId).toBe('SJ-2026-9001');
    expect(submitted.lineItems).toEqual([
      expect.objectContaining({ materialCode: c.materialCode, lotNumber: 'LOT-UCX-1' })
    ]);
    // No second record: the same shipment was reported once.
    expect(asnStore.all()).toHaveLength(before);
  });
});

describe('UCX-P3 — a new ASN prefills the next free sequence (UCX-D13)', () => {
  it('opens step 2 on the next free number, from the supplier’s live ASNs', async () => {
    // The counter's arithmetic is pinned in `shipmentNotice.test.js`; this is
    // the page's wiring: the prefilled value comes from the ASN read.
    const expected = nextFreeSequence(asnStore.all().filter((a) => a.supplierId === 'sup-007'));
    renderWithProviders(<SupplierShipments />, {
      identity: SUPPLIER,
      route: '/supplier/shipments?tab=create&po=po-007'
    });
    const card = await screen.findByRole('button', { name: /PO-2025-00107/ });
    expect(card).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    await waitFor(() => expect(screen.getByLabelText('Sequence')).toHaveValue(expected));
  });
});
