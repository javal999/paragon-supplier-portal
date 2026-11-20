import { describe, it, expect, beforeEach } from 'vitest';
import { screen, waitFor, within, fireEvent } from '@testing-library/react';
import { renderWithProviders, SUPPLIER } from '@test/test-utils';
import SupplierForecasts from './SupplierForecasts';
import { requirementResponseStore } from '@services/data/mock/stores/requirementResponseStore';
import { incomingShipmentStore } from '@services/data/mock/stores/incomingShipmentStore';
import {
  supplierVisiblePublications,
  FORECAST_PUBLICATIONS,
  consolidationRows
} from '@services/sdc';
import { isLive } from '@services/liveness';
import i18n from '@lib/i18n';
import { hubEn, hubId } from '@lib/i18n/hub';
/** @import { CurrentIdentity } from '@context/CurrentIdentityContext' */
import { PERSONA_SYSTEM_ROLES } from '@services/transitions/businessRoles';
import { NO_PERSON } from '@context/noPerson';

// ────────────────────────────────────────────────────────────────────────────
// SupplierForecasts (SDC-2b) — the P1 supplier surface, honest-render +
// own-facts + governed-submit contract.
//
// The seeded persona is sup-007 (PT Sample Packaging): after F-1(a) it owns
// THREE fanned lines of the current publication (R2) — PK-PETB-8810 2026-08
// firm, PK-CAPF-8820 2026-09 semi-firm, AI-NIAC-6601 2026-10 visibility-only.
// Everything else (glycerin / cetearyl / sup-005's PET line) belongs to OTHER
// suppliers and must never render here (FORK-3b-C own-facts-only).
// ────────────────────────────────────────────────────────────────────────────

/** @type {CurrentIdentity} */
const SUP002 = {
  personaType: 'supplier',
  supplierId: 'sup-002',
  supplierName: 'PT Lautan Luas Tbk',
  businessRoles: PERSONA_SYSTEM_ROLES.supplier,
  actor: NO_PERSON
};

beforeEach(() => {
  requirementResponseStore.reset();
  incomingShipmentStore.reset();
});

/** @param {CurrentIdentity} [identity] */
const renderPage = (identity = SUPPLIER) =>
  renderWithProviders(<SupplierForecasts />, { identity, route: '/supplier/forecasts' });

// Open the confirm panel for a line card identified by its material code.
/** @param {string} materialCode */
async function openConfirmFor(materialCode) {
  const lines = await screen.findByTestId('sdcsup-lines');
  const card = /** @type {HTMLElement} */ (
    within(lines).getByText(materialCode).closest('div.bg-bg-surface')
  );
  fireEvent.click(within(card).getByRole('button', { name: /^Confirm$/ }));
  await screen.findByLabelText(/Confirmed quantity/);
}

/** sup-007 has drafted or submitted a response to its firm PK-PETB-8810 line. */
const mine8810 = () =>
  requirementResponseStore
    .all()
    .some((r) => r.materialCode === 'PK-PETB-8810' && r.supplierId === 'sup-007');

/** @param {string} value */
const setQty = (value) =>
  fireEvent.change(screen.getByLabelText(/Confirmed quantity/), { target: { value } });

// PF-1b — the panel's commit SAVES A DRAFT. Submitting is a second act, from
// My responses (`submitDraftFor` below).
const submitPanel = () => fireEvent.click(screen.getByRole('button', { name: /Save draft/ }));

/**
 * PF-1b — click `Submit to buyer` on a drafted response card.
 * @param {string} responseId
 */
const submitDraftFor = async (responseId) => {
  const panel = await screen.findByTestId('sdcsup-responses');
  const card = /** @type {HTMLElement} */ (
    within(panel).getByText(responseId).closest('div.bg-bg-surface')
  );
  fireEvent.click(within(card).getByRole('button', { name: /Submit to buyer/ }));
};

