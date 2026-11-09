import { afterEach, describe, expect, it } from 'vitest';
import { fireEvent, screen, within } from '@testing-library/react';
import { renderWithProviders, BUYER, SUPPLIER } from '@test/test-utils';
import BuyerPlanTrace from './BuyerPlanTrace';
import { callOffStore } from '@services/data/mock/stores/callOffStore';
import i18n from '@lib/i18n';

// PEX-11 (BL-276) — the trace page on the seeded data. sup-007 × PK-PETB-8801 has five POs open
// at once with 13 call-offs: the "two POs open in the same period" flag. A call-off with no PO and
// a rejected call-off are added to show their flag and event.

afterEach(() => {
  callOffStore.reset();
  void i18n.changeLanguage('en');
});

const render = (route = '/buyer/plan-trace?supplier=sup-007&material=PK-PETB-8801') =>
  renderWithProviders(<BuyerPlanTrace />, { identity: BUYER, route });

describe('PEX-11 plan vs execution trace page', () => {
  it('shows the POs of the pair with their call-offs and the overlapping-PO flag', async () => {
    render();
    const summary = await screen.findByTestId('trace-flag-list');
    expect(within(summary).getAllByRole('listitem').length).toBeGreaterThan(0);
    expect(summary).toHaveTextContent('are both open in the same period');
    const cards = screen.getAllByTestId(/^trace-po-PO-/).filter((e) => e.tagName === 'SECTION');
    expect(cards).toHaveLength(5);
    expect(screen.getAllByTestId(/^trace-calloff-CO-/)).toHaveLength(13);
    expect(screen.getByTestId('trace-hold')).toHaveTextContent('SAP identifiers');
  });

  it('a call-off that names no PO of the pair is listed apart and flagged', async () => {
    callOffStore.add(
      /** @type {any} */ ({
        ...callOffStore
          .all()
          .find((c) => c.supplierId === 'sup-007' && c.materialCode === 'PK-PETB-8801'),
        id: 'co-pex11',
        callOffNumber: 'CO-PEX11',
        poId: 'po-ghost',
        poNumber: 'PO-GHOST',
        status: 'Confirmed'
      })
    );
    render();
    const apart = await screen.findByTestId('trace-no-po-calloffs');
    expect(within(apart).getByTestId('trace-calloff-CO-PEX11')).toBeInTheDocument();
    expect(screen.getByTestId('trace-flag-list')).toHaveTextContent(
      'Call-off CO-PEX11 names no PO of this supplier and material.'
    );
  });

  it('a rejected call-off shows as an event on its need-date week', async () => {
    callOffStore.add(
      /** @type {any} */ ({
        ...callOffStore
          .all()
          .find((c) => c.supplierId === 'sup-007' && c.materialCode === 'PK-PETB-8801'),
        id: 'co-pex11r',
        callOffNumber: 'CO-PEX11R',
        status: 'Rejected',
        needDate: '2026-12-02',
        rejectionReason: 'No capacity'
      })
    );
    render();
    const cell = await screen.findByTestId('trace-event-2026-11-30-callOffRejected');
    expect(cell).toHaveTextContent('Supplier rejected call-off CO-PEX11R. No capacity');
  });

  it('choosing another pair changes the trace', async () => {
    render();
    await screen.findByTestId('trace-pair');
    fireEvent.change(screen.getByTestId('trace-pair'), {
      target: { value: 'sup-002|RM-EMUL-9410' }
    });
    expect(await screen.findByTestId('trace-no-flags')).toBeInTheDocument();
    expect(screen.getAllByTestId(/^trace-calloff-CO-/)).toHaveLength(2);
  });

  it('a supplier seat reads that the trace is PTI’s own view', async () => {
    renderWithProviders(<BuyerPlanTrace />, { identity: SUPPLIER, route: '/buyer/plan-trace' });
    expect(await screen.findByTestId('trace-supplier')).toBeInTheDocument();
  });

  it('reads in Indonesian', async () => {
    await i18n.changeLanguage('id');
    render();
    expect(await screen.findByTestId('trace-flag-list')).toHaveTextContent('sama-sama terbuka');
  });
});
