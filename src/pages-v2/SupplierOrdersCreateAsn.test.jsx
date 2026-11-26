// ─────────────────────────────────────────────────────────────────────────────
// IA-S01 / IA-S04 — "Create ASN" opens the Create-ASN wizard for the record.
//
// It used to show a toast pointing at a page with another name (#229 made the
// toast honest; this replaces it with the act). From a PO the wizard opens on
// Shipments & ASN with that PO picked and a way back; from a confirmed call-off
// it opens with the call-off chosen too. A seat that cannot run the wizard
// (`asn:create` + `asn:submit`) reads the wait instead of the button.
// ─────────────────────────────────────────────────────────────────────────────

import { screen, fireEvent, within } from '@testing-library/react';
import { DECLARED_PRESENT } from '@services/data/fixturePresent';
import { useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { renderWithProviders, SUPPLIER } from '@test/test-utils';
import { useToast } from '@hooks/useToast';
import { purchaseOrderStore } from '@services/data/mock/stores/purchaseOrderStore';
import { callOffStore } from '@services/data/mock/stores/callOffStore';
import { asnStore } from '@services/data/mock/stores/asnStore';
import { POStatus } from '@services/data/types';
import { isConfirmedAndAccepted, approvedDeliveries } from '@services/transitions/callOffRules';
import i18n from '@lib/i18n';
import { supplierOrdersEn, supplierOrdersId } from '@lib/i18n/supplierOrders';
import { supplierShipmentsEn, supplierShipmentsId } from '@lib/i18n/supplierShipments';
import SupplierOrders from './SupplierOrders';
import SupplierShipments from './SupplierShipments';
import SupplierCallOffs from './SupplierCallOffs';

const ToastSpy = () => {
  const { toasts } = useToast();
  return (
    <ul data-testid="toast-spy">
      {toasts.map((x) => (
        <li key={x.id}>{x.title}</li>
      ))}
    </ul>
  );
};

const LocationProbe = () => {
  const loc = useLocation();
  return <div data-testid="location">{`${loc.pathname}${loc.search}`}</div>;
};

/** A seat with neither ASN atom: they sit in the fulfilment lane only. */
const COMMERCIAL_ONLY = { ...SUPPLIER, businessRoles: ['supplier', 'commercial'] };

beforeEach(() => {
  purchaseOrderStore.reset();
  callOffStore.reset();
  asnStore.reset();
});

/** A Confirmed order the seeded supplier seat can see, read from the store. */
const confirmedPo = () => {
  const po = purchaseOrderStore
    .all()
    .find((p) => p.supplierId === SUPPLIER.supplierId && p.status === POStatus.CONFIRMED);
  if (!po) throw new Error('fixture premise: sup-007 has a Confirmed order');
  return po;
};

/** A confirmed, accepted call-off of sup-007 on a PO an ASN may ship against. */
const confirmedCallOff = () => {
  const shippable = new Set(
    purchaseOrderStore
      .all()
      .filter(
        (p) =>
          p.supplierId === SUPPLIER.supplierId &&
          (p.status === POStatus.CONFIRMED || p.status === POStatus.PARTIALLY_DELIVERED)
      )
      .map((p) => p.id)
  );
  const c = callOffStore.all().find((x) => shippable.has(x.poId) && isConfirmedAndAccepted(x));
  if (!c) throw new Error('fixture premise: sup-007 has a confirmed call-off on a shippable PO');
  return c;
};

/** @param {import('@context/CurrentIdentityContext').CurrentIdentity} identity */
const renderOrders = (identity = SUPPLIER) =>
  renderWithProviders(
    <>
      <SupplierOrders />
      <ToastSpy />
      <LocationProbe />
    </>,
    { identity, route: '/supplier/orders?view=list' }
  );

describe('SupplierOrders — Create ASN opens the wizard for the PO (IA-S01)', () => {
  it('the panel button navigates with `po`, and no toast is shown', async () => {
    renderOrders();
    const po = confirmedPo();
    fireEvent.click(await screen.findByText(po.poNumber));
    // The rows carry their own row action; the panel's button is outside them.
    const inPanel = (await screen.findAllByRole('button', { name: /^Create ASN$/ })).filter(
      (b) => !b.closest('tr')
    );
    expect(inPanel).toHaveLength(1);
    fireEvent.click(inPanel[0]);
    expect(screen.getByTestId('location')).toHaveTextContent(
      `/supplier/shipments?tab=create&po=${po.id}&from=po`
    );
    expect(within(screen.getByTestId('toast-spy')).queryAllByRole('listitem')).toHaveLength(0);
  });

  it('the row action navigates the same way', async () => {
    renderOrders();
    const po = confirmedPo();
    const row = /** @type {HTMLTableRowElement} */ (
      (await screen.findByText(po.poNumber)).closest('tr')
    );
    fireEvent.click(within(row).getByRole('button', { name: /Create ASN/ }));
    expect(screen.getByTestId('location')).toHaveTextContent(
      `/supplier/shipments?tab=create&po=${po.id}&from=po`
    );
  });

  it('a seat without the ASN atoms reads View and the wait, not Create ASN', async () => {
    renderOrders(COMMERCIAL_ONLY);
    const po = confirmedPo();
    const row = /** @type {HTMLTableRowElement} */ (
      (await screen.findByText(po.poNumber)).closest('tr')
    );
    expect(within(row).queryByRole('button', { name: /Create ASN/ })).toBeNull();
    fireEvent.click(within(row).getByRole('button', { name: /View/ }));
    expect(await screen.findByTestId('handoff-asn-create')).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/supplier/orders?view=list');
  });

  it('the toast keys are gone from both locales', () => {
    for (const key of [
      'supplierOrders.toast.asnNotCreated.title',
      'supplierOrders.toast.asnContinue',
      'supplierOrders.toast.creatingAsn.title'
    ]) {
      expect(supplierOrdersEn).not.toHaveProperty([key]);
      expect(supplierOrdersId).not.toHaveProperty([key]);
    }
  });
});

describe('Shipments & ASN — `tab=create&po=` starts the wizard for that PO', () => {
  it('the PO is picked, and the way back names it', async () => {
    const po = confirmedPo();
    renderWithProviders(<SupplierShipments />, {
      identity: SUPPLIER,
      route: `/supplier/shipments?tab=create&po=${po.id}&from=po`
    });
    const card = await screen.findByRole('button', { name: new RegExp(po.poNumber) });
    expect(card).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('back-to-purchase-order')).toHaveAttribute(
      'href',
      `/supplier/orders?po=${po.id}`
    );
  });

  it('`callOff=` also chooses the confirmed call-off on that PO', async () => {
    const c = confirmedCallOff();
    renderWithProviders(<SupplierShipments />, {
      identity: SUPPLIER,
      route: `/supplier/shipments?tab=create&po=${c.poId}&callOff=${c.id}`
    });
    expect(await screen.findByLabelText(i18n.t('co.asn.callOff'))).toHaveValue(c.id);
  });

  it('the subtitle states the task, without system names, in both locales', async () => {
    renderWithProviders(<SupplierShipments />, { identity: SUPPLIER });
    expect(
      await screen.findByText(/^Tell PTI what you are shipping and when — /)
    ).toBeInTheDocument();
    for (const locale of [supplierShipmentsEn, supplierShipmentsId]) {
      expect(locale['supplierShipments.header.subtitle']).not.toMatch(/EDI|WMS|Advance Ship/);
    }
    expect(supplierShipmentsId['supplierShipments.header.subtitle']).toBe(
      'Beri tahu PTI apa yang Anda kirim dan kapan — {{name}}.'
    );
  });
});