describe('SupplierForecasts — own-facts-only (the load-bearing isolation)', () => {
  it('renders ONLY sup-007 fanned lines — no other supplier material leaks', async () => {
    renderPage();
    const lines = await screen.findByTestId('sdcsup-lines');
    // sup-007's three fanned lines (F-1a depth + the visibility-only active).
    expect(within(lines).getByText('PK-PETB-8810')).toBeInTheDocument();
    expect(within(lines).getByText('PK-CAPF-8820')).toBeInTheDocument();
    expect(within(lines).getByText('AI-NIAC-6601')).toBeInTheDocument();
    // Other suppliers' materials NEVER render (sup-002 glycerin/cetearyl).
    expect(screen.queryByText('RM-EMUL-3310')).not.toBeInTheDocument();
    expect(screen.queryByText('RM-EMUL-3320')).not.toBeInTheDocument();
  });

  it('another supplier identity sees ITS lines, not sup-007 packaging', async () => {
    renderPage(SUP002);
    const lines = await screen.findByTestId('sdcsup-lines');
    expect(within(lines).getByText('RM-EMUL-3310')).toBeInTheDocument();
    expect(screen.queryByText('PK-CAPF-8820')).not.toBeInTheDocument();
  });

  it('My responses shows OWN records with STATUS only — no rank/score, no others', async () => {
    renderPage(SUP002);
    fireEvent.click(await screen.findByRole('tab', { name: /My responses/ }));
    const panel = await screen.findByTestId('sdcsup-responses');
    // sup-002's own fixtures (rr-0001 submitted, rr-0003 draft) — never sup-005's.
    expect(within(panel).getByText('rr-0001')).toBeInTheDocument();
    expect(within(panel).queryByText('rr-0002')).not.toBeInTheDocument();
    expect(within(panel).queryByText('rr-0004')).not.toBeInTheDocument();
    // Status vocabulary only — no competitive framing anywhere on the page.
    expect(screen.queryByText(/rank/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/score/i)).not.toBeInTheDocument();
  });
});

describe('SupplierForecasts — FLAG-2 honest render', () => {
  it('the governed LIVE lane is empty and the sample renders only under the banner + pill', async () => {
    // The predicate IS the gate: every fixture publication filters out.
    expect(supplierVisiblePublications(FORECAST_PUBLICATIONS)).toEqual([]);
    expect(isLive('forecastPublications')).toBe(false);
    renderPage();
    // The registry-derived pill (green structurally unreachable).
    expect((await screen.findAllByText(/Sample data/i)).length).toBeGreaterThan(0);
    expect(screen.queryByText(/^Live$/)).not.toBeInTheDocument();
    // The honest empty state of the live lane, stated on the sample banner.
    expect(screen.getByText(/no live publication yet/i)).toBeInTheDocument();
    expect(screen.getByText(/simulated sample data/i)).toBeInTheDocument();
  });

  it('speaks commitmentClass ONLY — the P2 provenance grammar never renders', async () => {
    renderPage();
    const lines = await screen.findByTestId('sdcsup-lines');
    expect(within(lines).getByText('Zone Liability')).toBeInTheDocument();
    expect(within(lines).getByText('Zone Capacity')).toBeInTheDocument();
    expect(within(lines).getByText('Visibility only')).toBeInTheDocument();
    // No PlanCellMarker / internal liveness-axis vocabulary on this surface.
    expect(screen.queryByText(/SIMULATED/)).not.toBeInTheDocument();
    expect(screen.queryByText(/PLANNED/)).not.toBeInTheDocument();
  });

  // PEX-D22 (owner, 2026-11-05) flipped the semi-firm line: it pinned 2
  // Confirm buttons (firm + semi-firm). A semi-firm line is Zone Capacity,
  // acknowledgement only, so only the firm line offers Confirm.
  it('a Zone Capacity line (visibility-only or semi-firm) offers ACKNOWLEDGE, never Confirm (nothing to commit)', async () => {
    renderPage();
    const lines = await screen.findByTestId('sdcsup-lines');
    // 3 fanned lines: 1 Confirm button (firm) and 2 Acknowledge (semi-firm and
    // visibility-only — SDC-2b-EXT response affordance + the hint).
    expect(within(lines).getAllByRole('button', { name: /^Confirm$/ })).toHaveLength(1);
    expect(within(lines).getAllByRole('button', { name: /^Acknowledge$/ })).toHaveLength(2);
    expect(within(lines).getAllByText(/no commitment requested/i)).toHaveLength(2);
    /** @param {string} code */
    const cardOf = (code) =>
      /** @type {HTMLElement} */ (within(lines).getByText(code).closest('div.bg-bg-surface'));
    expect(within(cardOf('PK-PETB-8810')).getByRole('button', { name: /^Confirm$/ })).toBeTruthy();
    expect(
      within(cardOf('PK-CAPF-8820')).getByRole('button', { name: /^Acknowledge$/ })
    ).toBeTruthy();
    expect(within(cardOf('PK-CAPF-8820')).queryByRole('button', { name: /^Confirm$/ })).toBeNull();
  });
});

