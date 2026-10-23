// ─────────────────────────────────────────────────────────────────────────────
// RfiCreateWizard — EVERY FORM STATE, PINNED BEFORE THE REACT-HOOK-FORM
// CONVERSION (frontend-standard "Forms", PAGE-SPLIT-GUIDE; the
// `GRInspectionWizard.formStates.test.jsx` precedent).
//
// Converting a form is not a pure move, so this file was written and run green
// against the `useState` wizard FIRST, and it must pass unchanged after the
// draft moves into `useForm`. It drives the real component only through what a
// buyer can see and do — labels, test ids, buttons, the dispatched commands —
// and never reaches into the draft, so it cannot tell which state library
// holds it.
//
// What it pins:
//   · each step's fields and their defaults;
//   · when a refusal shows and when it does not (the deadline waits for blur);
//   · Next / Back / Send / Save draft enablement per step;
//   · values surviving Back / Next;
//   · the family re-seeding the questions, and the three start-from paths;
//   · the exact create / revise payloads, the publish follow-up, the toasts;
//   · edit mode, a seat that cannot send, Cancel, save-as-template content.
//
// The page-level specs (`RfiCreate.test.jsx`, `RfxEditDraft.test.jsx`,
// `RfxAuthoring.test.jsx`) already pin the round trips through the board and
// the supplier's side; they are not repeated here.
// ─────────────────────────────────────────────────────────────────────────────
/** @import React from 'react' */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { renderWithProviders, BUYER } from '@test/test-utils';
/** @import { CurrentIdentity } from '@context/CurrentIdentityContext' */
import { SEEDED_SEAT_ROLES } from '@services/transitions/businessRoles';
import { resetRfxStores, rfiEventStore } from '@services/data/mock/stores/rfxStores';
import { rfiEventViews } from '@services/data/mock/rfxReadModel';
import { mockDataService } from '@services/data/mock/mockDataService';
import { sdcClock } from '@services/sdc';
import { rfiTemplate } from '@services/sourcing/rfxConfig';
import { rfiTemplateStore } from '@services/sourcing/rfxTemplates';
import { useToast } from '@hooks/useToast';
import { rfxNow } from './rfxDisplay';
import RfiCreateWizard from './RfiCreateWizard';

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

/**
 * A date N days after the simulated clock, as the date input wants it.
 * @param {number} days
 */
const dayFromNow = (days) =>
  new Date(Date.parse(rfxNow()) + days * 86_400_000).toISOString().slice(0, 10);

const PACKAGING_QUESTIONS = /** @type {NonNullable<ReturnType<typeof rfiTemplate>>} */ (
  rfiTemplate('packaging')
).questions;
const RAW_QUESTIONS = /** @type {NonNullable<ReturnType<typeof rfiTemplate>>} */ (
  rfiTemplate('rawMaterial')
).questions;

/**
 * @typedef {object} RenderOpts
 * @property {boolean} [canPublish]
 * @property {import('@services/sourcing/types').RfiEvent} [editing]
 * @property {readonly import('@services/sourcing/types').RfiEvent[]} [pastEvents]
 * @property {() => void} [onCancel]
 * @property {(id: string) => void} [onCreated]
 * @property {CurrentIdentity} [identity]
 */

/** @param {RenderOpts} [o] */
const renderWizard = (o = {}) =>
  renderWithProviders(
    <>
      <RfiCreateWizard
        onCancel={o.onCancel ?? (() => {})}
        onCreated={o.onCreated ?? (() => {})}
        canPublish={o.canPublish ?? true}
        pastEvents={o.pastEvents ?? rfiEventViews(rfxNow(), null)}
        {...(o.editing ? { editing: o.editing } : {})}
      />
      <ToastSpy />
    </>,
    { identity: o.identity ?? BUYER_SEAT }
  );