describe('Call-offs — a confirmed call-off offers the one shipment step (UCX-P3)', () => {
  it('offers Mark as shipped, prefilled from the call-off, and not the old ASN link', async () => {
    const c = confirmedCallOff();
    renderWithProviders(<SupplierCallOffs />, { identity: SUPPLIER, route: '/supplier/call-offs' });
    fireEvent.click(
      within(await screen.findByTestId(`supplier-calloff-row-${c.id}`)).getByRole('button')
    );
    const mark = await screen.findByTestId('calloff-mark-shipped');
    expect(mark).toHaveTextContent('Mark as shipped');
    // The two controls the one step replaces are gone.
    expect(screen.queryByTestId('calloff-create-asn')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Send dispatch notice' })).toBeNull();
    // The values start from the call-off (UCX-F9): its agreed quantity, and its
    // need date when that day is not before the goods leave — an overdue
    // call-off defaults to the shipped day, which the dispatch policy accepts
    // (found in the browser pass, 2026-11-26).
    expect(screen.getByLabelText('Expected arrival')).toHaveValue(
      c.needDate < DECLARED_PRESENT ? DECLARED_PRESENT : c.needDate
    );
    const agreed = approvedDeliveries(c).reduce((s, d) => s + d.quantity, 0);
    expect(screen.getByLabelText(`Quantity (${c.uom})`)).toHaveValue(String(agreed));
  });

  it('a seat without the ASN atoms reads the wait instead', async () => {
    const c = confirmedCallOff();
    renderWithProviders(<SupplierCallOffs />, {
      identity: COMMERCIAL_ONLY,
      route: '/supplier/call-offs'
    });
    fireEvent.click(
      within(await screen.findByTestId(`supplier-calloff-row-${c.id}`)).getByRole('button')
    );
    expect(await screen.findByTestId('handoff-calloff-mark-shipped')).toBeInTheDocument();
    expect(screen.queryByTestId('calloff-mark-shipped')).toBeNull();
  });

  it('reads in Indonesian', async () => {
    const c = confirmedCallOff();
    try {
      await i18n.changeLanguage('id');
      renderWithProviders(<SupplierCallOffs />, {
        identity: SUPPLIER,
        route: '/supplier/call-offs'
      });
      fireEvent.click(
        within(await screen.findByTestId(`supplier-calloff-row-${c.id}`)).getByRole('button')
      );
      expect(await screen.findByTestId('calloff-mark-shipped')).toHaveTextContent(
        'Tandai sudah dikirim'
      );
    } finally {
      await i18n.changeLanguage('en');
    }
  });
});