describe('SupplierForecasts — the visibility response (SDC-2b-EXT)', () => {
  it('acknowledges the visibility line with a note → records honestly, never as a confirmation', async () => {
    renderPage();
    const lines = await screen.findByTestId('sdcsup-lines');
    const niac = /** @type {HTMLElement} */ (
      within(lines).getByText('AI-NIAC-6601').closest('div.bg-bg-surface')
    );
    fireEvent.click(within(niac).getByRole('button', { name: /^Acknowledge$/ }));
    fireEvent.change(await screen.findByLabelText(/Note \(optional signal\)/), {
      target: { value: 'Current stock covers this horizon.' }
    });
    // The panel commit is OUTLINE "Acknowledge" — solid stays reserved for
    // commitments. Two "Acknowledge" buttons exist (line card + panel commit);
    // the panel's is the last in DOM order.
    const ackButtons = screen.getAllByRole('button', { name: /^Acknowledge$/ });
    fireEvent.click(ackButtons[ackButtons.length - 1]);
    const panel = await screen.findByTestId('sdcsup-responses');
    const minted = requirementResponseStore
      .all()
      .find((r) => r.supplierId === 'sup-007' && r.acknowledgment && r.id.startsWith('rr-9'));
    expect(minted).toBeDefined();
    expect(
      /** @type {import('@services/sdc/types').RequirementResponse} */ (minted).acknowledgment
    ).toEqual({ note: 'Current stock covers this horizon.' });
    expect(
      /** @type {import('@services/sdc/types').RequirementResponse} */ (minted).forecastConfirmation
    ).toBeUndefined(); // no number to misread
    expect(
      /** @type {import('@services/sdc/types').RequirementResponse} */ (minted).planVersion
    ).toBe('PV-2026-08.2');
    // The seed rr-0005 answered the same thread → this re-ack versions up to 2.
    expect(
      /** @type {import('@services/sdc/types').RequirementResponse} */ (minted).submissionVersion
    ).toBe(2);
    // My responses renders "Acknowledged" — and no qty for this record.
    expect(within(panel).getAllByText('Acknowledged').length).toBeGreaterThan(0);
  });

  it('the seeded acknowledgment (rr-0005) renders as Acknowledged with its note — no qty, no "confirmed"', async () => {
    renderPage();
    fireEvent.click(await screen.findByRole('tab', { name: /My responses/ }));
    const panel = await screen.findByTestId('sdcsup-responses');
    expect(within(panel).getByText('rr-0005')).toBeInTheDocument();
    expect(within(panel).getByText('Acknowledged')).toBeInTheDocument();
    expect(within(panel).getByText(/no concern yet/)).toBeInTheDocument();
    expect(within(panel).queryByText(/confirmed/i)).not.toBeInTheDocument();
  });
});

