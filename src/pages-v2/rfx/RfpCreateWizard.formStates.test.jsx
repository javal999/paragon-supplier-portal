// ─────────────────────────────────────────────────────────────────────────────
// RfpCreateWizard — EVERY FORM STATE, PINNED BEFORE THE REACT-HOOK-FORM
// CONVERSION (frontend-standard "Forms", PAGE-SPLIT-GUIDE; the
// `GRInspectionWizard.formStates.test.jsx` precedent).
//
// Written and run green against the `useState` wizard FIRST; it must pass
// unchanged after the draft moves into `useForm`. It drives the real component
// only through what a buyer can see and do — labels, test ids, buttons, the
// dispatched commands — and never reaches into the draft.
//
// What it pins:
//   · each step's fields and their defaults;
//   · when a refusal shows and when it does not (the deadline refuses as soon
//     as a date is entered; a picked term with no or a misfit value is NAMED);
//   · Next / Back / Send / Save draft enablement per step;
//   · values surviving Back / Next;
//   · the RFI pre-fill, the past-event copy, save-as-template and a saved
//     template applied;
//   · the exact create / revise payloads, the publish follow-up, the toasts;
//   · edit mode, a seat that cannot send, Cancel.
//
// The page-level specs (`RfpCreate.test.jsx`, `RfxEditDraft.test.jsx`,
// `RfxAuthoring.test.jsx`, `RfpPricing.test.jsx`) already pin the round trips
// through the board and the supplier's side; they are not repeated here.
// ─────────────────────────────────────────────────────────────────────────────
/** @import React from 'react' */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { renderWithProviders, BUYER } from '@test/test-utils';
import i18n from '@lib/i18n';
import { SEEDED_SEAT_ROLES } from '@services/transitions/businessRoles';
import { resetRfxStores, rfpEventStore } from '@services/data/mock/stores/rfxStores';
import { rfiEventViews, rfpEventViews } from '@services/data/mock/rfxReadModel';
import { mockDataService } from '@services/data/mock/mockDataService';
import { sdcClock } from '@services/sdc';
import { RFX_CATEGORY_FAMILIES } from '@services/sourcing/rfxConfig';
import { prefillRfpFromRfi } from '@services/sourcing/rfxPrefill';
import { rfpTemplateStore } from '@services/sourcing/rfxTemplates';
import { useToast } from '@hooks/useToast';
import { rfxNow } from './rfxDisplay';
import { authored } from './rfxAuthoringDisplay';
import RfpCreateWizard from './RfpCreateWizard';

/** @import { RfpEvent } from '@services/sourcing/types' */

const BUYER_SEAT = { ...BUYER, businessRoles: SEEDED_SEAT_ROLES.buyer };

/** @type {React.FC} */
const ToastSpy = () => {
  const { toasts } = useToast();
  return (
    <ul data-testid="toast-spy">
      {toasts.map((x) => (
        <li key={x.id}>{`${x.title} ${x.description ?? ''}`}</li>
      ))}
    </ul>
  );
};
const toasts = () => screen.getByTestId('toast-spy').textContent ?? '';

/** @param {number} days */
const dayFromNow = (days) =>
  new Date(Date.parse(rfxNow()) + days * 86_400_000).toISOString().slice(0, 10);

/** The wizard's `prefill` prop, as `BuyerRfp` builds it for `?rfi=<id>`. */
const prefillOf = (/** @type {string} */ rfiId) => {
  const rfi = /** @type {ReturnType<typeof rfiEventViews>[number]} */ (
    rfiEventViews(rfxNow(), null).find((e) => e.id === rfiId)
  );
  return { ...prefillRfpFromRfi(rfi, rfi.responses), sourceRfiNumber: rfi.eventNumber };
};

/**
 * @typedef {object} RenderOpts
 * @property {boolean} [canPublish]
 * @property {RfpEvent} [editing]
 * @property {ReturnType<typeof prefillOf>} [prefill]
 * @property {readonly RfpEvent[]} [pastEvents]
 * @property {() => void} [onCancel]
 * @property {(id: string) => void} [onCreated]
 */

/** @param {RenderOpts} [o] */
const renderWizard = (o = {}) =>
  renderWithProviders(
    <>
      <RfpCreateWizard
        onCancel={o.onCancel ?? (() => {})}
        onCreated={o.onCreated ?? (() => {})}
        canPublish={o.canPublish ?? true}
        pastEvents={o.pastEvents ?? rfpEventViews(rfxNow(), null)}
        {...(o.editing ? { editing: o.editing } : {})}
        {...(o.prefill ? { prefill: o.prefill } : {})}
      />
      <ToastSpy />
    </>,
    { identity: BUYER_SEAT }
  );