const nextBtn = () => screen.getByRole('button', { name: 'Next' });
const backBtn = () => screen.getByRole('button', { name: 'Back' });
const next = () => fireEvent.click(nextBtn());
const back = () => fireEvent.click(backBtn());
const heading = () => screen.getByRole('heading', { level: 2 }).textContent;
const title = () => /** @type {HTMLInputElement} */ (screen.getByLabelText('Title'));
const family = () => /** @type {HTMLSelectElement} */ (screen.getByTestId('rfi-new-family'));
const description = () => screen.getByLabelText('Short description');
const deadline = () => screen.getByLabelText('Response deadline');

/** @param {string} deadlineValue */
const fillScope = (deadlineValue = dayFromNow(14)) => {
  fireEvent.change(title(), { target: { value: 'Pinned RFI' } });
  fireEvent.change(family(), { target: { value: 'packaging' } });
  fireEvent.change(deadline(), { target: { value: deadlineValue } });
};

/** Scope → Questions → Invitees (sup-007) → Documents → Review. */
const walkToReview = async () => {
  fillScope();
  next();
  await screen.findByTestId('rfi-new-question-a-categories');
  next();
  fireEvent.click(await screen.findByTestId('rfi-new-invitee-row-sup-007'));
  next();
  next();
  await screen.findByTestId('rfi-new-review');
};

/** @param {import('vitest').MockInstance} spy */
const dispatched = (spy) =>
  spy.mock.calls.map(
    (c) =>
      /** @type {{ transitionId: string; entityId?: string; payload: Record<string, unknown> }} */ (
        c[1]
      )
  );

/**
 * Pick a start-from option by its visible label and apply it.
 * @param {string | RegExp} label
 */