describe('SupplierForecasts — the governed submit (t_requirementresponse_submit)', () => {
  it('confirms the FIRM line in full → lands in My responses as a DRAFT v1', async () => {
    renderPage();
    await openConfirmFor('PK-PETB-8810');
    setQty('40000');
    submitPanel();
    // The scoped invalidation re-derives My responses from the mutated store.
    const panel = await screen.findByTestId('sdcsup-responses');
    const minted = requirementResponseStore
      .all()
      .find((r) => r.supplierId === 'sup-007' && r.materialCode === 'PK-PETB-8810');
    expect(minted).toBeDefined();
    // ⚠️ PF-1b — DRAFT. Every fact below is captured at creation exactly as
    // before; what changed is that the buyer cannot see it yet.
    expect(/** @type {import('@services/sdc/types').RequirementResponse} */ (minted).status).toBe(
      'Draft'
    );
    expect(
      /** @type {import('@services/sdc/types').RequirementResponse} */ (minted).submittedAt
    ).toBeUndefined();
    expect(
      /** @type {import('@services/sdc/types').RequirementResponse} */ (minted).submissionVersion
    ).toBe(1);
    expect(
      /** @type {import('@services/sdc/types').ForecastConfirmation} */ (
        /** @type {import('@services/sdc/types').RequirementResponse} */ (minted)
          .forecastConfirmation
      ).confirmedQty
    ).toBe(40000);
    expect(
      /** @type {import('@services/sdc/types').ForecastConfirmation} */ (
        /** @type {import('@services/sdc/types').RequirementResponse} */ (minted)
          .forecastConfirmation
      ).uom
    ).toBe('PCS'); // master, not caller
    expect(
      /** @type {import('@services/sdc/types').RequirementResponse} */ (minted).planVersion
    ).toBe('PV-2026-08.2'); // bound to the rendered snapshot
    expect(
      within(panel).getByText(
        /** @type {import('@services/sdc/types').RequirementResponse} */ (minted).id
      )
    ).toBeInTheDocument();
  });

  it('BL-326 · an unreadable quantity describes the refusal that is on screen', async () => {
    renderPage();
    await openConfirmFor('PK-PETB-8810');
    const input = screen.getByLabelText(/Confirmed quantity/);
    // Pristine: the permanent hint is the description, and nothing is refused.
    expect(input).toHaveAttribute('aria-describedby', 'sdcsup-qty-hint');
    expect(document.getElementById('sdcsup-qty-hint')).toHaveTextContent('Digits only');
    expect(input).toHaveAttribute('aria-invalid', 'false');
    expect(document.getElementById('sdcsup-qty-refusal')).toBeNull();

    setQty('2.400'); // the unresolved cross-convention token
    const refusal = screen.getByTestId('confirm-qty-refusal');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    const ids = (input.getAttribute('aria-describedby') ?? '').split(/\s+/).filter(Boolean);
    expect(ids).toContain('sdcsup-qty-refusal');
    const described = document.getElementById('sdcsup-qty-refusal');
    expect(described).toBe(refusal);
    expect(described?.textContent).toBe(refusal.textContent);
    expect(described?.textContent).toContain('can be read two ways');

    // A readable quantity takes the refusal away with the description that
    // announces it: the field describes only what is on screen.
    setQty('40000');
    expect(input).toHaveAttribute('aria-invalid', 'false');
    expect(input).toHaveAttribute('aria-describedby', 'sdcsup-qty-hint');
    expect(document.getElementById('sdcsup-qty-refusal')).toBeNull();
  });

  // PEX-D22 — on the firm line PK-PETB-8810 (40 000 PCS); it used the
  // semi-firm PK-CAPF-8820, which now takes an acknowledgement only.
  it('a SHORT confirm without a root cause is blocked at the form; with one it submits', async () => {
    renderPage();
    await openConfirmFor('PK-PETB-8810');
    setQty('30000'); // < the requested 40 000
    submitPanel();
    // Blocked at the form (root-cause toast): nothing minted, the panel stays open.
    expect(mine8810()).toBe(false);
    expect(screen.getByRole('button', { name: /Save draft/ })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/Category/), { target: { value: 'capacity' } });
    submitPanel();
    await waitFor(() => expect(mine8810()).toBe(true));
    const minted = /** @type {import('@services/sdc/types').RequirementResponse} */ (
      requirementResponseStore
        .all()
        .find((r) => r.materialCode === 'PK-PETB-8810' && r.supplierId === 'sup-007')
    );
    expect(minted.rootCause?.level1).toBe('capacity');
    expect(
      /** @type {import('@services/sdc/types').ForecastConfirmation} */ (
        minted.forecastConfirmation
      ).confirmedQty
    ).toBe(30000);
  });

  it('F-2: zero-qty + root cause is a LEGAL "cannot supply at all" short', async () => {
    renderPage();
    await openConfirmFor('PK-PETB-8810');
    setQty('0');
    fireEvent.change(screen.getByLabelText(/Category/), { target: { value: 'capacity' } });
    fireEvent.change(screen.getByLabelText(/^Note$/), {
      target: { value: 'No bridgeable volume this cycle.' }
    });
    submitPanel();
    await waitFor(() =>
      expect(
        requirementResponseStore
          .all()
          .some(
            (r) =>
              r.supplierId === 'sup-007' &&
              /** @type {import('@services/sdc/types').ForecastConfirmation} */ (
                r.forecastConfirmation
              ).confirmedQty === 0
          )
      ).toBe(true)
    );
    const minted = /** @type {import('@services/sdc/types').RequirementResponse} */ (
      requirementResponseStore
        .all()
        .find(
          (r) =>
            r.supplierId === 'sup-007' &&
            /** @type {import('@services/sdc/types').ForecastConfirmation} */ (
              r.forecastConfirmation
            ).confirmedQty === 0
        )
    );
    expect(minted.status).toBe('Draft'); // PF-1b — saved, not sent
    expect(minted.rootCause).toEqual({
      level1: 'capacity',
      note: 'No bridgeable volume this cycle.'
    });
  });

  it('an EMPTY quantity is not a submission (0 must be stated, not defaulted)', async () => {
    renderPage();
    const before = requirementResponseStore.all().length;
    await openConfirmFor('PK-PETB-8810');
    submitPanel();
    // Blocked at the form (quantity toast): nothing minted, the panel stays open.
    expect(requirementResponseStore.all().length).toBe(before);
    expect(screen.getByRole('button', { name: /Save draft/ })).toBeInTheDocument();
  });

  it('re-confirming the same line VERSIONS UP — the prior response is not overwritten', async () => {
    renderPage();
    await openConfirmFor('PK-PETB-8810');
    setQty('40000');
    submitPanel();
    await screen.findByTestId('sdcsup-responses');
    // Back to the lines tab; confirm again with a revised (short) quantity.
    fireEvent.click(screen.getByRole('tab', { name: /Published lines/ }));
    await openConfirmFor('PK-PETB-8810');
    setQty('38000');
    fireEvent.change(screen.getByLabelText(/Category/), { target: { value: 'capacity' } });
    submitPanel();
    await waitFor(() => {
      const thread = requirementResponseStore.forResponseKey(
        'sup-007',
        'PK-PETB-8810',
        '2026-08',
        'PUB-2026-08-RM-R2'
      );
      expect(thread).toHaveLength(2);
      expect(thread.map((r) => r.submissionVersion).sort()).toEqual([1, 2]);
    });
  });
});

