// ────────────────────────────────────────────────────────────────────────────
// RFx UX lane 2B — RFQ buyer polish. One describe per finding:
//   B-12 the wizard seeds the first break and the unit, and can save and send;
//   B-13 the board's "As of" line and an explained "—" under Est. value;
//   B-14 the qualification text once, a pill with a tooltip elsewhere;
//   B-15 the stage in words, the panel's Next from the same derivation as the
//        board and the event page, and a warning on a round opened early;
//   B-16 one verb per act ("Send to suppliers", "Close the round");
//   X-03 a legend above the award table and a tooltip on each pill.
// ────────────────────────────────────────────────────────────────────────────
import { Routes, Route } from 'react-router-dom';
import { screen, fireEvent, within, waitFor } from '@testing-library/react';
import { renderWithProviders, BUYER } from '@test/test-utils';
/** @import { CurrentIdentity } from '@context/CurrentIdentityContext' */
import Toaster from '@components/ui-v2/Toaster';
import { rfqStore } from '@services/data/mock/stores/rfqStore';
import { quotationStore } from '@services/data/mock/stores/quotationStore';
import { resetRfxStores } from '@services/data/mock/stores/rfxStores';
import { sdcClock } from '@services/sdc';
import { formatDate } from '@lib/format';
import i18n from '@lib/i18n';
import { sourcingEn, sourcingId } from '@lib/i18n/sourcing';
import { rfxEn, rfxId } from '@lib/i18n/rfx';
import { EligibilityMarker } from '../rfx/eligibilityDisplay';
import BuyerSourcingEvent from '../BuyerSourcingEvent';
import { rfqStageLine, roundBeforeWindowCloses } from '../BuyerSourcingEvent/utils';
import BuyerSourcingPage from './index';
import WizardReviewStep from './components/WizardReviewStep';
import { emptyDraft, seedFirstBreak, uomForCategory, withCategory } from './utils';
import { TODAY } from './const';

/** @type {React.FC} */
const BuyerSourcing = () => (
  <>
    <BuyerSourcingPage />
    <Toaster />
  </>
);

/** @type {CurrentIdentity} */
const PROCUREMENT = { ...BUYER, businessRoles: ['procurement'] };
/** @type {CurrentIdentity} */
const RECEIVING = { ...BUYER, businessRoles: ['receiving'] };

beforeEach(() => {
  resetRfxStores();
  rfqStore.reset();
  quotationStore.reset();
  sdcClock.reset();
});

/** @param {string} route */
const renderEvent = (route) =>
  renderWithProviders(
    <Routes>
      <Route path="/buyer/rfq/:rfqId" element={<BuyerSourcingEvent />} />
    </Routes>,
    { identity: PROCUREMENT, route }
  );

const next = () => fireEvent.click(screen.getByRole('button', { name: 'Next' }));