const nextBtn = () => screen.getByRole('button', { name: 'Next' });
const backBtn = () => screen.getByRole('button', { name: 'Back' });
const next = () => fireEvent.click(nextBtn());
const back = () => fireEvent.click(backBtn());
const heading = () => screen.getByRole('heading', { level: 2 }).textContent;
const title = () => /** @type {HTMLInputElement} */ (screen.getByLabelText('Title'));
const family = () => /** @type {HTMLSelectElement} */ (screen.getByTestId('rfp-new-family'));
const scope = () => /** @type {HTMLTextAreaElement} */ (screen.getByLabelText('Scope'));
const currency = () => /** @type {HTMLSelectElement} */ (screen.getByTestId('rfp-new-currency'));
const deadline = () => screen.getByLabelText('Response deadline');
const tcText = () => screen.getByLabelText('Terms and conditions');

const fillScope = (deadlineValue = dayFromNow(21)) => {
  fireEvent.change(title(), { target: { value: 'Pinned RFP' } });
  fireEvent.change(family(), { target: { value: 'packaging' } });
  fireEvent.change(deadline(), { target: { value: deadlineValue } });
};

/** @param {string} termId */
const termRow = (termId) => screen.getByTestId(`rfp-new-term-${termId}`);
/**
 * @param {string} termId
 * @param {string} label
 */
const pickBox = (termId, label) =>
  within(termRow(termId)).getByLabelText(`${label} — Ask for this term`);
/**
 * @param {string} termId
 * @param {string} label
 */
const valueBox = (termId, label) =>
  within(termRow(termId)).getByLabelText(`${label} — PTI asks for`);
/**
 * @param {string} termId
 * @param {string} label
 * @param {string} value
 */
const pickTerm = (termId, label, value) => {
  fireEvent.click(pickBox(termId, label));
  fireEvent.change(valueBox(termId, label), { target: { value } });
};
const PAY = 'Payment terms (days)';
const LEAD = 'Standard lead time (days)';

/** Scope → Terms (leadTime then paymentTerms) → pricing → questions → invitees → documents → review. */
const walkToReview = async () => {
  fillScope();
  next();
  await screen.findByTestId('rfp-new-term-paymentTerms');
  // Picked out of list order on purpose: the payload is in the LIST's order.
  pickTerm('leadTime', LEAD, ' 21 ');
  pickTerm('paymentTerms', PAY, '60');
  next();
  await screen.findByTestId('rfp-new-pricing');
  next();
  await screen.findByTestId('rfp-new-oneoff');
  next();
  fireEvent.click(await screen.findByTestId('rfp-new-invitee-row-sup-007'));
  next();
  next();
  await screen.findByTestId('rfp-new-review');
};

/** @param {import('vitest').MockInstance} spy */
const dispatched = (spy) =>
  spy.mock.calls.map(
    (c) =>
      /** @type {{ transitionId: string; entityId?: string; payload: Record<string, unknown> }} */ (
        c[1]
      )
  );

/** @param {string | RegExp} label */
const applyStart = (label) => {
  const pick = screen.getByTestId('rfp-new-start-pick');
  const option = /** @type {HTMLOptionElement} */ (
    within(pick).getByRole('option', { name: label })
  );
  fireEvent.change(pick, { target: { value: option.value } });
  fireEvent.click(screen.getByTestId('rfp-new-start-apply'));
};