// ────────────────────────────────────────────────────────────────────────────
// CP-0 · W1 · PR-2c — the forecast commitment is PARSED, and the FALSE-DEFICIT
// CHAIN is broken at its source.
//
// A misread here does not stay a bad number. "40.000" against the 40,000 PCS
// firm line became 40, which tripped `isShort`, which forced the supplier to
// pick a shortfall root cause for a quantity they had committed IN FULL, which
// shipped a 39,960-unit deficit to the planner's collaboration board. These
// tests lock BOTH halves: the false accusation is gone, and genuine shortfall
// detection still works — a fix that simply stopped detecting shorts would pass
// the first half and be worse than the bug.
// ────────────────────────────────────────────────────────────────────────────

// The root-cause requirement is rendered as a danger `*` appended to the
// "Category" label when `isShort` holds — that marker IS the accusation the
// false-deficit chain begins with, so it is what these tests assert. (Asserting
// a literal "Root cause *" string would never match and would pass vacuously.)
const categoryIsRequired = () =>
  screen.getAllByText(/Category/).some((el) => /\*/.test(el.textContent ?? ''));

describe('SupplierForecasts — CAP-6 (BL-175): a quantity, no committed date', () => {
  it('the confirm panel asks for no committed date; My responses shows no Committed date column', async () => {
    renderPage();
    await openConfirmFor('PK-PETB-8810');
    expect(screen.getByLabelText(/Capacity constraint/)).toBeInTheDocument();
    expect(screen.queryByLabelText(/Committed date/)).toBeNull();
    expect(document.querySelector('input[type="date"]#sdcsup-date')).toBeNull();
    setQty('40000');
    submitPanel();
    await waitFor(() =>
      expect(
        requirementResponseStore
          .all()
          .find((r) => r.supplierId === 'sup-007' && r.materialCode === 'PK-PETB-8810')
          ?.forecastConfirmation
      ).toMatchObject({ confirmedQty: 40000 })
    );
    // My responses: the seeded responses still store a committed date (sdc
    // fixtures), and the grid no longer shows it.
    fireEvent.click(await screen.findByRole('tab', { name: /My responses/ }));
    const responses = await screen.findByTestId('sdcsup-responses');
    // Control: the response grid rendered its other labels, so the absence is real.
    expect(within(responses).getAllByText('Version').length).toBeGreaterThan(0);
    expect(within(responses).queryByText('Committed date')).toBeNull();
  });
});

