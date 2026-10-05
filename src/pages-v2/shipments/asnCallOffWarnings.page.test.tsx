// MR-6 BR-10 to BR-12 on the pages, through the real mock service: the
// supplier's warnings on BOTH submit paths (the wizard's confirm step and the
// Submit drawer on a draft — FU-5), and the planner's "Mismatch" marker with
// the figures, with "not in declared stock" beside it (FU-7).

import { screen, fireEvent, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { renderWithProviders, SUPPLIER, BUYER } from '@test/test-utils';
import { purchaseOrderStore } from '@services/data/mock/stores/purchaseOrderStore';
import { asnStore } from '@services/data/mock/stores/asnStore';
import { callOffStore } from '@services/data/mock/stores/callOffStore';
import { inventoryDeclarationStore } from '@services/data/mock/stores/inventoryDeclarationStore';
import { MockCommandService, commandAuditSink } from '@services/data/mock/MockCommandService';
import { PERSONA_SYSTEM_ROLES } from '@services/transitions/businessRoles';
import { NO_PERSON } from '@context/noPerson';
import type { QueryScope } from '@services/data/types';
import SupplierShipments from '../SupplierShipments';
import BuyerShipments from '../BuyerShipments';
import BuyerCallOffs from '../BuyerCallOffs';

const MAT = 'PK-PETB-8801';
const svc = new MockCommandService();
const sup007: QueryScope = {
  personaType: 'supplier',
  supplierId: 'sup-007',
  businessRoles: PERSONA_SYSTEM_ROLES.supplier,
  actor: NO_PERSON,
};

beforeEach(() => {
  purchaseOrderStore.reset();
  asnStore.reset();
  callOffStore.reset();
  inventoryDeclarationStore.reset();
  commandAuditSink.clear();
});

// co-0006 — sup-007, PO-2025-00107, PK-PETB-8801, 10,000 PCS, Confirmed.
const needDate = () => callOffStore.get('co-0006')!.needDate;

describe('supplier — the call-off warnings before submit (MR-6 BR-10, BR-12)', () => {
  it('AC-05 — the wizard confirm step shows "11,000 vs 10,000 called off (+10%)", and the ASN still submits', async () => {
    renderWithProviders(<SupplierShipments />, { identity: SUPPLIER });
    expect(await screen.findByText('ASN-2025-00215')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: /Create ASN/ }));
    fireEvent.click(await screen.findByRole('button', { name: /PO-2025-00107/ }));
    const picker = await screen.findByLabelText('Call-off (optional)');
    await waitFor(() => expect(picker.querySelector('option[value="co-0006"]')).not.toBeNull());
    fireEvent.change(picker, { target: { value: 'co-0006' } });
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));

    fireEvent.change(await screen.findByLabelText('Tracking or vehicle number'), { target: { value: 'B 1234 XY' } });
    fireEvent.change(screen.getByLabelText('Ship date *'), { target: { value: needDate() } });
    fireEvent.change(screen.getByLabelText('Estimated arrival *'), { target: { value: needDate() } });
    fireEvent.change(screen.getByLabelText(`Shipped quantity for ${MAT}`), { target: { value: '11000' } });
    fireEvent.change(screen.getByLabelText(`Batch number for ${MAT}`), { target: { value: 'LOT-9' } });
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));

    const warnings = await screen.findByTestId('asn-wizard-warnings');
    expect(warnings).toHaveTextContent('Quantity 11,000 vs 10,000 called off on CO-2026-0006 (+10%; allowance 5%)');

    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: 'Submit ASN' }));
    await waitFor(() =>
      expect(commandAuditSink.byEvent('t_asn_submit').filter((e) => e.outcome === 'done')).toHaveLength(1),
    );
    const created = asnStore.all().find((a) => a.callOffId === 'co-0006');
    expect(created?.status).toBe('Submitted');
    expect(created?.callOffWarnings?.map((w) => w.kind)).toEqual(['qtyOver']);
  });

  it('passes: the same wizard at 10,000 shows no call-off warning', async () => {
    renderWithProviders(<SupplierShipments />, { identity: SUPPLIER });
    expect(await screen.findByText('ASN-2025-00215')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: /Create ASN/ }));
    fireEvent.click(await screen.findByRole('button', { name: /PO-2025-00107/ }));
    const picker = await screen.findByLabelText('Call-off (optional)');
    await waitFor(() => expect(picker.querySelector('option[value="co-0006"]')).not.toBeNull());
    fireEvent.change(picker, { target: { value: 'co-0006' } });
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    fireEvent.change(await screen.findByLabelText('Tracking or vehicle number'), { target: { value: 'B 1234 XY' } });
    fireEvent.change(screen.getByLabelText('Ship date *'), { target: { value: needDate() } });
    fireEvent.change(screen.getByLabelText('Estimated arrival *'), { target: { value: needDate() } });
    fireEvent.change(screen.getByLabelText(`Shipped quantity for ${MAT}`), { target: { value: '10000' } });
    fireEvent.change(screen.getByLabelText(`Batch number for ${MAT}`), { target: { value: 'LOT-9' } });
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(await screen.findByRole('button', { name: 'Submit ASN' })).toBeInTheDocument();
    expect(screen.queryByTestId('asn-wizard-warnings')).toBeNull();
  });

  it('FU-5 — the Submit drawer on a draft shows the batch warning AND the unlinked call-off warning (AC-06)', async () => {
    // sup-007's stock record: batch PET-A with 3,000.
    inventoryDeclarationStore.add({
      id: 'inv-9902',
      supplierId: 'sup-007',
      materialCode: MAT,
      declaredAt: '2026-09-01T02:00:00.000Z',
      totalQty: 3000,
      uom: 'PCS',
      batches: [{ batchNumber: 'PET-A', qty: 3000, uom: 'PCS', expiryDate: '2028-01-31' }],
      provenance: { source: 'SUPPLIER', liveness: 'SIMULATED', planState: 'committed' },
    });
    renderWithProviders(<SupplierShipments />, { identity: SUPPLIER });
    // ASN-2025-00215 — a draft on PO-2026-00124, whose line has open confirmed call-offs.
    expect(await screen.findByText('ASN-2025-00215')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Submit' }));
    const batch = await screen.findByLabelText(`Batch number for ${MAT}`);
    await waitFor(() => expect(batch.tagName).toBe('SELECT'));
    fireEvent.change(batch, { target: { value: 'PET-A' } });
    fireEvent.change(screen.getByLabelText(`Shipped quantity for ${MAT}`), { target: { value: '4000' } });

    const warnings = await screen.findByTestId('asn-submit-warnings');
    expect(warnings).toHaveTextContent(`${MAT}: ships 4,000 from batch PET-A, above the 3,000 available`);
    expect(screen.getByTestId('asn-calloff-warning-unlinked')).toHaveTextContent(/CO-2026-0015.*for PK-PETB-8801; link it\?/);
  });
});

