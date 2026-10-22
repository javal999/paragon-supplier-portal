// BL-219 — "Extend the deadline" on the RFI and RFP pages is offered only in
// the from-states of the extend verb (`t_rfi_extend` / `t_rfp_extend`), read
// from the flow rather than listed by hand.
import { Routes, Route } from 'react-router-dom';
import { screen } from '@testing-library/react';
import { renderWithProviders, BUYER } from '@test/test-utils';
/** @import { CurrentIdentity } from '@context/CurrentIdentityContext' */
import { rfiEventFlow } from '@services/transitions/flows/rfiEvent.flow';
import { rfpEventFlow } from '@services/transitions/flows/rfpEvent.flow';
import { resetRfxStores, rfiEventStore, rfpEventStore } from '@services/data/mock/stores/rfxStores';
import { sdcClock } from '@services/sdc';
import BuyerRfiEvent from '../BuyerRfiEvent';
import BuyerRfpEvent from '../BuyerRfp/BuyerRfpEvent';
import { extendOffered } from './rfxExtend';
import { selectEventTab } from '@test/buyerRfxRoutes';

/** @type {CurrentIdentity} */
const PROCUREMENT = { ...BUYER, businessRoles: ['procurement'] };

beforeEach(() => {
  resetRfxStores();
  sdcClock.reset();
});
afterEach(() => resetRfxStores());

describe('extendOffered — the extend verb’s from-states, per status of the flow', () => {
  it.each([
    ['t_rfi_extend', rfiEventFlow],
    ['t_rfp_extend', rfpEventFlow]
  ])('%s: offered exactly where the flow accepts it', (id, flow) => {
    const from = flow.transitions.find((tr) => tr.id === id)?.from ?? [];
    // POPULATION — the verb accepts some states and refuses others.
    expect(from).toEqual(['Open', 'Closed']);
    for (const state of flow.states) {
      expect(extendOffered(/** @type {'t_rfi_extend'} */ (id), state)).toBe(from.includes(state));
    }
  });
});

/** @param {string} id */
const renderRfi = (id) =>
  renderWithProviders(
    <Routes>
      <Route path="/buyer/rfi/:rfiId" element={<BuyerRfiEvent />} />
    </Routes>,
    { identity: PROCUREMENT, route: `/buyer/rfi/${id}` }
  );
/** @param {string} id */
const renderRfp = (id) =>
  renderWithProviders(
    <Routes>
      <Route path="/buyer/rfp/:rfpId" element={<BuyerRfpEvent />} />
    </Routes>,
    { identity: PROCUREMENT, route: `/buyer/rfp/${id}` }
  );

describe('BL-219 — the RFI page', () => {
  it('KNOWN-GOOD — an Open RFI offers the extension', async () => {
    renderRfi('rfi-002');
    expect(await screen.findByTestId('rfi-extend-rfi-002')).toBeInTheDocument();
    // RFx UX 2G — the "extend for" column is in the invitee table, on Overview.
    await selectEventTab('Overview');
    expect(screen.getAllByText('For the selected suppliers').length).toBeGreaterThan(0);
  });

  it('KNOWN-BAD — a Draft RFI (rfi-003) offers no extension and no "extend for" column', async () => {
    expect(rfiEventStore.get('rfi-003')?.status).toBe('Draft');
    renderRfi('rfi-003');
    await screen.findByTestId('rfi-actions-rfi-003');
    expect(screen.queryByTestId('rfi-extend-rfi-003')).not.toBeInTheDocument();
    expect(screen.queryByText('For the selected suppliers')).not.toBeInTheDocument();
  });

  it('KNOWN-BAD — a Cancelled RFI offers no extension', async () => {
    rfiEventStore.update('rfi-002', (e) => ({ ...e, status: /** @type {const} */ ('Cancelled') }));
    renderRfi('rfi-002');
    await screen.findByTestId('rfi-actions-rfi-002');
    expect(screen.queryByTestId('rfi-extend-rfi-002')).not.toBeInTheDocument();
  });
});

describe('BL-219 — the RFP page', () => {
  it('KNOWN-GOOD — an Open RFP offers the extension', async () => {
    renderRfp('rfp-002');
    expect(await screen.findByTestId('rfp-extend-btn-rfp-002')).toBeInTheDocument();
  });

  it('KNOWN-GOOD — a Closed RFP offers it too (extend reopens it)', async () => {
    rfpEventStore.update('rfp-002', (e) => ({ ...e, status: /** @type {const} */ ('Closed') }));
    renderRfp('rfp-002');
    expect(await screen.findByTestId('rfp-extend-btn-rfp-002')).toBeInTheDocument();
  });

  it('KNOWN-BAD — a Draft RFP (rfp-004) offers no extension', async () => {
    expect(rfpEventStore.get('rfp-004')?.status).toBe('Draft');
    renderRfp('rfp-004');
    await screen.findByTestId('rfp-actions-rfp-004');
    expect(screen.queryByTestId('rfp-extend-btn-rfp-004')).not.toBeInTheDocument();
  });

  it('KNOWN-BAD — a Partly awarded RFP offers no extension', async () => {
    rfpEventStore.update('rfp-002', (e) => ({
      ...e,
      status: /** @type {const} */ ('Partly awarded')
    }));
    renderRfp('rfp-002');
    await screen.findByTestId('rfp-actions-rfp-002');
    expect(screen.queryByTestId('rfp-extend-btn-rfp-002')).not.toBeInTheDocument();
  });
});