describe('SupplierForecasts — the false-deficit chain (CP-0 · 2c)', () => {
  it('an AMBIGUOUS quantity REFUSES — it is never read as a shortfall', async () => {
    renderPage();
    const before = requirementResponseStore.all().length;
    await openConfirmFor('PK-PETB-8810'); // firm, 40 000 PCS
    setQty('40.000'); // 40000 under id, 40 under en — one reading of two

    // A quantity nobody can read is not a shortfall. The root-cause section must
    // NOT demand an explanation for a deviation that has not been established.
    const refusal = screen.getByTestId('confirm-qty-refusal');
    expect(refusal.textContent?.trim()).not.toBe(''); // a reason is never blank
    // THE FALSE ACCUSATION: this used to read 40, trip `isShort`, and demand a
    // shortfall category for a quantity committed in full.
    expect(categoryIsRequired()).toBe(false);

    // Nothing reaches the spine.
    submitPanel();
    await waitFor(() => expect(requirementResponseStore.all()).toHaveLength(before));
    expect(
      requirementResponseStore.all().some((r) => r.forecastConfirmation?.confirmedQty === 40)
    ).toBe(false);
  });

  it('a FULL quantity does not trip isShort, forces no root cause, and surfaces NO deficit', async () => {
    renderPage();
    await openConfirmFor('PK-PETB-8810');
    setQty('40000'); // exactly the requested quantity
    expect(screen.queryByTestId('confirm-qty-refusal')).not.toBeInTheDocument();
    expect(categoryIsRequired()).toBe(false); // nothing to explain

    // Submitted WITHOUT ever choosing a root cause — the whole chain's trigger.
    submitPanel();
    await waitFor(() =>
      expect(requirementResponseStore.all().some((r) => r.materialCode === 'PK-PETB-8810')).toBe(
        true
      )
    );
    const minted = /** @type {import('@services/sdc/types').RequirementResponse} */ (
      requirementResponseStore
        .all()
        .find((r) => r.materialCode === 'PK-PETB-8810' && r.supplierId === 'sup-007')
    );
    expect(
      /** @type {import('@services/sdc/types').ForecastConfirmation} */ (
        minted.forecastConfirmation
      ).confirmedQty
    ).toBe(40000);
    expect(minted.rootCause).toBeUndefined(); // no fabricated shortfall explanation

    // ⚠️ PF-1b — THE PLANNER SEES NOTHING UNTIL IT IS SUBMITTED, and that is
    // asserted before the submit rather than assumed away: a Draft leaves the
    // line `awaiting`, which is the whole point of the draft lane.
    const beforeRows = consolidationRows(FORECAST_PUBLICATIONS, requirementResponseStore.all());
    expect(
      /** @type {import('@services/sdc/consolidation').ConsolidationRow} */ (
        beforeRows.find(
          (r) => r.line.supplierId === 'sup-007' && r.line.materialCode === 'PK-PETB-8810'
        )
      ).state.kind
    ).toBe('awaiting');
    await submitDraftFor(minted.id);

    // The downstream link: consolidation derives the planner's deficit from this
    // stored quantity. A full confirmation must derive `confirmed-full`, so
    // BuyerCollaboration has no deficit to render.
    const rows = consolidationRows(FORECAST_PUBLICATIONS, requirementResponseStore.all());
    const row = /** @type {import('@services/sdc/consolidation').ConsolidationRow} */ (
      rows.find((r) => r.line.supplierId === 'sup-007' && r.line.materialCode === 'PK-PETB-8810')
    );
    expect(row.state.kind).toBe('confirmed-full');
    expect(row.state).not.toHaveProperty('deficitQty');
  });

  it('CONTROL — a GENUINELY short quantity still trips every guard (the fix did not disable detection)', async () => {
    renderPage();
    // PEX-D22 — the firm line (the semi-firm PK-CAPF-8820 is acknowledgement only now).
    await openConfirmFor('PK-PETB-8810'); // firm, 40 000 PCS
    setQty('30000'); // really short by 10 000

    // The accusation is CORRECT here and must still be made.
    expect(categoryIsRequired()).toBe(true);

    // Blocked without a root cause, exactly as before.
    submitPanel();
    expect(mine8810()).toBe(false);
    fireEvent.change(screen.getByLabelText(/Category/), { target: { value: 'capacity' } });
    submitPanel();
    await waitFor(() => expect(mine8810()).toBe(true));

    // And the REAL deficit still reaches the planner — once it is SUBMITTED.
    const draft = /** @type {import('@services/sdc/types').RequirementResponse} */ (
      requirementResponseStore
        .all()
        .find((r) => r.materialCode === 'PK-PETB-8810' && r.supplierId === 'sup-007')
    );
    await submitDraftFor(draft.id);
    const rows = consolidationRows(FORECAST_PUBLICATIONS, requirementResponseStore.all());
    const row = /** @type {import('@services/sdc/consolidation').ConsolidationRow} */ (
      rows.find((r) => r.line.supplierId === 'sup-007' && r.line.materialCode === 'PK-PETB-8810')
    );
    expect(row.state.kind).toBe('short');
    expect(row.state).toMatchObject({ deficitQty: 10000 });
  });

  it('a blank quantity is not a zero commitment — and a TYPED zero still is', async () => {
    renderPage();
    const before = requirementResponseStore.all().length;
    await openConfirmFor('PK-PETB-8810');
    submitPanel(); // nothing typed
    expect(requirementResponseStore.all()).toHaveLength(before);

    // The same field, now stating 0 — a binding "I cannot supply any of this".
    setQty('0');
    fireEvent.change(screen.getByLabelText(/Category/), { target: { value: 'capacity' } });
    submitPanel();
    await waitFor(() =>
      expect(
        requirementResponseStore
          .all()
          .some((r) => r.supplierId === 'sup-007' && r.forecastConfirmation?.confirmedQty === 0)
      ).toBe(true)
    );
  });
});

