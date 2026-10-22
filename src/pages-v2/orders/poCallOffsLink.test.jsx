// ─────────────────────────────────────────────────────────────────────────────
// IA P-01 (integration) — a PO with released call-offs links to them under its
// steps; a PO with none shows no link. A call-off is a delivery under the PO,
// not a stage of it, so it is a link beside the steps rather than a step.
// ─────────────────────────────────────────────────────────────────────────────

import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { renderWithProviders, BUYER, SUPPLIER } from '@test/test-utils';
import i18n from '@lib/i18n';
import { purchaseOrderStore } from '@services/data/mock/stores/purchaseOrderStore';
import { callOffStore } from '@services/data/mock/stores/callOffStore';
import { PoLifecycleSteps } from './PoCollaboration';

beforeEach(async () => {
  purchaseOrderStore.reset();
  callOffStore.reset?.();
  await i18n.changeLanguage('en');
});

const released = () =>
  callOffStore.all().filter((c) => c.status !== 'Draft' && c.status !== 'Dismissed');

describe('the PO record links to its call-offs', () => {
  it('a PO with released call-offs links to Call-offs filtered to it, on both personas', async () => {
    const co = released()[0];
    if (!co) throw new Error('fixture premise: a released call-off');
    const po = purchaseOrderStore.all().find((p) => p.id === co.poId);
    if (!po) throw new Error(`fixture premise: the PO ${co.poId} of ${co.id}`);
    const n = released().filter((c) => c.poId === po.id).length;

    const { unmount } = renderWithProviders(
      <PoLifecycleSteps po={po} asnCount={0} persona="buyer" />,
      {
        identity: BUYER
      }
    );
    const link = await screen.findByTestId('po-calloffs-link');
    expect(link).toHaveTextContent(
      n === 1 ? '1 call-off against this order' : `${n} call-offs against this order`
    );
    expect(link.getAttribute('href')).toBe(`/buyer/call-offs?po=${po.id}&from=po`);
    unmount();

    renderWithProviders(<PoLifecycleSteps po={po} asnCount={0} persona="supplier" />, {
      identity: { ...SUPPLIER, supplierId: po.supplierId }
    });
    expect((await screen.findByTestId('po-calloffs-link')).getAttribute('href')).toBe(
      `/supplier/call-offs?po=${po.id}&from=po`
    );
  });

  it('a PO with no released call-off shows no link', async () => {
    const withCallOffs = new Set(released().map((c) => c.poId));
    const po = purchaseOrderStore.all().find((p) => !withCallOffs.has(p.id));
    if (!po) throw new Error('fixture premise: a PO without call-offs');
    renderWithProviders(<PoLifecycleSteps po={po} asnCount={0} persona="buyer" />, {
      identity: BUYER
    });
    expect(await screen.findByTestId('po-lifecycle-steps')).toBeInTheDocument();
    expect(screen.queryByTestId('po-calloffs-link')).toBeNull();
  });
});