describe('B-12 — the wizard fills what Scope already said', () => {
  it('a Packaging RFQ is counted in PCS; any other category in KG', () => {
    expect(uomForCategory('Packaging')).toBe('PCS');
    expect(uomForCategory('Fragrance')).toBe('KG');
    expect(withCategory(emptyDraft(), 'Packaging').uom).toBe('PCS');
  });

  it('KNOWN-BAD twin — a unit the buyer chose is not overwritten by a category', () => {
    const chosen = { ...emptyDraft(), uom: /** @type {const} */ ('L') };
    expect(withCategory(chosen, 'Packaging').uom).toBe('L');
  });

  it('the first break is seeded from a readable Scope quantity, as a total', () => {
    expect(seedFirstBreak(emptyDraft(), { ok: true, value: 48_000 }).tiers).toEqual([
      { qty: 48_000, basis: 'total' }
    ]);
  });

  it('KNOWN-BAD twins — an unreadable quantity or a break already set seeds nothing', () => {
    expect(seedFirstBreak(emptyDraft(), { ok: false }).tiers).toEqual([]);
    const set = {
      ...emptyDraft(),
      tiers: [{ qty: 3_000, basis: /** @type {const} */ ('perVariant') }]
    };
    expect(seedFirstBreak(set, { ok: true, value: 48_000 }).tiers).toEqual(set.tiers);
  });

  /** @param {'held' | 'withheld'} kind */
  const renderReview = (kind) =>
    renderWithProviders(
      <WizardReviewStep
        draft={emptyDraft()}
        rfqNumbers={/** @type {any} */ ({ ok: false })}
        sourcePrefill={null}
        authoringRows={{ basics: [], items: [], options: [] }}
        docItems={[]}
        supplierNameById={new Map()}
        editingRfqId={null}
        publishAvailability={
          /** @type {any} */ (
            kind === 'held' ? { kind: 'held' } : { kind: 'withheld', owners: ['procurement'] }
          )
        }
        sendPending={false}
        isStepValid={() => true}
        saveAndSend={() => {}}
        setWizardStep={() => {}}
        setTemplateToSave={() => {}}
        t={i18n.t}
      />
    );

  it('a NEW RFQ offers "Save and send to suppliers" on Review', () => {
    renderReview('held');
    expect(screen.getByTestId('rfq-new-send')).toHaveTextContent('Save and send to suppliers');
  });

  it('a seat without rfq:publish reads the handoff notice in that slot', () => {
    renderReview('withheld');
    expect(screen.queryByTestId('rfq-new-send')).not.toBeInTheDocument();
    expect(screen.getByTestId('handoff-rfq-new-send')).toBeInTheDocument();
  });

  it('Save and send stores the RFQ Open, through create then the same publish verb', async () => {
    renderWithProviders(<BuyerSourcing />, { identity: PROCUREMENT });
    fireEvent.click(await screen.findByText('New RFQ'));
    fireEvent.change(await screen.findByPlaceholderText(/e\.g\. Q3 2026 Fragrance Sourcing/i), {
      target: { value: 'Send in one act' }
    });
    const category = /** @type {HTMLElement} */ (
      screen
        .getAllByRole('combobox')
        .find((el) => within(el).queryByRole('option', { name: 'Packaging' }) !== null)
    );
    fireEvent.change(category, { target: { value: 'Packaging' } });
    expect(screen.getByTestId('rfq-wizard-uom')).toHaveValue('PCS');
    fireEvent.change(screen.getByLabelText('Total quantity'), { target: { value: '12000' } });
    next();
    fireEvent.change(await screen.findByTestId('rfq-item-1-description'), {
      target: { value: 'Shipper box' }
    });
    next();
    expect(await screen.findByTestId('rfq-tiers-chip')).toHaveTextContent('12,000total');
    next();
    next();
    fireEvent.click(within(await screen.findByTestId('invitee-row-sup-008')).getByRole('checkbox'));
    next();
    const [response, award] = /** @type {NodeListOf<HTMLInputElement>} */ (
      document.querySelectorAll('input[type="date"]')
    );
    fireEvent.change(/** @type {HTMLInputElement} */ (response), {
      target: { value: '2026-10-10' }
    });
    fireEvent.change(/** @type {HTMLInputElement} */ (award), { target: { value: '2026-10-20' } });
    next();
    next();
    fireEvent.click(await screen.findByTestId('rfq-new-send'));
    await waitFor(() =>
      expect(rfqStore.all().find((r) => r.title === 'Send in one act')?.status).toBe('Open')
    );
    const rfq = rfqStore.all().find((r) => r.title === 'Send in one act');
    expect(rfq?.uom).toBe('PCS');
    expect(rfq?.tiers).toEqual([{ qty: 12_000, basis: 'total' }]);
    expect(await screen.findByText(`${rfq?.rfqNumber} sent to suppliers`)).toBeInTheDocument();
  }, 60000);
});