// BL-60 (REQ-E08-02 BR-09) — the Stock tab's own entry (a declare form, a batch
// grid and a free-form spreadsheet import) was RETIRED: stock has ONE entry
// point, the Stock page. The Σ-banner specs that stood here tested that form and
// were deleted with it; the Stock page's entry has its own specs.
describe('SupplierForecasts — the Stock tab is a signpost, not a second entry point (BL-60)', () => {
  it('links to the Stock page and offers no stock entry of its own', async () => {
    renderPage();
    fireEvent.click(await screen.findByRole('tab', { name: /Stock \(SOH\)/ }));
    expect(await screen.findByTestId('sdcsup-stock-moved')).toBeInTheDocument();
    expect(screen.getByTestId('sdcsup-stock-moved-link')).toHaveAttribute(
      'href',
      '/supplier/inventory'
    );
    expect(screen.queryByRole('button', { name: /Declare stock/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /Bulk stock entry/i })).toBeNull();
  });
});

// ────────────────────────────────────────────────────────────────────────────
// CP-0 · W1 · PR-2d — the shipment quantity. This surface had NO tests before
// this batch, so everything here is additive.
//
// A shipment quantity is not a leaf: it sums into the buyer's incoming-coverage
// read and it drives the delivery drawdown, where the schedule line's variance
// is `qty - plannedQty` AND the matching shipment is picked by the smallest
// absolute variance. "6.000" read as 6 does not just report a wrong number — it
// can match the wrong shipment to a released line. The parse is the guard.
// ────────────────────────────────────────────────────────────────────────────
describe('SupplierForecasts — the shipment quantity is parsed, never coerced (CP-0 · 2d)', () => {
  // sup-007 (the seeded persona) owns PK-PETB-8810 and four own ASNs, so the
  // material select, the direction and the ASN link are all reachable by hand
  // on ONE form — the smoke path, exercised here.
  // Several panels are mounted at once, so these address the shipment panel's
  // fields by their own ids (the same ids the labels' htmlFor points at). A
  // missing id throws rather than silently matching the wrong panel.
  /**
   * @template {HTMLElement} T
   * @param {string} id
   * @returns {T}
   */
  const field = (id) => {
    const el = document.getElementById(id);
    if (!el) throw new Error(`shipment panel field #${id} is not in the document`);
    return /** @type {T} */ (el);
  };

  /**
   * @param {RegExp} [tab]
   * @param {RegExp} [report]
   */
  const openShipment = async (tab = /Shipments/, report = /^Report shipment$/) => {
    renderPage();
    fireEvent.click(await screen.findByRole('tab', { name: tab }));
    fireEvent.click(await screen.findByRole('button', { name: report }));
    await waitFor(() => expect(document.getElementById('sdcsup-ship-material')).not.toBeNull());
    fireEvent.change(field('sdcsup-ship-material'), { target: { value: 'PK-PETB-8810' } });
    fireEvent.change(field('sdcsup-ship-direction'), { target: { value: 'to-paragon' } });
    fireEvent.change(field('sdcsup-ship-asn'), { target: { value: 'ASN-2025-00211' } });
  };
  /** @param {string} v */
  const setShipQty = (v) => fireEvent.change(field('sdcsup-ship-qty'), { target: { value: v } });
  const reportBtn = () => screen.getByTestId('sdcsup-ship-submit');
  const ownShipments = () =>
    incomingShipmentStore.all().filter((s) => s.materialCode === 'PK-PETB-8810');

  // POSITIVE — establishes that `ship-qty-refusal` is a selector that MATCHES.
  // Every absence assertion below leans on this one having been seen to pass.
  it('an AMBIGUOUS quantity renders the refusal and withdraws the commit', async () => {
    await openShipment();
    setShipQty('6.000'); // 6000 under id, 6 under en — one reading of two
    const refusal = screen.getByTestId('ship-qty-refusal');
    expect(refusal.textContent?.trim()).not.toBe(''); // a reason is never blank
    expect(reportBtn()).toBeDisabled();
  });

  it('an AMBIGUOUS quantity reaches NEITHER the spine NOR the store', async () => {
    await openShipment();
    const before = ownShipments().length;
    setShipQty('6.000');
    fireEvent.click(reportBtn()); // disabled, but the backstop is asserted too
    await waitFor(() => expect(ownShipments()).toHaveLength(before));
    // Specifically: not the 6 the old blanket coercion would have shipped into
    // the coverage sum and the drawdown match.
    expect(ownShipments().some((s) => s.qty === 6)).toBe(false);
  });

  it('a READABLE quantity reports — and the number stored is the number typed', async () => {
    await openShipment();
    setShipQty('6000');
    // The inverse of the positive above, now that the selector is known good.
    expect(screen.queryByTestId('ship-qty-refusal')).not.toBeInTheDocument();
    expect(reportBtn()).not.toBeDisabled();

    fireEvent.click(reportBtn());
    await waitFor(() => expect(ownShipments().some((s) => s.qty === 6000)).toBe(true));
    const minted = /** @type {import('@services/sdc/types').IncomingShipment} */ (
      ownShipments().find((s) => s.qty === 6000)
    );
    expect(minted.supplierId).toBe('sup-007');
    expect(minted.asnRef).toBe('ASN-2025-00211');
    expect(Number.isFinite(minted.qty)).toBe(true); // never a NaN through the spine
  });

  it('a blank quantity is not a zero shipment — and a TYPED zero still is', async () => {
    await openShipment();
    const before = ownShipments().length;
    fireEvent.click(reportBtn()); // nothing typed
    await waitFor(() => expect(ownShipments()).toHaveLength(before));
    // THE `|| 0`: an untouched field used to become a reported shipment of 0,
    // which posts a variance of minus the whole planned quantity downstream.
    expect(ownShipments().some((s) => s.qty === 0)).toBe(false);

    // The same field, now STATING zero — a real fact, and it must be recorded.
    setShipQty('0');
    fireEvent.click(reportBtn());
    await waitFor(() => expect(ownShipments().some((s) => s.qty === 0)).toBe(true));
  });

  it('refuses in Indonesian too — the guard is not an English-only affordance', async () => {
    await i18n.changeLanguage('id');
    try {
      await openShipment(/Pengiriman/, /^Laporkan pengiriman$/);
      setShipQty('6.000');
      const refusal = screen.getByTestId('ship-qty-refusal');
      expect(refusal.textContent).toMatch(/dibaca dua cara/);
      expect(reportBtn()).toBeDisabled();
    } finally {
      await i18n.changeLanguage('en');
    }
  });
});

// BL-183 (owner ruling 2026-11-19) — the page title is its menu label.
describe('BL-183 — the title is the menu label', () => {
  it('renders the Foresight commitments menu label as its heading (EN)', async () => {
    renderPage();
    expect(
      await screen.findByRole('heading', { level: 1, name: hubEn['hub.nav.sup.forecast'] })
    ).toBeInTheDocument();
  });
});

describe('SupplierForecasts — i18n (ID)', () => {
  it('localizes the header, banner, and tabs to Indonesian', async () => {
    await i18n.changeLanguage('id');
    try {
      renderPage();
      expect(
        await screen.findByRole('heading', { level: 1, name: hubId['hub.nav.sup.forecast'] })
      ).toBeInTheDocument();
      expect(screen.getByText(/belum ada publikasi live/i)).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /Baris terbit/ })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /Respons Saya/ })).toBeInTheDocument();
    } finally {
      await i18n.changeLanguage('en');
    }
  });
});