describe('planner — "Mismatch" with the current figures, and "not in declared stock" beside it', () => {
  const submitOver = async () => {
    const created = await svc.dispatch(sup007, {
      transitionId: 't_asn_create',
      entity: 'advanceShipNotice',
      payload: {
        poReference: 'PO-2025-00107',
        callOffId: 'co-0006',
        shipDate: needDate(),
        lines: [{ materialCode: MAT, shippedQty: 11000, batchNumber: 'LOT-TYPED', batchSource: 'typed' }],
      },
    });
    await svc.dispatch(sup007, {
      transitionId: 't_asn_submit',
      entity: 'advanceShipNotice',
      entityId: created.entityId!,
      payload: { carrier: 'Sample Courier', trackingNumber: 'B 1 XY', eta: needDate() },
    });
    return created.entityId!;
  };

  it('AC-05 — the ASN list on the PO shows Mismatch with the figures, and the typed batch (FU-7)', async () => {
    const asnNumber = await submitOver();
    renderWithProviders(<BuyerShipments />, { identity: BUYER, route: '/buyer/shipments?po=po-007&from=order-summary' });
    const marker = await screen.findByTestId(`asn-mismatch-${asnNumber}`);
    expect(marker).toHaveTextContent('Mismatch');
    expect(marker).toHaveTextContent('Quantity 11,000 vs 10,000 called off on CO-2026-0006 (+10%; allowance 5%)');
    expect(screen.getByTestId(`asn-not-declared-${asnNumber}-${MAT}`)).toHaveTextContent('Not in declared stock');
    // Known-good: a fixture ASN on the same PO carries no marker.
    expect(screen.queryByTestId('asn-mismatch-ASN-2025-00211')).toBeNull();
  });

  it('the call-off page marks the call-off and its ASN', async () => {
    const asnNumber = await submitOver();
    renderWithProviders(<BuyerCallOffs />, { identity: BUYER, route: '/buyer/call-offs' });
    expect(await screen.findByTestId('calloff-mismatch-co-0006')).toHaveTextContent('Mismatch');
    // Known-good: a call-off with no mismatching ASN carries none.
    expect(screen.queryByTestId('calloff-mismatch-co-0002')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /CO-2026-0006/ }));
    expect(await screen.findByTestId(`asn-mismatch-${asnNumber}`)).toHaveTextContent('11,000 vs 10,000');
  });
});