describe('B-13 — the board says what date it counts from, and why a value is missing', () => {
  it('the meta line reads "As of <hub date>", not "last updated"', async () => {
    renderWithProviders(<BuyerSourcing />);
    const asOf = await screen.findByTestId('rfq-board-as-of');
    expect(asOf).toHaveTextContent(`As of ${formatDate(TODAY)}`);
    expect(document.body).not.toHaveTextContent(/last updated/i);
  });

  it('a tiered RFQ with no budget keeps "—" and says why on hover', async () => {
    renderWithProviders(<BuyerSourcing />);
    const none = await screen.findByTestId('rfq-est-value-none-rfq-021');
    expect(none).toHaveTextContent('—');
    expect(none).toHaveAttribute('title', sourcingEn['sourcing.table.estValue.tieredNoBudget']);
  });

  it('KNOWN-GOOD twin — an RFQ with a stated budget shows the value, no explanation', async () => {
    renderWithProviders(<BuyerSourcing />);
    fireEvent.click(await screen.findByRole('tab', { name: /^Awarded/ }));
    await screen.findAllByText(/^RFQ-2026-0/);
    expect(screen.queryByTestId('rfq-est-value-none-rfq-001')).not.toBeInTheDocument();
  });
});

describe('B-14 — the qualification text once, the pill elsewhere', () => {
  const warn = /** @type {any} */ ({
    state: 'warn',
    level: 'registered',
    requiredLevel: 'preferred',
    sourcingType: 'direct',
    missing: [{ label: 'Halal certificate' }]
  });

  it('the invitee list writes the explanation out', () => {
    renderWithProviders(<EligibilityMarker eligibility={warn} testId="m" />);
    expect(screen.getByTestId('m')).toHaveTextContent(/Missing: Halal certificate/);
    expect(screen.getByTestId('m')).not.toHaveAttribute('title');
  });

  it('compact (the award panel) shows the pill only, the explanation as its tooltip', () => {
    renderWithProviders(<EligibilityMarker eligibility={warn} testId="m" compact />);
    const marker = screen.getByTestId('m');
    expect(marker).toHaveTextContent('Not qualified (placeholder rules)');
    expect(marker).not.toHaveTextContent(/Missing/);
    expect(marker.getAttribute('title')).toMatch(/Missing: Halal certificate/);
  });

  it('on rfq-021 every award-row marker is compact', async () => {
    renderEvent('/buyer/rfq/rfq-021');
    await screen.findByTestId('event-stage');
    const award = /** @type {HTMLElement} */ (document.getElementById('event-award'));
    const markers = within(award).queryAllByTestId(/^award-elig-/);
    // Population control: the placeholder rules flag rfq-021's bidders, so the loop is not empty.
    expect(markers.length).toBeGreaterThan(0);
    for (const m of markers) {
      expect(m).toHaveAttribute('data-compact', 'true');
      expect(m).not.toHaveTextContent(/Missing/);
    }
  });
});

