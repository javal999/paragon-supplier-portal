// X-03 (owner decision 2026-09-23) on the PTI Call-offs page: a draft the Order
// plan made from an engine recommendation is MARKED, and its release control
// says why it is withheld instead of acting, while the engine dataset is
// simulated. Editing and dismissing stay available. The draft is made through
// the real draft verb, and every act ends in the store.
//
// The live half wraps the registry's `isLive` exactly as
// `callOffEngineOrigin.test.js` does (the real registry cannot turn
// `engineDataset` green — asserted there): real answer by default, flipped only
// where a test says so.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';

const flip = vi.hoisted(() => ({ engineDataset: null as boolean | null }));
vi.mock('@services/liveness/registry', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@services/liveness/registry')>();
  return {
    ...actual,
    isLive: (c: Parameters<typeof actual.isLive>[0]) =>
      c === 'engineDataset' && flip.engineDataset !== null ? flip.engineDataset : actual.isLive(c),
  };
});

import { renderWithProviders, BUYER } from '@test/test-utils';
import BuyerCallOffs from '../BuyerCallOffs';
import { MockCommandService } from '@services/data/mock/MockCommandService';
import { callOffStore } from '@services/data/mock/stores/callOffStore';
import { purchaseOrderStore } from '@services/data/mock/stores/purchaseOrderStore';
import { PERSONA_SYSTEM_ROLES, SEEDED_SEAT_ROLES } from '@services/transitions/businessRoles';
import { NO_PERSON } from '@context/noPerson';
import i18n from '@lib/i18n';

const PLANNER = { ...BUYER, businessRoles: SEEDED_SEAT_ROLES.buyer };
const panel = () => within(document.querySelector('aside[role="dialog"]') as HTMLElement);

const makeDraft = async (origin?: 'engine'): Promise<string> => {
  const res = await new MockCommandService().dispatch(
    { personaType: 'buyer', supplierId: null, businessRoles: PERSONA_SYSTEM_ROLES.buyer, actor: NO_PERSON },
    {
      transitionId: 't_calloff_draft',
      entity: 'callOff',
      payload: {
        poId: 'po-007',
        poLineId: 'li-007a',
        quantity: 1000,
        needDate: '2026-09-25',
        type: 'forecast',
        ...(origin ? { origin } : {}),
      },
    },
  );
  expect(res.status).toBe('done');
  return res.entityId!;
};

const openDraft = async (id: string) => {
  fireEvent.click(within(await screen.findByTestId(`calloff-row-${id}`)).getByRole('button', { name: /Open draft/ }));
};

beforeEach(() => {
  callOffStore.reset();
  purchaseOrderStore.reset();
  flip.engineDataset = null;
});
afterEach(() => {
  flip.engineDataset = null;
  void i18n.changeLanguage('en');
});

describe('X-03 on the Call-offs page — while the engine dataset is simulated', () => {
  it('the engine draft is marked on its row and in the panel; release shows the reason, not a button', async () => {
    const id = await makeDraft('engine');
    renderWithProviders(<BuyerCallOffs />, { identity: PLANNER });
    expect(await screen.findByTestId(`calloff-origin-engine-${id}`)).toHaveTextContent(
      'From the order plan — simulated data',
    );
    await openDraft(id);
    expect(panel().getByTestId('calloff-panel-origin-engine')).toHaveTextContent('From the order plan — simulated data');
    expect(panel().getByTestId('calloff-draft-release-withheld')).toHaveTextContent(
      'this draft comes from an order-plan recommendation calculated on simulated data',
    );
    expect(panel().getByTestId('calloff-draft-release-withheld')).toHaveTextContent(
      'Master Data Management team’s SAP feed is live',
    );
    expect(panel().queryByRole('button', { name: 'Release to supplier' })).toBeNull();
    // Edit and dismiss are still offered.
    expect(panel().getByRole('button', { name: 'Save changes' })).toBeInTheDocument();
    expect(panel().getByRole('button', { name: 'Dismiss draft' })).toBeInTheDocument();
  });

  it('dismissing the engine draft still works, and the store agrees', async () => {
    const id = await makeDraft('engine');
    renderWithProviders(<BuyerCallOffs />, { identity: PLANNER });
    await openDraft(id);
    fireEvent.change(panel().getByLabelText('Reason'), { target: { value: 'Plan changed' } });
    fireEvent.click(panel().getByRole('button', { name: 'Dismiss draft' }));
    await waitFor(() => expect(callOffStore.get(id)!.status).toBe('Dismissed'));
  });

  it('known-good: an ordinary draft carries no marker and its release still acts', async () => {
    const id = await makeDraft();
    renderWithProviders(<BuyerCallOffs />, { identity: PLANNER });
    await openDraft(id);
    expect(screen.queryByTestId(`calloff-origin-engine-${id}`)).toBeNull();
    expect(panel().queryByTestId('calloff-draft-release-withheld')).toBeNull();
    fireEvent.click(panel().getByRole('button', { name: 'Release to supplier' }));
    await waitFor(() => expect(callOffStore.get(id)!.status).toBe('Awaiting Confirmation'));
  });

  it('in Indonesian, the marker and the withheld release are Indonesian', async () => {
    const id = await makeDraft('engine');
    await i18n.changeLanguage('id');
    renderWithProviders(<BuyerCallOffs />, { identity: PLANNER });
    expect(await screen.findByTestId(`calloff-origin-engine-${id}`)).toHaveTextContent('Dari rencana pesanan — data simulasi');
    fireEvent.click(within(screen.getByTestId(`calloff-row-${id}`)).getByRole('button'));
    expect(panel().getByTestId('calloff-draft-release-withheld')).toHaveTextContent('data simulasi');
    expect(panel().getByTestId('calloff-draft-release-withheld')).toHaveTextContent('Master Data Management');
  });
});

describe('X-03 on the Call-offs page — once the engine dataset is live', () => {
  it('no marker, the release button returns, and releasing reaches the store', async () => {
    const id = await makeDraft('engine');
    flip.engineDataset = true;
    renderWithProviders(<BuyerCallOffs />, { identity: PLANNER });
    await openDraft(id);
    expect(screen.queryByTestId(`calloff-origin-engine-${id}`)).toBeNull();
    expect(panel().queryByTestId('calloff-draft-release-withheld')).toBeNull();
    fireEvent.click(panel().getByRole('button', { name: 'Release to supplier' }));
    await waitFor(() => expect(callOffStore.get(id)!.status).toBe('Awaiting Confirmation'));
  });
});