const applyStart = (label) => {
  const pick = screen.getByTestId('rfi-new-start-pick');
  const option = /** @type {HTMLOptionElement} */ (
    within(pick).getByRole('option', { name: label })
  );
  fireEvent.change(pick, { target: { value: option.value } });
  fireEvent.click(screen.getByTestId('rfi-new-start-apply'));
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

describe('RFI wizard states — step 1, the scope', () => {
  it('opens on its defaults: every field blank, start-from shown, Back and Next disabled', () => {
    renderWizard();
    expect(heading()).toBe('What the request is about');
    expect(title()).toHaveValue('');
    expect(title()).toHaveAttribute('placeholder');
    expect(family()).toHaveValue('');
    // Only the families that carry a template are offered.
    expect([...family().options].map((o) => o.value)).toEqual(['', 'packaging', 'rawMaterial']);
    expect(description()).toHaveValue('');
    expect(deadline()).toHaveValue('');
    expect(deadline()).toHaveAttribute('type', 'date');
    expect(screen.getByTestId('rfi-new-confidential')).not.toBeChecked();
    expect(screen.queryByLabelText('Confidentiality terms (optional)')).not.toBeInTheDocument();
    expect(screen.getByTestId('rfi-new-start')).toBeInTheDocument();
    expect(screen.queryByTestId('rfi-edit-banner')).not.toBeInTheDocument();
    expect(screen.queryByTestId('rfi-new-template')).not.toBeInTheDocument();
    expect(screen.queryByTestId('rfi-new-deadline-refusal')).not.toBeInTheDocument();
    expect(screen.queryByTestId('rfi-new-attachments-row')).not.toBeInTheDocument();
    expect(backBtn()).toBeDisabled();
    expect(nextBtn()).toBeDisabled();
  });

  it('Next needs a non-blank title, a family and a future deadline — each one alone is not enough', () => {
    renderWizard();
    fireEvent.change(title(), { target: { value: '   ' } });
    fireEvent.change(family(), { target: { value: 'packaging' } });
    fireEvent.change(deadline(), { target: { value: dayFromNow(14) } });
    expect(nextBtn()).toBeDisabled(); // whitespace title
    fireEvent.change(title(), { target: { value: 'A title' } });
    expect(nextBtn()).toBeEnabled();
    fireEvent.change(family(), { target: { value: '' } });
    expect(nextBtn()).toBeDisabled(); // no family
    fireEvent.change(family(), { target: { value: 'rawMaterial' } });
    expect(nextBtn()).toBeEnabled();
    fireEvent.change(deadline(), { target: { value: '' } });
    expect(nextBtn()).toBeDisabled(); // no deadline
  });

  it('the deadline: past refuses (shown only after blur), today is still open, future passes', () => {
    renderWizard();
    fireEvent.change(title(), { target: { value: 'A title' } });
    fireEvent.change(family(), { target: { value: 'packaging' } });
    fireEvent.change(deadline(), { target: { value: dayFromNow(-1) } });
    expect(nextBtn()).toBeDisabled();
    // Not left yet: no refusal.
    expect(screen.queryByTestId('rfi-new-deadline-refusal')).not.toBeInTheDocument();
    fireEvent.blur(deadline());
    expect(screen.getByTestId('rfi-new-deadline-refusal')).toHaveTextContent(
      'The response deadline must be a date in the future.'
    );
    // Today (end of the deadline day) is not past.
    fireEvent.change(deadline(), { target: { value: rfxNow().slice(0, 10) } });
    expect(nextBtn()).toBeEnabled();
    expect(screen.queryByTestId('rfi-new-deadline-refusal')).not.toBeInTheDocument();
    // Once touched, a cleared date refuses at once.
    fireEvent.change(deadline(), { target: { value: '' } });
    expect(screen.getByTestId('rfi-new-deadline-refusal')).toBeInTheDocument();
    expect(nextBtn()).toBeDisabled();
  });

  it('a blank deadline left (blurred) without a value shows the refusal', () => {
    renderWizard();
    fireEvent.blur(deadline());
    expect(screen.getByTestId('rfi-new-deadline-refusal')).toBeInTheDocument();
  });

  it('choosing a family names its template and seeds its questions; changing it re-seeds', async () => {
    renderWizard();
    fireEvent.change(family(), { target: { value: 'packaging' } });
    expect(screen.getByTestId('rfi-new-template')).toHaveTextContent('Template:');
    fireEvent.change(title(), { target: { value: 'A title' } });
    fireEvent.change(deadline(), { target: { value: dayFromNow(5) } });
    next();
    await screen.findByTestId('rfi-new-question-a-process-packaging');
    // Remove one; back; change the family: the list is the new template's, whole.
    fireEvent.click(screen.getByTestId('rfi-new-remove-a-categories'));
    expect(screen.queryByTestId('rfi-new-question-a-categories')).not.toBeInTheDocument();
    back();
    fireEvent.change(family(), { target: { value: 'rawMaterial' } });
    next();
    await screen.findByTestId('rfi-new-question-a-process-raw');
    expect(screen.getByTestId('rfi-new-question-a-categories')).toBeInTheDocument();
    expect(screen.queryByTestId('rfi-new-question-a-process-packaging')).not.toBeInTheDocument();
    // Re-choosing the SAME family also re-seeds (the removed question returns).
    fireEvent.click(screen.getByTestId('rfi-new-remove-a-categories'));
    back();
    fireEvent.change(family(), { target: { value: 'packaging' } });
    fireEvent.change(family(), { target: { value: 'rawMaterial' } });
    next();
    expect(await screen.findByTestId('rfi-new-question-a-categories')).toBeInTheDocument();
  });

  it('confidentiality: ticking shows the terms box (blank, with a placeholder); unticking hides it', () => {
    renderWizard();
    fireEvent.click(screen.getByTestId('rfi-new-confidential'));
    const terms = screen.getByLabelText('Confidentiality terms (optional)');
    expect(terms).toHaveValue('');
    expect(terms).toHaveAttribute('placeholder');
    fireEvent.change(terms, { target: { value: 'NDA' } });
    fireEvent.click(screen.getByTestId('rfi-new-confidential'));
    expect(screen.queryByLabelText('Confidentiality terms (optional)')).not.toBeInTheDocument();
    // The typed terms survive the untick.
    fireEvent.click(screen.getByTestId('rfi-new-confidential'));
    expect(screen.getByLabelText('Confidentiality terms (optional)')).toHaveValue('NDA');
  });
});

// ─── STEPS 2–4 ───────────────────────────────────────────────────────────────

describe('RFI wizard states — questions, invitees, documents', () => {
  it('no question left ⇒ the refusal shows and Next is disabled; adding one back unblocks it', async () => {
    renderWizard();
    fillScope();
    next();
    await screen.findByTestId('rfi-new-question-a-categories');
    expect(heading()).toBe('What it asks');
    expect(screen.queryByTestId('rfi-new-no-questions')).not.toBeInTheDocument();
    expect(nextBtn()).toBeEnabled();
    for (const q of PACKAGING_QUESTIONS)
      fireEvent.click(screen.getByTestId(`rfi-new-remove-${q.id}`));
    expect(screen.getByTestId('rfi-new-no-questions')).toHaveTextContent(
      'An information request asks at least one question.'
    );
    expect(nextBtn()).toBeDisabled();
    expect(backBtn()).toBeEnabled();
  });

  it('no invitee ⇒ Next disabled; ticking one enables it; unticking disables it again', async () => {
    renderWizard();
    fillScope();
    next();
    next();
    const row = await screen.findByTestId('rfi-new-invitee-row-sup-007');
    expect(heading()).toBe('Who is asked');
    expect(nextBtn()).toBeDisabled();
    fireEvent.click(row);
    expect(nextBtn()).toBeEnabled();
    fireEvent.click(screen.getByTestId('rfi-new-invitee-row-sup-007'));
    expect(nextBtn()).toBeDisabled();
  });

  it('the documents step is optional, and a nameless request blocks it', async () => {
    renderWizard();
    fillScope();
    next();
    next();
    fireEvent.click(await screen.findByTestId('rfi-new-invitee-row-sup-007'));
    next();
    expect(heading()).toBe('Documents from suppliers');
    expect(screen.getByTestId('rfi-new-docs-empty')).toBeInTheDocument();
    expect(nextBtn()).toBeEnabled();
    fireEvent.click(screen.getByTestId('rfi-new-doc-add'));
    expect(nextBtn()).toBeDisabled();
    fireEvent.change(screen.getByTestId('rfi-new-doc-doc-1-name'), {
      target: { value: 'COA' }
    });
    expect(nextBtn()).toBeEnabled();
  });

  it('every value survives Back and Next across the steps', async () => {
    renderWizard();
    fillScope();
    fireEvent.change(description(), { target: { value: 'what we need' } });
    fireEvent.click(screen.getByTestId('rfi-new-confidential'));
    fireEvent.change(screen.getByLabelText('Confidentiality terms (optional)'), {
      target: { value: 'NDA terms' }
    });
    next();
    await screen.findByTestId('rfi-new-question-a-categories');
    fireEvent.click(screen.getByTestId('rfi-new-remove-a-categories'));
    next();
    fireEvent.click(await screen.findByTestId('rfi-new-invitee-row-sup-007'));
    next();
    fireEvent.click(screen.getByTestId('rfi-new-doc-add'));
    fireEvent.change(screen.getByTestId('rfi-new-doc-doc-1-name'), { target: { value: 'COA' } });

    back();
    back();
    back();
    back();
    expect(heading()).toBe('What the request is about');
    expect(title()).toHaveValue('Pinned RFI');
    expect(family()).toHaveValue('packaging');
    expect(description()).toHaveValue('what we need');
    expect(deadline()).toHaveValue(dayFromNow(14));
    expect(screen.getByTestId('rfi-new-confidential')).toBeChecked();
    expect(screen.getByLabelText('Confidentiality terms (optional)')).toHaveValue('NDA terms');
    next();
    await screen.findByTestId('rfi-new-question-a-process-packaging');
    expect(screen.queryByTestId('rfi-new-question-a-categories')).not.toBeInTheDocument();
    next();
    await screen.findByTestId('rfi-new-invitee-row-sup-007');
    expect(nextBtn()).toBeEnabled(); // still ticked
    next();
    expect(screen.getByTestId('rfi-new-doc-doc-1-name')).toHaveValue('COA');
    next();
    const review = await screen.findByTestId('rfi-new-review');
    expect(review).toHaveTextContent('Pinned RFI');
    expect(review).toHaveTextContent('what we need');
    expect(review).toHaveTextContent(`${PACKAGING_QUESTIONS.length - 1} questions`);
    expect(screen.getByTestId('rfi-new-review-confidential')).toHaveTextContent(
      'Yes, suppliers accept first'
    );
    expect(screen.getByTestId('rfi-new-review-attachments')).toHaveTextContent('0 documents');
    expect(screen.getByTestId('rfi-new-review-doc-doc-1')).toHaveTextContent('COA');
  });
});

// ─── START FROM ──────────────────────────────────────────────────────────────

describe('RFI wizard states — start from a template or a past event', () => {
  it('a system template sets the family and its questions, and keeps the typed title', async () => {
    renderWizard();
    fireEvent.change(title(), { target: { value: 'Kept title' } });
    fireEvent.change(description(), { target: { value: 'kept description' } });
    applyStart(/Raw/i);
    expect(family()).toHaveValue('rawMaterial');
    expect(title()).toHaveValue('Kept title');
    expect(description()).toHaveValue('kept description');
    fireEvent.change(deadline(), { target: { value: dayFromNow(3) } });
    next();
    expect(await screen.findByTestId('rfi-new-question-e-gmp22716')).toBeInTheDocument();
    expect(screen.getAllByTestId(/^rfi-new-question-/)).toHaveLength(RAW_QUESTIONS.length);
  });

  it('a past event is COPIED: content and invitees, never its date; the typed title is replaced', async () => {
    renderWizard();
    fireEvent.change(title(), { target: { value: 'Typed, then replaced' } });
    fireEvent.change(deadline(), { target: { value: dayFromNow(9) } });
    applyStart('RFI-2026-002 · Oslo sticker capability — variant labels 2027');
    expect(title()).toHaveValue('Oslo sticker capability — variant labels 2027');
    expect(family()).toHaveValue('packaging');
    expect(description()).toHaveValue(
      'PTI is preparing 8 variant stickers for the Oslo range and wants to know which label converters can print, finish and supply them on rolls.'
    );
    expect(deadline()).toHaveValue('');
    expect(nextBtn()).toBeDisabled();
    expect(screen.getAllByTestId('rfi-new-attachments-row')).toHaveLength(1);
    fireEvent.change(deadline(), { target: { value: dayFromNow(9) } });
    next();
    expect(await screen.findByTestId('rfi-new-section-custom-printing')).toBeInTheDocument();
    expect(screen.getAllByTestId(/^rfi-new-question-/)).toHaveLength(11);
    next();
    await screen.findByTestId('rfi-new-invitee-row-sup-007');
    expect(nextBtn()).toBeEnabled(); // sup-007 and sup-008 arrive invited
  });

  it('save as template stores the content only; a saved template then applies it', async () => {
    const dispatch = vi.spyOn(mockDataService.commands, 'dispatch');
    renderWizard();
    fillScope();
    fireEvent.change(description(), { target: { value: '  a described need  ' } });
    fireEvent.click(screen.getByTestId('rfi-new-confidential'));
    fireEvent.change(screen.getByLabelText('Confidentiality terms (optional)'), {
      target: { value: '  keep it quiet ' }
    });
    next();
    await screen.findByTestId('rfi-new-question-a-categories');
    for (const q of PACKAGING_QUESTIONS.slice(1)) {
      fireEvent.click(screen.getByTestId(`rfi-new-remove-${q.id}`));
    }
    next();
    fireEvent.click(await screen.findByTestId('rfi-new-invitee-row-sup-007'));
    next();
    next();
    await screen.findByTestId('rfi-new-review');
    // The template name defaults to the title.
    const name = screen.getByLabelText('Save as a template');
    expect(name).toHaveValue('Pinned RFI');
    fireEvent.change(name, { target: { value: 'My pinned template' } });
    fireEvent.click(screen.getByTestId('rfi-new-template-save'));
    expect(toasts()).toMatch(/Template "My pinned template" saved in this browser/);
    expect(dispatch).not.toHaveBeenCalled();

    const saved = rfiTemplateStore.readState().templates;
    expect(saved).toHaveLength(1);
    expect(saved[0].name).toBe('My pinned template');
    expect(saved[0].content).toEqual({
      familyId: 'packaging',
      description: 'a described need',
      questions: [PACKAGING_QUESTIONS[0]],
      customSections: [],
      confidential: true,
      confidentialityTerms: 'keep it quiet'
    });

    // Back on step 1: the saved template is offered and applies over the draft.
    for (let i = 0; i < 4; i++) back();
    fireEvent.change(family(), { target: { value: 'rawMaterial' } });
    fireEvent.click(screen.getByTestId('rfi-new-confidential'));
    fireEvent.change(description(), { target: { value: 'changed' } });
    applyStart('My pinned template');
    expect(family()).toHaveValue('packaging');
    expect(description()).toHaveValue('a described need');
    expect(title()).toHaveValue('Pinned RFI');
    expect(screen.getByTestId('rfi-new-confidential')).toBeChecked();
    expect(screen.getByLabelText('Confidentiality terms (optional)')).toHaveValue('keep it quiet');
    next();
    await screen.findByTestId('rfi-new-question-a-categories');
    expect(screen.getAllByTestId(/^rfi-new-question-/)).toHaveLength(1);
  });

  it('a saved template without a description keeps the typed one', async () => {
    rfiTemplateStore.save(
      'No description',
      {
        familyId: 'rawMaterial',
        questions: [RAW_QUESTIONS[0]],
        customSections: [],
        confidential: false
      },
      rfxNow()
    );
    renderWizard();
    fireEvent.change(description(), { target: { value: 'typed' } });
    applyStart('No description');
    expect(description()).toHaveValue('typed');
    expect(family()).toHaveValue('rawMaterial');
  });
});

// ─── SUBMIT ──────────────────────────────────────────────────────────────────

describe('RFI wizard states — the review and the two acts', () => {
  it('Send dispatches the exact create payload, then publish, toasts and hands the id up', async () => {
    const dispatch = vi.spyOn(mockDataService.commands, 'dispatch');
    const onCreated = vi.fn();
    renderWizard({ onCreated });
    await walkToReview();
    expect(heading()).toBe('Before it leaves');
    expect(screen.getByRole('button', { name: 'Send to suppliers' })).toBeEnabled();
    expect(screen.getByTestId('rfi-new-save-draft')).toHaveTextContent('Save draft');
    expect(screen.queryByTestId('rfi-new-cannot-send')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Send to suppliers' }));
    await waitFor(() => expect(onCreated).toHaveBeenCalledTimes(1));
    const calls = dispatched(dispatch);
    expect(calls.map((c) => c.transitionId)).toEqual(['t_rfi_create', 't_rfi_publish']);
    expect(calls[0].payload).toEqual({
      title: 'Pinned RFI',
      templateId: 'packaging',
      materialCategory: 'Packaging',
      responseDeadline: dayFromNow(14),
      invitedSupplierIds: ['sup-007'],
      questions: PACKAGING_QUESTIONS
    });
    expect(calls[1]).toMatchObject({ entityId: 'rfi-0004', payload: {} });
    expect(onCreated).toHaveBeenCalledWith('rfi-0004');
    expect(toasts()).toMatch(/Sent to the invited suppliers/);
  });

  it('Save draft dispatches create only, with every optional field trimmed into place', async () => {
    const dispatch = vi.spyOn(mockDataService.commands, 'dispatch');
    const onCreated = vi.fn();
    renderWizard({ onCreated });
    fillScope();
    fireEvent.change(title(), { target: { value: '  Spaced title  ' } });
    fireEvent.change(description(), { target: { value: '  spaced description ' } });
    fireEvent.click(screen.getByTestId('rfi-new-confidential'));
    fireEvent.change(screen.getByLabelText('Confidentiality terms (optional)'), {
      target: { value: '  NDA  ' }
    });
    next();
    await screen.findByTestId('rfi-new-question-a-categories');
    next();
    fireEvent.click(await screen.findByTestId('rfi-new-invitee-row-sup-013'));
    fireEvent.click(screen.getByTestId('rfi-new-invitee-row-sup-007'));
    next();
    fireEvent.click(screen.getByTestId('rfi-new-doc-add'));
    fireEvent.change(screen.getByTestId('rfi-new-doc-doc-1-name'), { target: { value: 'COA' } });
    next();
    await screen.findByTestId('rfi-new-review');
    fireEvent.click(screen.getByTestId('rfi-new-save-draft'));
    await waitFor(() => expect(onCreated).toHaveBeenCalledWith('rfi-0004'));
    const calls = dispatched(dispatch);
    expect(calls.map((c) => c.transitionId)).toEqual(['t_rfi_create']);
    expect(calls[0].payload).toEqual({
      title: 'Spaced title',
      description: 'spaced description',
      templateId: 'packaging',
      materialCategory: 'Packaging',
      responseDeadline: dayFromNow(14),
      invitedSupplierIds: ['sup-013', 'sup-007'],
      questions: PACKAGING_QUESTIONS,
      documentRequests: [{ id: 'doc-1', name: 'COA', type: 'other', required: false }],
      confidentiality: { terms: 'NDA' }
    });
    expect(toasts()).toMatch(/Saved as a draft\. Suppliers cannot see it yet\./);
  });

  it('a copied past event sends its sections, files and invitees as copied', async () => {
    const dispatch = vi.spyOn(mockDataService.commands, 'dispatch');
    const source = /** @type {import('@services/sourcing/types').RfiEvent} */ (
      rfiEventStore.get('rfi-002')
    );
    renderWizard();
    applyStart('RFI-2026-002 · Oslo sticker capability — variant labels 2027');
    fireEvent.change(deadline(), { target: { value: dayFromNow(9) } });
    for (let i = 0; i < 4; i++) next();
    fireEvent.click(await screen.findByTestId('rfi-new-save-draft'));
    await waitFor(() => expect(dispatched(dispatch)).toHaveLength(1));
    expect(dispatched(dispatch)[0].payload).toEqual({
      title: source.title,
      description: source.description,
      templateId: 'packaging',
      materialCategory: 'Packaging',
      responseDeadline: dayFromNow(9),
      invitedSupplierIds: ['sup-007', 'sup-008'],
      questions: source.questions,
      customSections: source.customSections,
      attachments: source.attachments
    });
  });

  it('confidential with blank terms sends an empty confidentiality object', async () => {
    const dispatch = vi.spyOn(mockDataService.commands, 'dispatch');
    renderWizard();
    fillScope();
    fireEvent.click(screen.getByTestId('rfi-new-confidential'));
    fireEvent.change(screen.getByLabelText('Confidentiality terms (optional)'), {
      target: { value: '   ' }
    });
    next();
    await screen.findByTestId('rfi-new-question-a-categories');
    next();
    fireEvent.click(await screen.findByTestId('rfi-new-invitee-row-sup-007'));
    next();
    next();
    fireEvent.click(await screen.findByTestId('rfi-new-save-draft'));
    await waitFor(() => expect(dispatched(dispatch)).toHaveLength(1));
    expect(dispatched(dispatch)[0].payload.confidentiality).toEqual({});
  });

  it('a refused create toasts the refusal and hands nothing up', async () => {
    const onCreated = vi.fn();
    const onCancel = vi.fn();
    renderWizard({ onCreated, onCancel });
    // A deadline the verb refuses while the wizard still admits it is not
    // reachable; a second create of the same request is, so refuse at the store.
    vi.spyOn(mockDataService.commands, 'dispatch').mockResolvedValue(
      /** @type {never} */ ({ status: 'failed', reason: 'NOPE: refused for the pin' })
    );
    await walkToReview();
    fireEvent.click(screen.getByTestId('rfi-new-save-draft'));
    await waitFor(() => expect(toasts()).toMatch(/Refused: NOPE: refused for the pin/));
    expect(onCreated).not.toHaveBeenCalled();
    expect(onCancel).not.toHaveBeenCalled();
  });

  it('a seat that cannot send: Send disabled, the note shown, Save draft still works', async () => {
    const onCreated = vi.fn();
    renderWizard({ canPublish: false, onCreated });
    await walkToReview();
    expect(screen.getByRole('button', { name: 'Send to suppliers' })).toBeDisabled();
    expect(screen.getByTestId('rfi-new-cannot-send')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('rfi-new-save-draft'));
    await waitFor(() => expect(onCreated).toHaveBeenCalledWith('rfi-0004'));
  });

  it('Cancel calls onCancel and dispatches nothing', async () => {
    const dispatch = vi.spyOn(mockDataService.commands, 'dispatch');
    const onCancel = vi.fn();
    renderWizard({ onCancel });
    fillScope();
    next();
    await screen.findByTestId('rfi-new-question-a-categories');
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('a remounted wizard starts from its defaults again', async () => {
    const { unmount } = renderWizard();
    fillScope();
    unmount();
    renderWizard();
    expect(title()).toHaveValue('');
    expect(family()).toHaveValue('');
    expect(deadline()).toHaveValue('');
    expect(nextBtn()).toBeDisabled();
  });
});

// ─── EDIT A DRAFT ────────────────────────────────────────────────────────────

describe('RFI wizard states — editing a Draft', () => {
  const editing = () =>
    /** @type {import('@services/sourcing/types').RfiEvent} */ (rfiEventStore.get('rfi-003'));

  it('opens on the stored fields, with the edit banner and no start-from', () => {
    renderWizard({ editing: editing() });
    expect(screen.getByTestId('rfi-edit-banner')).toHaveTextContent('Editing draft RFI-2026-003');
    expect(screen.queryByTestId('rfi-new-start')).not.toBeInTheDocument();
    expect(title()).toHaveValue('Redwood 2.0 mold makers — capability check');
    expect(family()).toHaveValue('packaging');
    expect(deadline()).toHaveValue('2026-09-12');
    expect(description()).toHaveValue(editing().description);
    expect(nextBtn()).toBeEnabled();
  });

  it('Save changes revises it with the exact payload (the purchasing group carried)', async () => {
    const dispatch = vi.spyOn(mockDataService.commands, 'dispatch');
    const onCreated = vi.fn();
    const e = editing();
    renderWizard({ editing: e, onCreated });
    fireEvent.change(title(), { target: { value: 'Renamed draft' } });
    next();
    next();
    next();
    next();
    await screen.findByTestId('rfi-new-review');
    expect(screen.getByTestId('rfi-new-save-draft')).toHaveTextContent('Save changes');
    expect(screen.getByRole('button', { name: 'Save and send' })).toBeEnabled();
    fireEvent.click(screen.getByTestId('rfi-new-save-draft'));
    await waitFor(() => expect(onCreated).toHaveBeenCalledWith('rfi-003'));
    const calls = dispatched(dispatch);
    expect(calls.map((c) => c.transitionId)).toEqual(['t_rfi_revise_draft']);
    expect(calls[0].entityId).toBe('rfi-003');
    expect(calls[0].payload).toEqual({
      title: 'Renamed draft',
      description: e.description,
      templateId: 'packaging',
      materialCategory: 'Packaging',
      purchasingGroup: '104',
      responseDeadline: '2026-09-12',
      invitedSupplierIds: ['sup-007', 'sup-013'],
      questions: e.questions
    });
    expect(toasts()).toMatch(/Draft saved\. Suppliers still see nothing of it\./);
  });

  it('Save and send revises, then publishes, and says so', async () => {
    const dispatch = vi.spyOn(mockDataService.commands, 'dispatch');
    const onCreated = vi.fn();
    renderWizard({ editing: editing(), onCreated });
    for (let i = 0; i < 4; i++) next();
    await screen.findByTestId('rfi-new-review');
    fireEvent.click(screen.getByRole('button', { name: 'Save and send' }));
    await waitFor(() => expect(onCreated).toHaveBeenCalledWith('rfi-003'));
    expect(dispatched(dispatch).map((c) => c.transitionId)).toEqual([
      't_rfi_revise_draft',
      't_rfi_publish'
    ]);
    expect(toasts()).toMatch(/Changes saved and sent to the invited suppliers\./);
  });
});