beforeEach(() => {
  resetRfxStores();
  sdcClock.reset();
  window.localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ─── STEP 1 · SCOPE ──────────────────────────────────────────────────────────

describe('RFP wizard states — step 1, the scope', () => {
  it('opens on its defaults: blank fields, IDR, start-from shown, Back and Next disabled', () => {
    renderWizard();
    expect(heading()).toBe('What the request is about');
    expect(title()).toHaveValue('');
    expect(family()).toHaveValue('');
    // Every family is offered, template or not.
    expect([...family().options].map((o) => o.value)).toEqual([
      '',
      ...RFX_CATEGORY_FAMILIES.map((f) => f.id)
    ]);
    expect(scope()).toHaveValue('');
    expect(currency()).toHaveValue('IDR');
    expect([...currency().options].map((o) => o.value)).toEqual(['IDR', 'USD', 'EUR']);
    expect(deadline()).toHaveValue('');
    expect(deadline()).toHaveAttribute('type', 'date');
    expect(tcText()).toHaveValue('');
    expect(screen.getByTestId('rfp-new-confidential')).not.toBeChecked();
    expect(screen.getByTestId('rfp-new-start')).toBeInTheDocument();
    expect(screen.queryByTestId('rfp-edit-banner')).not.toBeInTheDocument();
    expect(screen.queryByTestId('rfp-new-from-rfi')).not.toBeInTheDocument();
    expect(screen.queryByTestId('rfp-new-deadline-refusal')).not.toBeInTheDocument();
    expect(backBtn()).toBeDisabled();
    expect(nextBtn()).toBeDisabled();
  });

  it('Next needs a non-blank title, a family and a future deadline', () => {
    renderWizard();
    fireEvent.change(title(), { target: { value: '  ' } });
    fireEvent.change(family(), { target: { value: 'packaging' } });
    fireEvent.change(deadline(), { target: { value: dayFromNow(4) } });
    expect(nextBtn()).toBeDisabled();
    fireEvent.change(title(), { target: { value: 'T' } });
    expect(nextBtn()).toBeEnabled();
    fireEvent.change(family(), { target: { value: '' } });
    expect(nextBtn()).toBeDisabled();
    fireEvent.change(family(), { target: { value: 'packaging' } });
    fireEvent.change(deadline(), { target: { value: '' } });
    expect(nextBtn()).toBeDisabled();
  });

  it('the deadline refuses as soon as a past date is entered (no blur), never while blank', () => {
    renderWizard();
    fireEvent.change(title(), { target: { value: 'T' } });
    fireEvent.change(family(), { target: { value: 'packaging' } });
    fireEvent.blur(deadline());
    expect(screen.queryByTestId('rfp-new-deadline-refusal')).not.toBeInTheDocument();
    fireEvent.change(deadline(), { target: { value: dayFromNow(-3) } });
    expect(screen.getByTestId('rfp-new-deadline-refusal')).toHaveTextContent(
      'The response deadline must be a date in the future.'
    );
    expect(nextBtn()).toBeDisabled();
    fireEvent.change(deadline(), { target: { value: rfxNow().slice(0, 10) } });
    expect(screen.queryByTestId('rfp-new-deadline-refusal')).not.toBeInTheDocument();
    expect(nextBtn()).toBeEnabled();
    fireEvent.change(deadline(), { target: { value: '' } });
    expect(screen.queryByTestId('rfp-new-deadline-refusal')).not.toBeInTheDocument();
  });

  it('choosing a family touches nothing else', () => {
    renderWizard();
    fireEvent.change(scope(), { target: { value: 'kept scope' } });
    fireEvent.change(currency(), { target: { value: 'EUR' } });
    fireEvent.change(family(), { target: { value: 'rawMaterial' } });
    expect(scope()).toHaveValue('kept scope');
    expect(currency()).toHaveValue('EUR');
  });
});

// ─── STEP 2 · TERMS ──────────────────────────────────────────────────────────

describe('RFP wizard states — step 2, the terms', () => {
  const toTerms = async () => {
    renderWizard();
    fillScope();
    next();
    await screen.findByTestId('rfp-new-term-paymentTerms');
  };

  it('nothing picked: the no-terms refusal and Next disabled; no value box anywhere', async () => {
    await toTerms();
    expect(heading()).toBe('The terms PTI asks for');
    expect(screen.getByTestId('rfp-new-no-terms')).toHaveTextContent(
      'A proposal request asks for at least one term.'
    );
    expect(screen.queryByTestId('rfp-new-missing-values')).not.toBeInTheDocument();
    expect(pickBox('paymentTerms', PAY)).not.toBeChecked();
    expect(within(termRow('paymentTerms')).queryByLabelText(`${PAY} — PTI asks for`)).toBeNull();
    expect(nextBtn()).toBeDisabled();
  });

  it('a picked term with no value is NAMED, quietly (no red box); a value clears it', async () => {
    await toTerms();
    fireEvent.click(pickBox('paymentTerms', PAY));
    expect(screen.queryByTestId('rfp-new-no-terms')).not.toBeInTheDocument();
    expect(screen.getByTestId('rfp-new-missing-values')).toHaveTextContent(
      `Say what PTI is asking for on every picked term. ${PAY}`
    );
    expect(valueBox('paymentTerms', PAY)).toHaveValue('');
    expect(valueBox('paymentTerms', PAY).className).not.toContain('border-danger');
    expect(nextBtn()).toBeDisabled();
    fireEvent.change(valueBox('paymentTerms', PAY), { target: { value: '   ' } });
    expect(screen.getByTestId('rfp-new-missing-values')).toBeInTheDocument();
    fireEvent.change(valueBox('paymentTerms', PAY), { target: { value: '45' } });
    expect(screen.queryByTestId('rfp-new-missing-values')).not.toBeInTheDocument();
    expect(nextBtn()).toBeEnabled();
  });

  it('a number term given words is named AND outlined red; a number clears both', async () => {
    await toTerms();
    pickTerm('leadTime', LEAD, 'three weeks');
    expect(screen.getByTestId('rfp-new-missing-values')).toHaveTextContent(LEAD);
    expect(valueBox('leadTime', LEAD).className).toContain('border-danger');
    expect(nextBtn()).toBeDisabled();
    fireEvent.change(valueBox('leadTime', LEAD), { target: { value: '21' } });
    expect(valueBox('leadTime', LEAD).className).not.toContain('border-danger');
    expect(nextBtn()).toBeEnabled();
  });

  it('two missing values are named in the order they were picked', async () => {
    await toTerms();
    fireEvent.click(pickBox('leadTime', LEAD));
    fireEvent.click(pickBox('paymentTerms', PAY));
    expect(screen.getByTestId('rfp-new-missing-values')).toHaveTextContent(`${LEAD}, ${PAY}`);
  });

  it('unpicking drops the term and its value; picking again starts it blank', async () => {
    await toTerms();
    pickTerm('paymentTerms', PAY, '60');
    fireEvent.click(pickBox('paymentTerms', PAY));
    expect(within(termRow('paymentTerms')).queryByLabelText(`${PAY} — PTI asks for`)).toBeNull();
    expect(screen.getByTestId('rfp-new-no-terms')).toBeInTheDocument();
    fireEvent.click(pickBox('paymentTerms', PAY));
    expect(valueBox('paymentTerms', PAY)).toHaveValue('');
  });

  it('a custom term alone satisfies the step', async () => {
    await toTerms();
    fireEvent.change(screen.getByLabelText('Term'), { target: { value: 'Shelf life' } });
    fireEvent.change(screen.getByTestId('rfp-new-custom-requested'), {
      target: { value: '24 months' }
    });
    fireEvent.click(screen.getByTestId('rfp-new-custom-add'));
    expect(await screen.findByTestId('rfp-new-custom-custom-1')).toHaveTextContent('Shelf life');
    expect(screen.queryByTestId('rfp-new-no-terms')).not.toBeInTheDocument();
    expect(nextBtn()).toBeEnabled();
  });
});

// ─── STEPS 3–6 ───────────────────────────────────────────────────────────────

describe('RFP wizard states — pricing, questions, invitees, documents', () => {
  const toPricing = async () => {
    renderWizard();
    fillScope();
    next();
    await screen.findByTestId('rfp-new-term-paymentTerms');
    pickTerm('paymentTerms', PAY, '60');
    next();
    await screen.findByTestId('rfp-new-pricing');
  };

  it('pricing is optional; switched on with no option it blocks, switched off it passes', async () => {
    await toPricing();
    expect(heading()).toBe('Indicative pricing');
    expect(screen.getByTestId('rfp-new-pricing-toggle')).not.toBeChecked();
    expect(nextBtn()).toBeEnabled();
    fireEvent.click(screen.getByTestId('rfp-new-pricing-toggle'));
    expect(screen.getByTestId('rfp-new-pricing-refusal')).toBeInTheDocument();
    expect(nextBtn()).toBeDisabled();
    fireEvent.click(screen.getByTestId('rfp-new-pricing-toggle'));
    expect(nextBtn()).toBeEnabled();
  });

  it('questions are optional; invitees are not; a nameless document request blocks', async () => {
    await toPricing();
    next();
    await screen.findByTestId('rfp-new-oneoff');
    expect(heading()).toBe('Questions');
    expect(nextBtn()).toBeEnabled();
    next();
    const row = await screen.findByTestId('rfp-new-invitee-row-sup-007');
    expect(nextBtn()).toBeDisabled();
    fireEvent.click(row);
    expect(nextBtn()).toBeEnabled();
    next();
    expect(heading()).toBe('Documents from suppliers');
    expect(nextBtn()).toBeEnabled();
    fireEvent.click(screen.getByTestId('rfp-new-doc-add'));
    expect(nextBtn()).toBeDisabled();
    fireEvent.change(screen.getByTestId('rfp-new-doc-doc-1-name'), { target: { value: 'COA' } });
    expect(nextBtn()).toBeEnabled();
  });

  it('every value survives Back and Next across the steps', async () => {
    renderWizard();
    fillScope();
    fireEvent.change(scope(), { target: { value: 'the scope' } });
    fireEvent.change(currency(), { target: { value: 'USD' } });
    fireEvent.change(tcText(), { target: { value: 'our T&C' } });
    fireEvent.click(screen.getByTestId('rfp-new-confidential'));
    next();
    await screen.findByTestId('rfp-new-term-paymentTerms');
    pickTerm('paymentTerms', PAY, '60');
    next();
    fireEvent.click(await screen.findByTestId('rfp-new-pricing-toggle'));
    fireEvent.click(screen.getByTestId('rfp-new-pricing-toggle'));
    next();
    next();
    fireEvent.click(await screen.findByTestId('rfp-new-invitee-row-sup-013'));
    for (let i = 0; i < 4; i++) back();
    expect(heading()).toBe('What the request is about');
    expect(title()).toHaveValue('Pinned RFP');
    expect(family()).toHaveValue('packaging');
    expect(scope()).toHaveValue('the scope');
    expect(currency()).toHaveValue('USD');
    expect(deadline()).toHaveValue(dayFromNow(21));
    expect(tcText()).toHaveValue('our T&C');
    expect(screen.getByTestId('rfp-new-confidential')).toBeChecked();
    next();
    expect(pickBox('paymentTerms', PAY)).toBeChecked();
    expect(valueBox('paymentTerms', PAY)).toHaveValue('60');
    next();
    next();
    next();
    await screen.findByTestId('rfp-new-invitee-row-sup-013');
    expect(nextBtn()).toBeEnabled();
    next();
    next();
    const review = await screen.findByTestId('rfp-new-review');
    expect(review).toHaveTextContent('Pinned RFP');
    expect(review).toHaveTextContent('the scope');
    expect(review).toHaveTextContent('USD');
    expect(review).toHaveTextContent('Yes, accepted before answering');
    expect(review).toHaveTextContent('Yes, suppliers accept first');
    expect(screen.getByTestId('rfp-new-review-term-paymentTerms')).toHaveTextContent(`${PAY} — 60`);
    expect(screen.getByTestId('rfp-new-review-pricing')).toHaveTextContent('—');
  });
});

// ─── START FROM / PRE-FILL ───────────────────────────────────────────────────

describe('RFP wizard states — pre-fill, copy and templates', () => {
  it('pre-filled from an RFI: banner, title, family, the composed scope, invitees, confidentiality', async () => {
    const prefill = prefillOf('rfi-002');
    renderWizard({ prefill });
    expect(screen.getByTestId('rfp-new-from-rfi')).toHaveTextContent('RFI-2026-002');
    expect(title()).toHaveValue('Oslo sticker capability — variant labels 2027');
    expect(family()).toHaveValue('packaging');
    const notes = prefill.scopeNoteKeys.map((k) => `- ${authored(i18n.t, k)}`).join('\n');
    expect(scope()).toHaveValue(
      `${prefill.scope}\n\nScope notes from the information request:\n${notes}`
    );
    expect(deadline()).toHaveValue('');
    expect(screen.getByTestId('rfp-new-confidential')).not.toBeChecked();
    expect(screen.getAllByTestId('rfp-new-attachments-row')).toHaveLength(1);
    // The start-from picker still shows beside the banner.
    expect(screen.getByTestId('rfp-new-start')).toBeInTheDocument();
  });

  it('pre-filled: the create payload carries the RFI id, its invitees and files', async () => {
    const dispatch = vi.spyOn(mockDataService.commands, 'dispatch');
    const prefill = prefillOf('rfi-002');
    renderWizard({ prefill });
    fireEvent.change(deadline(), { target: { value: dayFromNow(20) } });
    next();
    await screen.findByTestId('rfp-new-term-paymentTerms');
    pickTerm('paymentTerms', PAY, '60');
    next();
    next();
    next();
    await screen.findByTestId('rfp-new-invitee-row-sup-008');
    expect(nextBtn()).toBeEnabled();
    next();
    next();
    fireEvent.click(await screen.findByTestId('rfp-new-save-draft'));
    await waitFor(() => expect(dispatched(dispatch)).toHaveLength(1));
    expect(dispatched(dispatch)[0].payload).toEqual({
      title: prefill.title,
      scope: scope_(prefill),
      materialCategory: 'Packaging',
      responseDeadline: dayFromNow(20),
      currency: 'IDR',
      invitedSupplierIds: ['sup-008'],
      terms: [{ termId: 'paymentTerms', requestedValue: '60' }],
      attachments: prefill.attachments,
      sourceRfiId: 'rfi-002'
    });
  });

  it('PINNED AS FOUND — a past copy over an RFI pre-fill drops the RFI link, the banner stays', async () => {
    const dispatch = vi.spyOn(mockDataService.commands, 'dispatch');
    renderWizard({ prefill: prefillOf('rfi-002') });
    applyStart('RFP-2026-004 · Redwood 2.0 — mold tooling terms');
    expect(screen.getByTestId('rfp-new-from-rfi')).toHaveTextContent('RFI-2026-002');
    fireEvent.change(deadline(), { target: { value: dayFromNow(9) } });
    for (let i = 0; i < 6; i++) next();
    fireEvent.click(await screen.findByTestId('rfp-new-save-draft'));
    await waitFor(() => expect(dispatched(dispatch)).toHaveLength(1));
    expect(dispatched(dispatch)[0].payload).not.toHaveProperty('sourceRfiId');
  });

  it('a past event is COPIED: content, terms and invitees, never its date', async () => {
    renderWizard();
    fireEvent.change(deadline(), { target: { value: dayFromNow(9) } });
    applyStart('RFP-2026-002 · Tundra — open-spec bottle and pump');
    expect(title()).toHaveValue('Tundra — open-spec bottle and pump');
    expect(family()).toHaveValue('packaging');
    expect(currency()).toHaveValue('IDR');
    expect(deadline()).toHaveValue('');
    expect(nextBtn()).toBeDisabled();
    fireEvent.change(deadline(), { target: { value: dayFromNow(9) } });
    next();
    await screen.findByTestId('rfp-new-term-paymentTerms');
    expect(valueBox('priceValidity', 'Price validity period')).toHaveValue('6 months');
    expect(valueBox('paymentTerms', PAY)).toHaveValue('60');
    expect(valueBox('leadTime', LEAD)).toHaveValue('45');
    expect(screen.getByTestId('rfp-new-custom-custom-dosage')).toBeInTheDocument();
    expect(screen.getByTestId('rfp-new-custom-custom-pcr')).toBeInTheDocument();
    next();
    expect(screen.getByTestId('rfp-new-pricing-toggle')).toBeChecked();
    expect(screen.getByTestId('rfp-new-pricing-option-opt-full-set')).toBeInTheDocument();
  });

  it('save as template stores the content only; a saved template applies over the draft', async () => {
    const dispatch = vi.spyOn(mockDataService.commands, 'dispatch');
    renderWizard();
    fillScope();
    fireEvent.change(scope(), { target: { value: '  scoped  ' } });
    fireEvent.change(currency(), { target: { value: 'EUR' } });
    fireEvent.change(tcText(), { target: { value: ' tc words ' } });
    fireEvent.click(screen.getByTestId('rfp-new-confidential'));
    fireEvent.change(screen.getByLabelText('Confidentiality terms (optional)'), {
      target: { value: ' hush ' }
    });
    next();
    await screen.findByTestId('rfp-new-term-paymentTerms');
    pickTerm('paymentTerms', PAY, ' 60 ');
    for (let i = 0; i < 3; i++) next();
    fireEvent.click(await screen.findByTestId('rfp-new-invitee-row-sup-007'));
    next();
    next();
    await screen.findByTestId('rfp-new-review');
    expect(screen.getByLabelText('Save as a template')).toHaveValue('Pinned RFP');
    fireEvent.change(screen.getByLabelText('Save as a template'), {
      target: { value: 'RFP tpl' }
    });
    fireEvent.click(screen.getByTestId('rfp-new-template-save'));
    expect(toasts()).toMatch(/Template "RFP tpl" saved in this browser/);
    expect(dispatch).not.toHaveBeenCalled();
    const saved = rfpTemplateStore.readState().templates;
    expect(saved).toHaveLength(1);
    expect(saved[0].content).toEqual({
      familyId: 'packaging',
      scope: 'scoped',
      currency: 'EUR',
      terms: [{ termId: 'paymentTerms', requestedValue: '60' }],
      questions: [],
      customSections: [],
      confidential: true,
      confidentialityTerms: 'hush',
      termsText: 'tc words'
    });

    for (let i = 0; i < 6; i++) back();
    fireEvent.change(family(), { target: { value: 'rawMaterial' } });
    fireEvent.change(currency(), { target: { value: 'IDR' } });
    fireEvent.change(scope(), { target: { value: 'changed' } });
    fireEvent.change(tcText(), { target: { value: 'changed tc' } });
    applyStart('RFP tpl');
    expect(title()).toHaveValue('Pinned RFP');
    expect(deadline()).toHaveValue(dayFromNow(21));
    expect(family()).toHaveValue('packaging');
    expect(currency()).toHaveValue('EUR');
    expect(scope()).toHaveValue('scoped');
    expect(tcText()).toHaveValue('tc words');
    expect(screen.getByLabelText('Confidentiality terms (optional)')).toHaveValue('hush');
    next();
    expect(valueBox('paymentTerms', PAY)).toHaveValue('60');
    for (let i = 0; i < 3; i++) next();
    await screen.findByTestId('rfp-new-invitee-row-sup-007');
    expect(nextBtn()).toBeEnabled(); // invitees are not template content
  });
});

/** The scope the pre-fill composes, for the payload pin. */
function scope_(/** @type {ReturnType<typeof prefillOf>} */ prefill) {
  const notes = prefill.scopeNoteKeys.map((k) => `- ${authored(i18n.t, k)}`).join('\n');
  return `${prefill.scope}\n\nScope notes from the information request:\n${notes}`;
}

// ─── SUBMIT ──────────────────────────────────────────────────────────────────

describe('RFP wizard states — the review and the two acts', () => {
  it('Send dispatches the exact create payload, then publish, toasts and hands the id up', async () => {
    const dispatch = vi.spyOn(mockDataService.commands, 'dispatch');
    const onCreated = vi.fn();
    renderWizard({ onCreated });
    await walkToReview();
    expect(heading()).toBe('Before it leaves');
    expect(screen.getByTestId('rfp-new-save-draft')).toHaveTextContent('Save draft');
    expect(screen.queryByTestId('rfp-new-cannot-send')).not.toBeInTheDocument();
    expect(screen.getByTestId('rfp-new-review-pricing')).toHaveTextContent('—');
    expect(screen.getByTestId('rfp-new-review')).toHaveTextContent('None');
    fireEvent.click(screen.getByRole('button', { name: 'Send to suppliers' }));
    await waitFor(() => expect(onCreated).toHaveBeenCalledWith('rfp-0005'));
    const calls = dispatched(dispatch);
    expect(calls.map((c) => c.transitionId)).toEqual(['t_rfp_create', 't_rfp_publish']);
    expect(calls[0].payload).toEqual({
      title: 'Pinned RFP',
      scope: '',
      materialCategory: 'Packaging',
      responseDeadline: dayFromNow(21),
      currency: 'IDR',
      invitedSupplierIds: ['sup-007'],
      terms: [
        { termId: 'paymentTerms', requestedValue: '60' },
        { termId: 'leadTime', requestedValue: '21' }
      ]
    });
    expect(calls[1]).toMatchObject({ entityId: 'rfp-0005', payload: {} });
    expect(toasts()).toMatch(/Sent to the invited suppliers/);
  });

  it('Save draft: create only, every optional field in its slot, values trimmed', async () => {
    const dispatch = vi.spyOn(mockDataService.commands, 'dispatch');
    const onCreated = vi.fn();
    renderWizard({ onCreated });
    fillScope();
    fireEvent.change(title(), { target: { value: '  Spaced  ' } });
    fireEvent.change(scope(), { target: { value: ' scope words ' } });
    fireEvent.change(currency(), { target: { value: 'USD' } });
    fireEvent.change(tcText(), { target: { value: '  tc  ' } });
    fireEvent.click(screen.getByTestId('rfp-new-confidential'));
    next();
    await screen.findByTestId('rfp-new-term-paymentTerms');
    pickTerm('paymentTerms', PAY, '60');
    next();
    next();
    next();
    fireEvent.click(await screen.findByTestId('rfp-new-invitee-row-sup-007'));
    next();
    fireEvent.click(screen.getByTestId('rfp-new-doc-add'));
    fireEvent.change(screen.getByTestId('rfp-new-doc-doc-1-name'), { target: { value: 'COA' } });
    next();
    await screen.findByTestId('rfp-new-review');
    fireEvent.click(screen.getByTestId('rfp-new-save-draft'));
    await waitFor(() => expect(onCreated).toHaveBeenCalledWith('rfp-0005'));
    const calls = dispatched(dispatch);
    expect(calls.map((c) => c.transitionId)).toEqual(['t_rfp_create']);
    expect(calls[0].payload).toEqual({
      title: 'Spaced',
      scope: 'scope words',
      materialCategory: 'Packaging',
      responseDeadline: dayFromNow(21),
      currency: 'USD',
      invitedSupplierIds: ['sup-007'],
      terms: [{ termId: 'paymentTerms', requestedValue: '60' }],
      documentRequests: [{ id: 'doc-1', name: 'COA', type: 'other', required: false }],
      confidentiality: {},
      termsDocument: { text: 'tc' }
    });
    expect(toasts()).toMatch(/Saved as a draft\. Suppliers cannot see it yet\./);
  });

  it('T&C of whitespace only is no T&C: none on the review, none in the payload', async () => {
    const dispatch = vi.spyOn(mockDataService.commands, 'dispatch');
    renderWizard();
    fireEvent.change(tcText(), { target: { value: '   ' } });
    await walkToReview();
    expect(screen.getByTestId('rfp-new-review')).toHaveTextContent('None');
    fireEvent.click(screen.getByTestId('rfp-new-save-draft'));
    await waitFor(() => expect(dispatched(dispatch)).toHaveLength(1));
    expect(dispatched(dispatch)[0].payload).not.toHaveProperty('termsDocument');
  });

  it('a past copy with pricing and custom terms sends them as copied', async () => {
    const dispatch = vi.spyOn(mockDataService.commands, 'dispatch');
    const source = /** @type {RfpEvent} */ (rfpEventStore.get('rfp-002'));
    renderWizard();
    applyStart('RFP-2026-002 · Tundra — open-spec bottle and pump');
    fireEvent.change(deadline(), { target: { value: dayFromNow(9) } });
    for (let i = 0; i < 6; i++) next();
    fireEvent.click(await screen.findByTestId('rfp-new-save-draft'));
    await waitFor(() => expect(dispatched(dispatch)).toHaveLength(1));
    expect(dispatched(dispatch)[0].payload).toEqual({
      title: source.title,
      scope: source.scope.trim(),
      materialCategory: 'Packaging',
      responseDeadline: dayFromNow(9),
      currency: 'IDR',
      invitedSupplierIds: ['sup-007', 'sup-015'],
      terms: source.terms,
      pricing: source.pricing,
      attachments: source.attachments
    });
  });

  it('a refused create toasts the refusal and hands nothing up', async () => {
    const onCreated = vi.fn();
    const onCancel = vi.fn();
    renderWizard({ onCreated, onCancel });
    vi.spyOn(mockDataService.commands, 'dispatch').mockResolvedValue(
      /** @type {never} */ ({ status: 'failed', reason: 'NOPE: refused for the pin' })
    );
    await walkToReview();
    fireEvent.click(screen.getByTestId('rfp-new-save-draft'));
    await waitFor(() => expect(toasts()).toMatch(/Refused: NOPE: refused for the pin/));
    expect(onCreated).not.toHaveBeenCalled();
    expect(onCancel).not.toHaveBeenCalled();
  });

  it('a seat that cannot send: Send disabled, the note shown, Save draft still works', async () => {
    const onCreated = vi.fn();
    renderWizard({ canPublish: false, onCreated });
    await walkToReview();
    expect(screen.getByRole('button', { name: 'Send to suppliers' })).toBeDisabled();
    expect(screen.getByTestId('rfp-new-cannot-send')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('rfp-new-save-draft'));
    await waitFor(() => expect(onCreated).toHaveBeenCalledWith('rfp-0005'));
  });

  it('Cancel calls onCancel and dispatches nothing; a remount starts blank', async () => {
    const dispatch = vi.spyOn(mockDataService.commands, 'dispatch');
    const onCancel = vi.fn();
    const { unmount } = renderWizard({ onCancel });
    fillScope();
    next();
    await screen.findByTestId('rfp-new-term-paymentTerms');
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(dispatch).not.toHaveBeenCalled();
    unmount();
    renderWizard();
    expect(title()).toHaveValue('');
    expect(deadline()).toHaveValue('');
    expect(nextBtn()).toBeDisabled();
  });
});

// ─── EDIT A DRAFT ────────────────────────────────────────────────────────────

describe('RFP wizard states — editing a Draft', () => {
  const editing = () => /** @type {RfpEvent} */ (rfpEventStore.get('rfp-004'));

  it('opens on the stored fields, with the edit banner and no start-from', async () => {
    renderWizard({ editing: editing() });
    expect(screen.getByTestId('rfp-edit-banner')).toHaveTextContent('Editing draft RFP-2026-004');
    expect(screen.queryByTestId('rfp-new-start')).not.toBeInTheDocument();
    expect(title()).toHaveValue('Redwood 2.0 — mold tooling terms');
    expect(family()).toHaveValue('packaging');
    expect(deadline()).toHaveValue('2026-09-13');
    expect(scope()).toHaveValue(editing().scope);
    expect(nextBtn()).toBeEnabled();
    next();
    await screen.findByTestId('rfp-new-term-paymentTerms');
    expect(valueBox('paymentTerms', PAY)).toHaveValue('60');
    expect(valueBox('leadTime', LEAD)).toHaveValue('45');
  });

  it('Save changes revises it with the exact payload (the purchasing group carried)', async () => {
    const dispatch = vi.spyOn(mockDataService.commands, 'dispatch');
    const onCreated = vi.fn();
    const e = editing();
    renderWizard({ editing: e, onCreated });
    fireEvent.change(title(), { target: { value: 'Renamed RFP' } });
    for (let i = 0; i < 6; i++) next();
    await screen.findByTestId('rfp-new-review');
    expect(screen.getByTestId('rfp-new-save-draft')).toHaveTextContent('Save changes');
    expect(screen.getByRole('button', { name: 'Save and send' })).toBeEnabled();
    fireEvent.click(screen.getByTestId('rfp-new-save-draft'));
    await waitFor(() => expect(onCreated).toHaveBeenCalledWith('rfp-004'));
    const calls = dispatched(dispatch);
    expect(calls.map((c) => c.transitionId)).toEqual(['t_rfp_revise_draft']);
    expect(calls[0].entityId).toBe('rfp-004');
    expect(calls[0].payload).toEqual({
      title: 'Renamed RFP',
      scope: e.scope.trim(),
      materialCategory: 'Packaging',
      purchasingGroup: '104',
      responseDeadline: '2026-09-13',
      currency: 'IDR',
      invitedSupplierIds: ['sup-007', 'sup-013'],
      terms: e.terms
    });
    expect(toasts()).toMatch(/Draft saved\. Suppliers still see nothing of it\./);
  });

  it('Save and send revises, then publishes, and says so', async () => {
    const dispatch = vi.spyOn(mockDataService.commands, 'dispatch');
    const onCreated = vi.fn();
    renderWizard({ editing: editing(), onCreated });
    for (let i = 0; i < 6; i++) next();
    await screen.findByTestId('rfp-new-review');
    fireEvent.click(screen.getByRole('button', { name: 'Save and send' }));
    await waitFor(() => expect(onCreated).toHaveBeenCalledWith('rfp-004'));
    expect(dispatched(dispatch).map((c) => c.transitionId)).toEqual([
      't_rfp_revise_draft',
      't_rfp_publish'
    ]);
    expect(toasts()).toMatch(/Changes saved and sent to the invited suppliers\./);
  });
});