describe('B-15 — the stage said in words, and one "Next" everywhere', () => {
  const rounds = [{ closed: false, roundNumber: 1 }];
  const base = { status: /** @type {const} */ ('Open'), invited: 4, quoted: 2, inForce: [] };

  it('"Collecting quotes · round 1 open" from rfqStageOf', () => {
    expect(rfqStageLine({ ...base, rounds })).toEqual({ phase: 'collecting', openRound: 1 });
    expect(rfqStageLine({ ...base, status: 'Closed', rounds: [] })).toEqual({
      phase: 'windowClosed',
      openRound: null
    });
    expect(rfqStageLine({ ...base, status: 'Draft', rounds: [] }).phase).toBe('draft');
  });

  it('the event header states the stage (rfq-014: Closed, round 1 open)', async () => {
    renderEvent('/buyer/rfq/rfq-014');
    expect(await screen.findByTestId('event-stage-line')).toHaveTextContent(
      'Stage: Response window closed · round 1 open'
    );
  });

  it('a round opened inside the response window is warned about (rfq-021), not refused', async () => {
    renderEvent('/buyer/rfq/rfq-021');
    expect(await screen.findByTestId('round-window-open-warn')).toHaveTextContent(
      /response window is open until/
    );
    expect(screen.getByTestId('event-stage-line')).toHaveTextContent('Stage: Collecting quotes');
  });

  it('KNOWN-GOOD twin — no warning once the window has closed or everyone quoted', () => {
    const at = { responseDeadline: '2026-09-09', invited: 4, quoted: 2 };
    expect(roundBeforeWindowCloses({ ...at, status: 'Open', nowIso: '2026-08-31T12:00Z' })).toBe(
      true
    );
    expect(roundBeforeWindowCloses({ ...at, status: 'Open', nowIso: '2026-09-10T12:00Z' })).toBe(
      false
    );
    expect(roundBeforeWindowCloses({ ...at, status: 'Closed', nowIso: '2026-08-31T12:00Z' })).toBe(
      false
    );
    expect(
      roundBeforeWindowCloses({ ...at, quoted: 4, status: 'Open', nowIso: '2026-08-31T12:00Z' })
    ).toBe(false);
  });

  it('rfq-021: the side panel, the board Next column and the event page say the same', async () => {
    const { unmount } = renderWithProviders(<BuyerSourcing />, { identity: PROCUREMENT });
    const boardNext = (await screen.findByTestId('rfq-next-rfq-021')).textContent;
    fireEvent.click(screen.getByText('RFQ-2026-021'));
    const panelNext = await screen.findByTestId('next-act-buyer-rfq');
    expect(panelNext).toHaveTextContent(`Next: ${boardNext}`);
    expect(panelNext).not.toHaveTextContent(/Your move/);
    unmount();
    renderEvent('/buyer/rfq/rfq-021');
    expect(await screen.findByTestId('event-next')).toHaveTextContent(`Next: ${boardNext}`);
    expect(boardNext).toBe('Review quotes');
  });
});

describe('B-16 — one verb per act, in both languages', () => {
  it('the RFQ is sent as the RFI and RFP are', () => {
    expect([sourcingEn['sourcing.publish.submit'], sourcingId['sourcing.publish.submit']]).toEqual([
      rfxEn['rfx.rfi.publish'],
      rfxId['rfx.rfi.publish']
    ]);
    expect(sourcingEn['sourcing.publish.submit']).toBe('Send to suppliers');
    expect(sourcingEn['sourcing.toast.published.title']).toBe('{{rfqNumber}} sent to suppliers');
    expect(Object.values(sourcingEn).join(' ')).not.toMatch(/\bpublish/i);
  });

  it('"Close the round" for both the RFQ round and the RFP firm-offer round', () => {
    expect(rfxEn['rfx.firm.closeRound']).toBe(rfxEn['rfx.neg.closeRound']);
    expect(rfxId['rfx.firm.closeRound']).toBe(rfxId['rfx.neg.closeRound']);
    expect(rfxEn['rfx.neg.closeRound']).toBe('Close the round');
  });

  it('a Draft RFQ panel offers "Send to suppliers"; a receiving seat reads the owner', async () => {
    renderWithProviders(<BuyerSourcing />, { identity: RECEIVING });
    fireEvent.click(await screen.findByRole('tab', { name: /^Draft/ }));
    const row = (await screen.findAllByTestId(/^rfq-next-/))[0];
    fireEvent.click(/** @type {HTMLElement} */ (row));
    expect(await screen.findByTestId('handoff-rfq-publish')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Send to suppliers' })).not.toBeInTheDocument();
  });
});

describe('X-03 — the award pills are explained where the award is made', () => {
  it('a one-line legend sits above the award table (rfq-021)', async () => {
    renderEvent('/buyer/rfq/rfq-021');
    const legend = await screen.findByTestId('award-legend');
    for (const pill of ['Updates N%', 'No history', 'Best scored', 'Tied for best']) {
      expect(legend).toHaveTextContent(pill);
    }
  });

  it('each pill carries its meaning as a tooltip, in both languages', () => {
    for (const key of ['rfx.cmp.best.tip', 'rfx.cmp.tied.tip', 'rfx.award.legend']) {
      expect(rfxEn[key]).toBeTruthy();
      expect(rfxId[key]).toBeTruthy();
    }
  });
});
