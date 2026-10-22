// ─────────────────────────────────────────────────────────────────────────────
// P-12 (IA-B06) and IA-B13 on Make warehouse room: the tabs live in the
// address, Relief opens first, and a sent call-off change links to that
// call-off on Call-offs. The send is off while the engine dataset is
// simulated (X-03), so the link half flips `engineDataset` live the way
// `callOffs/callOffEngineOrigin.page.test.jsx` does.
// ─────────────────────────────────────────────────────────────────────────────

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';

const flip = vi.hoisted(() => ({ engineDataset: /** @type {boolean | null} */ (null) }));
vi.mock('@services/liveness/registry', async (importOriginal) => {
  const actual =
    await /** @type {typeof importOriginal<typeof import('@services/liveness/registry')>} */ (
      importOriginal
    )();
  return {
    ...actual,
    /** @param {Parameters<typeof actual.isLive>[0]} c */
    isLive: (c) =>
      c === 'engineDataset' && flip.engineDataset !== null ? flip.engineDataset : actual.isLive(c)
  };
});

import { renderWithProviders, BUYER } from '@test/test-utils';
import BuyerReschedule from './BuyerReschedule';
import { mockDataService } from '@services/data/mock/mockDataService';
import { callOffStore } from '@services/data/mock/stores/callOffStore';
import { PERSONA_SYSTEM_ROLES, SEEDED_SEAT_ROLES } from '@services/transitions/businessRoles';
import i18n from '@lib/i18n';

const PLANNER = { ...BUYER, businessRoles: SEEDED_SEAT_ROLES.buyer };

beforeEach(() => {
  callOffStore.reset();
  flip.engineDataset = null;
});
afterEach(() => {
  flip.engineDataset = null;
  void i18n.changeLanguage('en');
});

const report = async () =>
  /** @type {import('@services/data/types').RescheduleView} */ (
    await mockDataService.procurement.getReschedule({
      personaType: 'buyer',
      supplierId: null,
      businessRoles: PERSONA_SYSTEM_ROLES.buyer
    })
  );

describe('Make warehouse room — tabs (P-12)', () => {
  it('opens on Relief by default', async () => {
    renderWithProviders(<BuyerReschedule />, { identity: PLANNER, route: '/buyer/reschedule' });
    expect(await screen.findByTestId('rs-relief')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Relief' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByTestId('rs-tabpanel-relief')).toHaveAttribute('role', 'tabpanel');
  });

  it('?tab=values opens Values and method, and ?tab=fill opens Warehouse fill', async () => {
    const values = renderWithProviders(<BuyerReschedule />, {
      identity: PLANNER,
      route: '/buyer/reschedule?tab=values'
    });
    expect(await screen.findByTestId('rs-settings')).toBeInTheDocument();
    expect(screen.queryByTestId('rs-relief')).toBeNull();
    values.unmount();

    renderWithProviders(<BuyerReschedule />, {
      identity: PLANNER,
      route: '/buyer/reschedule?tab=fill'
    });
    expect(await screen.findByTestId('rs-fill')).toBeInTheDocument();
    expect(screen.queryByTestId('rs-relief')).toBeNull();
  });

  it('the tab labels are Indonesian in Indonesian', async () => {
    await i18n.changeLanguage('id');
    renderWithProviders(<BuyerReschedule />, { identity: PLANNER, route: '/buyer/reschedule' });
    await screen.findByTestId('rs-relief');
    expect(screen.getAllByRole('tab').map((tab) => tab.textContent)).toEqual([
      'Keringanan',
      'Isi gudang',
      'Nilai dan metode'
    ]);
  });
});

describe('Make warehouse room — a sent call-off change links to the call-off (IA-B13)', () => {
  it('after "Send change", the Relief tab says the change was sent and links to that call-off on Call-offs — EN and ID', async () => {
    flip.engineDataset = true;
    const r = await report();
    const co = /** @type {import('@services/data/types').RescheduleProposalView} */ (
      r.warehouses
        .flatMap((w) => w.proposals)
        .find(
          (p) =>
            p.rank !== null && p.line.kind === 'callOff' && p.type !== 'cancel' && p.line.callOffId
        )
    );
    expect(co).toBeDefined();
    const id = /** @type {string} */ (co.line.callOffId);
    const href = `/buyer/call-offs?highlight=${encodeURIComponent(id)}`;
    renderWithProviders(<BuyerReschedule />, { identity: PLANNER, route: '/buyer/reschedule' });
    expect(screen.queryByTestId('rs-sent')).toBeNull();
    fireEvent.click(await screen.findByTestId(`rs-send-${co.id}`));
    // The pending change takes the proposal off the list; the sent line stays.
    await waitFor(() => expect(screen.queryByTestId(`rs-relief-${co.id}`)).toBeNull());
    expect(await screen.findByTestId(`rs-sent-${id}`)).toHaveTextContent(
      `Change sent for ${co.line.reference}, awaiting the supplier’s confirmation.`
    );
    const link = screen.getByTestId(`rs-sent-open-${id}`);
    expect(link).toHaveTextContent('Open the call-off');
    expect(link).toHaveAttribute('href', href);
    // And the call-off's line under "Open orders for information" links to it too.
    fireEvent.click(screen.getByRole('tab', { name: 'Values and method' }));
    await waitFor(() =>
      expect(
        screen
          .getAllByRole('link', { name: 'Open the call-off' })
          .map((a) => a.getAttribute('href'))
      ).toContain(href)
    );
    fireEvent.click(screen.getByRole('tab', { name: 'Relief' }));
    await i18n.changeLanguage('id');
    await waitFor(() =>
      expect(screen.getByTestId(`rs-sent-open-${id}`)).toHaveTextContent('Buka call-off')
    );
    expect(screen.getByTestId(`rs-sent-${id}`)).toHaveTextContent(
      `Perubahan terkirim untuk ${co.line.reference}, menunggu konfirmasi pemasok.`
    );
  });
});
