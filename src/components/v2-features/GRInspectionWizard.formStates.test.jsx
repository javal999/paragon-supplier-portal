// ─────────────────────────────────────────────────────────────────────────────
// GRInspectionWizard — EVERY FORM STATE, PINNED BEFORE THE REACT-HOOK-FORM
// CONVERSION (frontend-standard "Forms", PAGE-SPLIT-GUIDE).
//
// Converting a form is not a pure move, so this file was written and run green
// against the `useState` wizard FIRST, and it must pass unchanged after the
// draft moves into `useForm`. It drives the real component only through what a
// clerk can see and do — labels, roles, buttons, the dispatched commands — and
// never reaches into the draft, so it cannot tell which state library holds it.
//
// What it pins, step by step:
//   · each step's fields and their defaults;
//   · when a refusal shows and when it does not (an untouched field never nags);
//   · Next / Back / Create GR enablement;
//   · values surviving Back / Next and the source switches;
//   · the commands and payloads the final submit dispatches, the settle await,
//     and the toast each outcome speaks;
//   · a closed and reopened wizard starting from its defaults again.
//
// The specs that already pin the quantity parser, the regulatory gates, the
// certificate notice and the settle fault (`GRInspectionWizard.test.jsx`,
// `wizardSettleSpeaks.test.jsx`) are not repeated here.
// ─────────────────────────────────────────────────────────────────────────────
/** @import React from 'react' */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import { renderWithProviders } from '@test/test-utils';
import { useToast } from '@hooks/useToast';
import { mockDataService } from '@services/data/mock/mockDataService';
import { asnStore } from '@services/data/mock/stores/asnStore';
import { goodsReceiptStore } from '@services/data/mock/stores/goodsReceiptStore';
import { mockShipments } from '@data/mockShipments';
import { COMPLIANCE_REGISTRY } from '@services/data/mock/fixtures/complianceRegistry';
import { sdcClock } from '@services/sdc/clock';
import { halalOf } from '@services/sdc/halal';
import { bpomOf } from '@services/sdc/bpom';
/** @import { IDataService } from '@services/data/types' */
/** @import { EnforcementSetting } from '@lib/enforcement' */
import GRInspectionWizard from './GRInspectionWizard';
import BuyerGoodsReceipt from '@pages-v2/BuyerGoodsReceipt';

/** @type {readonly EnforcementSetting[]} */
const EMPTY_LEDGER = [];

const ELIGIBLE = mockShipments.filter(
  (s) => (s.status === 'At Dock' || s.status === 'Unloading') && s.lineItems.length > 0
);

/**
 * The dock source whose every line both regimes rule on — the only kind of
 * source a clerk can walk to the end (`wizardSettleSpeaks.test.jsx` derives it
 * the same way). Derived, never named, so a moved fixture fails loudly.
 */
const ANSWERABLE = /** @type {(typeof ELIGIBLE)[number]} */ (
  ELIGIBLE.find((s) =>
    s.lineItems.every((li) => halalOf(li.materialCode).ok && bpomOf(li.materialCode).ok)
  )
);

/** A second dock source, for the source-switch specs. */
const OTHER = /** @type {(typeof ELIGIBLE)[number]} */ (
  ELIGIBLE.find((s) => s.id !== ANSWERABLE?.id)
);

const RECEIVABLE_ASN_STATUSES = ['Submitted', 'In Transit', 'Delivered'];

/** The stored ASNs, read fresh after each `asnStore.reset()`. */
const asns = () => [...asnStore.all()];

/** A live ASN the manual lane resolves. */
const receivableAsn = () =>
  /** @type {ReturnType<typeof asns>[number]} */ (
    asns().find((a) => RECEIVABLE_ASN_STATUSES.includes(a.status) && a.lineItems.length > 0)
  );

/** A stored ASN the manual lane must NOT resolve (not receivable). */
const nonReceivableAsn = () => asns().find((a) => !RECEIVABLE_ASN_STATUSES.includes(a.status));

/** @type {React.FC} */
const ToastSpy = () => {
  const { toasts } = useToast();
  return (
    <ul data-testid="toast-spy">
      {toasts.map((t) => (
        <li key={t.id}>{`${t.title} ${t.description ?? ''}`}</li>
      ))}
    </ul>
  );
};

const toasts = () => screen.getByTestId('toast-spy').textContent ?? '';

/**
 * Swap ONLY `settle`, rebinding the rest — a plain spread loses `this`.
 * @param {() => Promise<unknown>} settle
 * @returns {IDataService}
 */
const withSettle = (settle) =>
  /** @type {IDataService} */ ({
    ...mockDataService,
    commands: new Proxy(mockDataService.commands, {
      get(target, prop) {
        if (prop === 'settle') return settle;
        const v = Reflect.get(target, prop, target);
        return typeof v === 'function'
          ? /** @type {(...a: unknown[]) => unknown} */ (v).bind(target)
          : v;
      }
    })
  });

/**
 * @typedef {object} RenderOpts
 * @property {string} [initialAsnId]
 * @property {() => void} [onClose]
 * @property {(failed?: unknown) => void} [onComplete]
 * @property {IDataService} [service]
 */

/** @param {RenderOpts} [opts] */
const renderWizard = (opts = {}) =>
  renderWithProviders(
    <>
      <ToastSpy />
      <GRInspectionWizard
        onClose={opts.onClose ?? (() => {})}
        onComplete={opts.onComplete ?? (() => {})}
        initialAsnId={opts.initialAsnId}
        shipments={mockShipments}
        asns={asns()}
        enforcementSettings={EMPTY_LEDGER}
        complianceRegistry={COMPLIANCE_REGISTRY}
      />
    </>,
    opts.service ? { service: opts.service } : undefined
  );

const next = () => screen.getByRole('button', { name: /^Next$/ });
const back = () => screen.getByRole('button', { name: /^Back$/ });
const createGr = () => screen.getByRole('button', { name: /Create GR/i });
const heading = () => screen.getByRole('heading', { level: 2 }).textContent;

/** The dock row for a source, found by its ASN number. */
const sourceRow = (/** @type {string} */ asnNumber) =>
  /** @type {HTMLElement} */ (screen.getByText(asnNumber).closest('button'));

/** @param {string} code */
const receivedInput = (code) => screen.getByLabelText(`Received quantity for ${code}`);
/** @param {string} code */
const acceptedInput = (code) => screen.getByLabelText(`Accepted quantity for ${code}`);

/** Every required regulatory radio on the quality step, answered `v`. */
const answerAllRegulatory = (/** @type {'Pass' | 'Fail'} */ v = 'Pass') => {
  for (const r of screen.queryAllByRole('radio', {
    name: new RegExp(`(Halal Seal Check|BPOM Lot Tracking) — ${v}$`)
  })) {
    fireEvent.click(r);
  }
};

/** Pick ANSWERABLE on the dock list and step to the receipt details. */
const toReceipt = async (/** @type {RenderOpts} */ opts = {}) => {
  renderWizard(opts);
  fireEvent.click(await screen.findByText(ANSWERABLE.asnNumber));
  fireEvent.click(next());
};

/** …then to the quality step. */
const toQuality = async (/** @type {RenderOpts} */ opts = {}) => {
  await toReceipt(opts);
  fireEvent.click(next());
};

/** …then answer every regulatory check and step to the disposition. */
const toDisposition = async (/** @type {RenderOpts} */ opts = {}) => {
  await toQuality(opts);
  answerAllRegulatory('Pass');
  fireEvent.click(next());
};

/** Every line of ANSWERABLE rejected in full, with a reason typed per line. */
const rejectEveryLine = () => {
  for (const li of ANSWERABLE.lineItems) {
    fireEvent.change(acceptedInput(li.materialCode), { target: { value: '0' } });
    fireEvent.change(screen.getByLabelText(`Rejection reason for ${li.materialCode}`), {
      target: { value: `crushed ${li.materialCode}` }
    });
  }
};

beforeEach(() => {
  asnStore.reset();
  goodsReceiptStore.reset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ─── THE FIXTURES REACH EVERY STATE BELOW ────────────────────────────────────

describe('GR wizard states — the fixtures reach them, else the specs are vacuous', () => {
  it('an answerable dock source, a second dock source, and both ASN lanes exist', () => {
    expect(ANSWERABLE, 'no answerable dock source').toBeDefined();
    expect(OTHER, 'no second dock source').toBeDefined();
    expect(receivableAsn(), 'no receivable stored ASN').toBeDefined();
    expect(nonReceivableAsn(), 'no non-receivable stored ASN').toBeDefined();
    expect(ANSWERABLE.lineItems.length).toBeGreaterThan(0);
  });
});

// ─── STEP 1 · SOURCE ─────────────────────────────────────────────────────────

describe('GR wizard states — step 1, the source', () => {
  it('opens on the source step, dock lane active, nothing picked: Back and Next disabled', async () => {
    renderWizard();
    await screen.findByText(ANSWERABLE.asnNumber);
    expect(heading()).toBe('Source selection');
    expect(back()).toBeDisabled();
    expect(next()).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Select inbound at dock' }).className).toContain(
      'border-action'
    );
    expect(screen.getByRole('button', { name: 'Enter ASN number' }).className).not.toContain(
      'border-action'
    );
    // Nothing is picked, so no row carries the selected tint.
    expect(sourceRow(ANSWERABLE.asnNumber).className).not.toContain('bg-action-soft');
    // An untouched step says nothing: no refusal, no alert.
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('picking a dock source tints its row and enables Next', async () => {
    renderWizard();
    fireEvent.click(await screen.findByText(ANSWERABLE.asnNumber));
    expect(sourceRow(ANSWERABLE.asnNumber).className).toContain('bg-action-soft');
    expect(next()).toBeEnabled();
    expect(back()).toBeDisabled();
  });

  it('the manual lane: blank says nothing, unknown refuses, receivable (trimmed) resolves', async () => {
    renderWizard();
    fireEvent.click(await screen.findByRole('button', { name: 'Enter ASN number' }));
    const input = screen.getByLabelText('ASN Number');
    expect(input).toHaveValue('');
    expect(input).toHaveAttribute('placeholder', 'ASN-2026-XXX');
    // Untouched blank does not nag.
    expect(screen.queryByText(/ASN not found/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Ready to receive/)).not.toBeInTheDocument();
    expect(next()).toBeDisabled();

    // Whitespace alone is still blank.
    fireEvent.change(input, { target: { value: '   ' } });
    expect(screen.queryByText(/ASN not found/)).not.toBeInTheDocument();
    expect(next()).toBeDisabled();

    fireEvent.change(input, { target: { value: 'ASN-NOPE-0' } });
    expect(screen.getByText(/ASN not found among receivable shipments/)).toHaveClass('text-danger');
    expect(next()).toBeDisabled();

    // A stored ASN that is not receivable is refused the same way.
    const closed = /** @type {NonNullable<ReturnType<typeof nonReceivableAsn>>} */ (
      nonReceivableAsn()
    );
    fireEvent.change(input, { target: { value: closed.asnNumber } });
    expect(screen.getByText(/ASN not found among receivable shipments/)).toBeInTheDocument();
    expect(next()).toBeDisabled();

    const live = receivableAsn();
    fireEvent.change(input, { target: { value: `  ${live.asnNumber}  ` } });
    expect(screen.queryByText(/ASN not found/)).not.toBeInTheDocument();
    const ok = screen.getByText(/Ready to receive\./);
    expect(ok).toHaveClass('text-success');
    expect(ok.textContent).toBe(
      `${live.asnNumber} · ${live.poReference} — ${live.status}. Ready to receive.`
    );
    expect(next()).toBeEnabled();
  });

  it('the manual value and the dock pick both survive switching lanes', async () => {
    renderWizard();
    fireEvent.click(await screen.findByText(ANSWERABLE.asnNumber));
    fireEvent.click(screen.getByRole('button', { name: 'Enter ASN number' }));
    expect(next()).toBeDisabled(); // the manual lane has no match yet
    fireEvent.change(screen.getByLabelText('ASN Number'), { target: { value: 'ASN-TYPED' } });

    fireEvent.click(screen.getByRole('button', { name: 'Select inbound at dock' }));
    expect(sourceRow(ANSWERABLE.asnNumber).className).toContain('bg-action-soft');
    expect(next()).toBeEnabled();

    fireEvent.click(screen.getByRole('button', { name: 'Enter ASN number' }));
    expect(screen.getByLabelText('ASN Number')).toHaveValue('ASN-TYPED');
  });

  it('initialAsnId pre-selects the source: Next is enabled on open and the lines are drafted', async () => {
    renderWizard({ initialAsnId: ANSWERABLE.id });
    await screen.findByText(ANSWERABLE.asnNumber);
    expect(sourceRow(ANSWERABLE.asnNumber).className).toContain('bg-action-soft');
    expect(next()).toBeEnabled();
    fireEvent.click(next());
    for (const li of ANSWERABLE.lineItems) {
      expect(receivedInput(li.materialCode)).toHaveValue(String(li.qty));
    }
  });

  it('picking a source REPLACES the drafted lines — another source, or the same one again', async () => {
    await toReceipt();
    const code = ANSWERABLE.lineItems[0].materialCode;
    fireEvent.change(receivedInput(code), { target: { value: '7' } });

    // Back to the same source and pick it again: the edit is discarded.
    fireEvent.click(back());
    fireEvent.click(sourceRow(ANSWERABLE.asnNumber));
    fireEvent.click(next());
    expect(receivedInput(code)).toHaveValue(String(ANSWERABLE.lineItems[0].qty));

    // Another source: its lines replace these.
    fireEvent.click(back());
    fireEvent.click(sourceRow(OTHER.asnNumber));
    fireEvent.click(next());
    expect(receivedInput(OTHER.lineItems[0].materialCode)).toHaveValue(
      String(OTHER.lineItems[0].qty)
    );
    if (OTHER.lineItems.every((li) => li.materialCode !== code)) {
      expect(screen.queryByLabelText(`Received quantity for ${code}`)).not.toBeInTheDocument();
    }
  });

  it('a manual match fills an EMPTY draft only — a dock pick already drafted is kept', async () => {
    // Today's behaviour, pinned as found: the auto-populate fills lines only when
    // none are drafted, so a manual match after a dock pick keeps the dock lines.
    renderWizard();
    fireEvent.click(await screen.findByText(ANSWERABLE.asnNumber));
    fireEvent.click(screen.getByRole('button', { name: 'Enter ASN number' }));
    const live = receivableAsn();
    fireEvent.change(screen.getByLabelText('ASN Number'), { target: { value: live.asnNumber } });
    fireEvent.click(next());
    expect(receivedInput(ANSWERABLE.lineItems[0].materialCode)).toBeInTheDocument();
  });

  it('a manual match on an empty draft drafts the ASN lines from the shipped quantity', async () => {
    renderWizard();
    fireEvent.click(await screen.findByRole('button', { name: 'Enter ASN number' }));
    const live = receivableAsn();
    fireEvent.change(screen.getByLabelText('ASN Number'), { target: { value: live.asnNumber } });
    fireEvent.click(next());
    const li = live.lineItems[0];
    expect(receivedInput(li.materialCode)).toHaveValue(String(li.shippedQty));
    expect(acceptedInput(li.materialCode)).toHaveValue(String(li.shippedQty));
  });
});

// ─── STEP 2 · RECEIPT DETAILS ────────────────────────────────────────────────

describe('GR wizard states — step 2, receipt details', () => {
  it('opens on its defaults: hub date, first receiver, first warehouse, blank notes, seeded lines', async () => {
    await toReceipt();
    expect(heading()).toBe('Receipt details');
    expect(screen.getByLabelText('Received Date')).toHaveValue(sdcClock.now().slice(0, 10));
    expect(screen.getByLabelText('Received Date')).toHaveAttribute('type', 'date');
    const by = /** @type {HTMLSelectElement} */ (screen.getByLabelText('Received By'));
    expect(by).toHaveValue('Warehouse Supervisor');
    expect([...by.options].map((o) => o.value)).toEqual([
      'Warehouse Supervisor',
      'QC Inspector',
      'Operations Manager'
    ]);
    const wh = /** @type {HTMLSelectElement} */ (screen.getByLabelText('Warehouse Location'));
    expect(wh).toHaveValue('NDC J6 Jakarta');
    expect([...wh.options].map((o) => o.value)).toEqual([
      'NDC J6 Jakarta',
      'RM Warehouse',
      'PM Warehouse'
    ]);
    const notes = screen.getByLabelText('Notes');
    expect(notes).toHaveValue('');
    expect(notes).toHaveAttribute('placeholder', 'Optional receipt context...');
    for (const li of ANSWERABLE.lineItems) {
      expect(receivedInput(li.materialCode)).toHaveValue(String(li.qty));
      expect(acceptedInput(li.materialCode)).toHaveValue(String(li.qty));
      expect(
        screen.queryByLabelText(`Rejection reason for ${li.materialCode}`)
      ).not.toBeInTheDocument();
    }
    // Untouched: nothing nags, and the step is passable.
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(back()).toBeEnabled();
    expect(next()).toBeEnabled();
  });

  it('every field survives Back and Next', async () => {
    await toReceipt();
    const code = ANSWERABLE.lineItems[0].materialCode;
    fireEvent.change(screen.getByLabelText('Received Date'), { target: { value: '2026-01-02' } });
    fireEvent.change(screen.getByLabelText('Received By'), { target: { value: 'QC Inspector' } });
    fireEvent.change(screen.getByLabelText('Warehouse Location'), {
      target: { value: 'PM Warehouse' }
    });
    fireEvent.change(screen.getByLabelText('Notes'), { target: { value: 'dock 3' } });
    fireEvent.change(receivedInput(code), { target: { value: '9' } });
    fireEvent.change(acceptedInput(code), { target: { value: '9' } });

    fireEvent.click(back()); // → source
    fireEvent.click(next()); // → details (no re-pick, so nothing is replaced)
    expect(screen.getByLabelText('Received Date')).toHaveValue('2026-01-02');
    expect(screen.getByLabelText('Received By')).toHaveValue('QC Inspector');
    expect(screen.getByLabelText('Warehouse Location')).toHaveValue('PM Warehouse');
    expect(screen.getByLabelText('Notes')).toHaveValue('dock 3');
    expect(receivedInput(code)).toHaveValue('9');
    expect(acceptedInput(code)).toHaveValue('9');

    fireEvent.click(next()); // → quality
    fireEvent.click(back()); // → details
    expect(screen.getByLabelText('Notes')).toHaveValue('dock 3');
    expect(receivedInput(code)).toHaveValue('9');
  });

  it('accepted above received says nothing but blocks Next', async () => {
    await toReceipt();
    const li = ANSWERABLE.lineItems[0];
    fireEvent.change(acceptedInput(li.materialCode), { target: { value: String(li.qty + 1) } });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(next()).toBeDisabled();
    fireEvent.change(acceptedInput(li.materialCode), { target: { value: String(li.qty) } });
    expect(next()).toBeEnabled();
  });

  it('a rejected quantity derives the figure and asks for a reason, which Next waits on', async () => {
    await toReceipt();
    const li = ANSWERABLE.lineItems[0];
    fireEvent.change(acceptedInput(li.materialCode), { target: { value: String(li.qty - 1) } });
    const reason = screen.getByLabelText(`Rejection reason for ${li.materialCode}`);
    expect(reason).toHaveValue('');
    expect(reason).toHaveAttribute('placeholder', 'Required when any qty is rejected');
    expect(screen.getByText('Rejection Reason')).toBeInTheDocument();
    // The owed reason is not a refusal message: nothing nags, Next just waits.
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(next()).toBeDisabled();

    fireEvent.change(reason, { target: { value: '   ' } });
    expect(next()).toBeDisabled();
    fireEvent.change(reason, { target: { value: 'torn' } });
    expect(next()).toBeEnabled();

    // Accepting the full quantity again hides the reason field and keeps Next open.
    fireEvent.change(acceptedInput(li.materialCode), { target: { value: String(li.qty) } });
    expect(
      screen.queryByLabelText(`Rejection reason for ${li.materialCode}`)
    ).not.toBeInTheDocument();
    expect(next()).toBeEnabled();

    // …and the typed reason is still there when the rejection comes back.
    fireEvent.change(acceptedInput(li.materialCode), { target: { value: String(li.qty - 1) } });
    expect(screen.getByLabelText(`Rejection reason for ${li.materialCode}`)).toHaveValue('torn');
  });

  it('a refusal shows on the change that causes it and clears on the change that fixes it', async () => {
    await toReceipt();
    const code = ANSWERABLE.lineItems[0].materialCode;
    expect(screen.queryByTestId('gr-received-refusal-0')).not.toBeInTheDocument();
    fireEvent.change(receivedInput(code), { target: { value: 'x' } });
    expect(screen.getByTestId('gr-received-refusal-0').textContent).toMatch(/not a quantity/i);
    expect(next()).toBeDisabled();
    fireEvent.change(receivedInput(code), {
      target: { value: String(ANSWERABLE.lineItems[0].qty) }
    });
    expect(screen.queryByTestId('gr-received-refusal-0')).not.toBeInTheDocument();
    expect(next()).toBeEnabled();
  });
});

// ─── STEP 3 · QUALITY ────────────────────────────────────────────────────────

describe('GR wizard states — step 3, quality', () => {
  it('opens with visual and packaging on Pass, the lab box clear, the regulatory checks unanswered', async () => {
    await toQuality();
    expect(heading()).toBe('Quality checks');
    const visualPass = screen
      .getAllByRole('radio')
      .filter((r) => r.getAttribute('name') === 'vis-0');
    expect(visualPass.map((r) => /** @type {HTMLInputElement} */ (r).value)).toEqual([
      'Pass',
      'Fail'
    ]);
    expect(visualPass[0]).toBeChecked();
    const pkg = screen.getAllByRole('radio').filter((r) => r.getAttribute('name') === 'pkg-0');
    expect(pkg.map((r) => /** @type {HTMLInputElement} */ (r).value)).toEqual([
      'Pass',
      'Fail',
      'N/A'
    ]);
    expect(pkg[0]).toBeChecked();
    const lab = screen.getAllByRole('checkbox', { name: 'Lab sample required' });
    expect(lab).toHaveLength(ANSWERABLE.lineItems.length);
    for (const box of lab) expect(box).not.toBeChecked();
    expect(screen.queryByText('Lab Request ID:')).not.toBeInTheDocument();
    for (const r of screen.queryAllByRole('radio', {
      name: /(Halal Seal Check|BPOM Lot Tracking) — (Pass|Fail)$/
    })) {
      expect(r).not.toBeChecked();
    }
    expect(next()).toBeDisabled();
    answerAllRegulatory('Pass');
    expect(next()).toBeEnabled();
  });

  it('ticking the lab box mints the line request id; unticking drops it; re-ticking re-mints it', async () => {
    await toQuality();
    const box = () => screen.getAllByRole('checkbox', { name: 'Lab sample required' })[0];
    fireEvent.click(box());
    expect(box()).toBeChecked();
    expect(screen.getByText('LAB-2026-100')).toBeInTheDocument();
    fireEvent.click(box());
    expect(box()).not.toBeChecked();
    expect(screen.queryByText('LAB-2026-100')).not.toBeInTheDocument();
    fireEvent.click(box());
    expect(screen.getByText('LAB-2026-100')).toBeInTheDocument();
  });

  it('the quality answers survive Back and Next', async () => {
    await toQuality();
    answerAllRegulatory('Fail');
    const vis = () =>
      screen.getAllByRole('radio').filter((r) => r.getAttribute('name') === 'vis-0');
    const pkg = () =>
      screen.getAllByRole('radio').filter((r) => r.getAttribute('name') === 'pkg-0');
    fireEvent.click(vis()[1]);
    fireEvent.click(pkg()[2]);
    fireEvent.click(screen.getAllByRole('checkbox', { name: 'Lab sample required' })[0]);

    fireEvent.click(back());
    fireEvent.click(next());
    expect(vis()[1]).toBeChecked();
    expect(pkg()[2]).toBeChecked();
    expect(screen.getAllByRole('checkbox', { name: 'Lab sample required' })[0]).toBeChecked();
    for (const r of screen.queryAllByRole('radio', {
      name: /(Halal Seal Check|BPOM Lot Tracking) — Fail$/
    })) {
      expect(r).toBeChecked();
    }
    expect(next()).toBeEnabled();
  });
});

// ─── STEP 4 · DISPOSITION ────────────────────────────────────────────────────

describe('GR wizard states — step 4, disposition', () => {
  it('an all-accepted receipt derives Approved, opts into SAP, and Create GR is enabled', async () => {
    await toDisposition();
    expect(heading()).toBe('Disposition & submit');
    expect(screen.getByText('Approved')).toBeInTheDocument();
    const auto = screen.getByRole('checkbox', { name: 'Auto-post to SAP' });
    expect(auto).toBeChecked();
    expect(screen.getByText('Assigned by SAP on posting')).toBeInTheDocument();
    expect(screen.getByLabelText('Final Notes')).toHaveValue('');
    expect(screen.getByLabelText('Final Notes')).toHaveAttribute('placeholder', 'Optional');
    expect(screen.queryByLabelText('Header rejection reason')).not.toBeInTheDocument();
    expect(createGr()).toBeEnabled();

    fireEvent.click(auto);
    expect(auto).not.toBeChecked();
    expect(screen.getByText('Not posted')).toBeInTheDocument();
    expect(createGr()).toBeEnabled();

    // The opt-out survives Back and Next.
    fireEvent.click(back());
    fireEvent.click(next());
    expect(screen.getByRole('checkbox', { name: 'Auto-post to SAP' })).not.toBeChecked();
  });

  it('a check Fail with stock accepted derives Partially Approved', async () => {
    await toQuality();
    answerAllRegulatory('Pass');
    fireEvent.click(
      /** @type {HTMLElement} */ (
        screen
          .getAllByRole('radio')
          .find(
            (r) =>
              r.getAttribute('name') === 'vis-0' &&
              /** @type {HTMLInputElement} */ (r).value === 'Fail'
          )
      )
    );
    fireEvent.click(next());
    expect(screen.getByText('Partially Approved')).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Auto-post to SAP' })).toBeChecked();
    expect(createGr()).toBeEnabled();
  });

  it('a fully rejected receipt asks for a header reason, Create GR waits on it, and SAP is not offered', async () => {
    await toReceipt();
    rejectEveryLine();
    fireEvent.click(next());
    answerAllRegulatory('Pass');
    fireEvent.click(next());

    expect(screen.getByText('Rejected')).toBeInTheDocument();
    expect(screen.getByText('Rejection Reason (required)')).toBeInTheDocument();
    const reason = screen.getByLabelText('Header rejection reason');
    expect(reason).toHaveValue('');
    expect(reason).toHaveAttribute('placeholder', 'Explain the full-lot rejection');
    expect(screen.queryByRole('checkbox', { name: 'Auto-post to SAP' })).not.toBeInTheDocument();
    // Today's summary reads the opt-in even though no post is offered.
    expect(screen.getByText('Assigned by SAP on posting')).toBeInTheDocument();
    // The owed reason nags nobody; Create GR simply waits.
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(createGr()).toBeDisabled();

    fireEvent.change(reason, { target: { value: '  ' } });
    expect(createGr()).toBeDisabled();
    fireEvent.change(reason, { target: { value: 'whole lot wet' } });
    expect(createGr()).toBeEnabled();

    fireEvent.click(back());
    fireEvent.click(next());
    expect(screen.getByLabelText('Header rejection reason')).toHaveValue('whole lot wet');
  });

  it('the roll-up and the summary tiles total the parsed quantities', async () => {
    await toReceipt();
    const li = ANSWERABLE.lineItems[0];
    fireEvent.change(acceptedInput(li.materialCode), { target: { value: String(li.qty - 2) } });
    fireEvent.change(screen.getByLabelText(`Rejection reason for ${li.materialCode}`), {
      target: { value: 'dented' }
    });
    fireEvent.click(next());
    answerAllRegulatory('Pass');
    fireEvent.click(next());
    const total = ANSWERABLE.lineItems.reduce((n, l) => n + l.qty, 0);
    const fmt = (/** @type {number} */ n) => new Intl.NumberFormat('id-ID').format(n);
    const n = ANSWERABLE.lineItems.length;
    expect(
      screen.getByText(n === 1 ? 'Rolled up from 1 line —' : `Rolled up from ${n} lines —`, {
        exact: false
      })
    ).toBeInTheDocument();
    const tiles = /** @type {HTMLElement} */ (
      screen.getByText('Total accepted').parentElement?.parentElement
    );
    expect(within(tiles).getByText('Total items').nextElementSibling?.textContent).toBe(String(n));
    expect(within(tiles).getByText('Total accepted').nextElementSibling?.textContent).toBe(
      fmt(total - 2)
    );
    expect(within(tiles).getByText('Total rejected').nextElementSibling?.textContent).toBe(fmt(2));
  });
});

// ─── SUBMIT · THE COMMANDS, THE PAYLOADS, THE SETTLE, THE TOASTS ─────────────

/**
 * The `{ transitionId, payload }` of every dispatch, in order.
 * @param {import('vitest').MockInstance} spy
 */
const dispatched = (spy) =>
  spy.mock.calls.map((c) => {
    const cmd = /** @type {{ transitionId: string; entityId?: string; payload?: unknown }} */ (
      c[1]
    );
    return { transitionId: cmd.transitionId, entityId: cmd.entityId, payload: cmd.payload };
  });

/** The inspection results the wizard records for ANSWERABLE, all accepted. */
const acceptedResults = () =>
  ANSWERABLE.lineItems.map((li) => ({
    materialCode: li.materialCode,
    description: li.description,
    qtyExpected: li.qty,
    qtyReceived: li.qty,
    qtyAccepted: li.qty,
    qtyRejected: 0,
    rejectionReason: undefined,
    labResultId: undefined,
    visualCheck: 'Pass',
    packagingCheck: 'Pass',
    halalSealCheck: (() => {
      const h = halalOf(li.materialCode);
      return h.ok && h.required ? 'Pass' : undefined;
    })(),
    bpomLotCheck: (() => {
      const b = bpomOf(li.materialCode);
      return b.ok && b.applicable ? 'Pass' : undefined;
    })()
  }));

describe('GR wizard states — submit dispatches the drafted values, awaits the settle, and toasts', () => {
  it('Approved + auto-post: create → start → approve → post → settle, toast posted, onComplete()', async () => {
    const dispatch = vi.spyOn(mockDataService.commands, 'dispatch');
    const settle = vi.spyOn(mockDataService.commands, 'settle');
    const onComplete = vi.fn();
    await toDisposition({ onComplete });
    fireEvent.click(createGr());

    await waitFor(() => expect(toasts()).toMatch(/posted to SAP/i), { timeout: 4000 });
    const calls = dispatched(dispatch);
    expect(calls.map((c) => c.transitionId)).toEqual([
      't_gr_create',
      't_gr_start_inspection',
      't_gr_approve',
      't_gr_post'
    ]);
    expect(calls[0].payload).toEqual({
      asnReference: ANSWERABLE.asnNumber,
      inspectionResults: acceptedResults(),
      receivedDate: sdcClock.now().slice(0, 10),
      receivedBy: 'Warehouse Supervisor',
      notes: undefined
    });
    const grId = calls[1].entityId;
    expect(grId).toBeTruthy();
    expect(calls[2]).toEqual({ transitionId: 't_gr_approve', entityId: grId, payload: {} });
    expect(calls[3].entityId).toBe(grId);
    // The settle is AWAITED by the wizard, on the post's correlationId.
    expect(settle).toHaveBeenCalledTimes(1);
    expect(toasts()).toMatch(new RegExp(`${grId} posted to SAP`));
    expect(toasts()).toMatch(/SAP assigned the material document on settlement/);
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledWith();
  });

  it('the edited header fields reach the create payload, and final notes win over notes', async () => {
    const dispatch = vi.spyOn(mockDataService.commands, 'dispatch');
    await toReceipt();
    fireEvent.change(screen.getByLabelText('Received Date'), { target: { value: '2026-02-03' } });
    fireEvent.change(screen.getByLabelText('Received By'), {
      target: { value: 'Operations Manager' }
    });
    fireEvent.change(screen.getByLabelText('Warehouse Location'), {
      target: { value: 'RM Warehouse' }
    });
    fireEvent.change(screen.getByLabelText('Notes'), { target: { value: 'receipt note' } });
    fireEvent.click(next());
    answerAllRegulatory('Pass');
    fireEvent.click(next());
    fireEvent.change(screen.getByLabelText('Final Notes'), { target: { value: 'final note' } });
    fireEvent.click(screen.getByRole('checkbox', { name: 'Auto-post to SAP' }));
    fireEvent.click(createGr());

    await waitFor(() => expect(toasts()).toMatch(/Approved/), { timeout: 4000 });
    const calls = dispatched(dispatch);
    expect(calls.map((c) => c.transitionId)).toEqual([
      't_gr_create',
      't_gr_start_inspection',
      't_gr_approve'
    ]);
    const create = /** @type {Record<string, unknown>} */ (calls[0].payload);
    expect(create.receivedDate).toBe('2026-02-03');
    expect(create.receivedBy).toBe('Operations Manager');
    // The warehouse is drafted but never dispatched — today's payload has no slot.
    expect(Object.keys(create).sort()).toEqual([
      'asnReference',
      'inspectionResults',
      'notes',
      'receivedBy',
      'receivedDate'
    ]);
    expect(create.notes).toBe('final note');
    // With no header reason owed, the final notes stand in as the verb's reason.
    expect(calls[2].payload).toEqual({ dispositionReason: 'final note' });
  });

  it('notes alone reach the create payload when final notes are blank', async () => {
    const dispatch = vi.spyOn(mockDataService.commands, 'dispatch');
    await toReceipt();
    fireEvent.change(screen.getByLabelText('Notes'), { target: { value: 'only note' } });
    fireEvent.click(next());
    answerAllRegulatory('Pass');
    fireEvent.click(next());
    fireEvent.click(screen.getByRole('checkbox', { name: 'Auto-post to SAP' }));
    fireEvent.click(createGr());
    await waitFor(() => expect(dispatched(dispatch).length).toBe(3), { timeout: 4000 });
    expect(/** @type {Record<string, unknown>} */ (dispatched(dispatch)[0].payload).notes).toBe(
      'only note'
    );
    expect(dispatched(dispatch)[2].payload).toEqual({});
  });

  it('auto-post off: no post, no settle, the disposition toast, onComplete()', async () => {
    const dispatch = vi.spyOn(mockDataService.commands, 'dispatch');
    const settle = vi.spyOn(mockDataService.commands, 'settle');
    const onComplete = vi.fn();
    await toDisposition({ onComplete });
    fireEvent.click(screen.getByRole('checkbox', { name: 'Auto-post to SAP' }));
    fireEvent.click(createGr());
    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1), { timeout: 4000 });
    const calls = dispatched(dispatch);
    expect(calls.map((c) => c.transitionId)).not.toContain('t_gr_post');
    expect(settle).not.toHaveBeenCalled();
    const grId = calls[1].entityId;
    expect(toasts()).toMatch(new RegExp(`${grId} — Approved`));
    expect(toasts()).toMatch(/recorded\. Header disposition derived from the inspected lines\./);
    expect(onComplete).toHaveBeenCalledWith();
  });

  it('Rejected: the reject verb carries the header reason, and nothing posts', async () => {
    const dispatch = vi.spyOn(mockDataService.commands, 'dispatch');
    const onComplete = vi.fn();
    renderWizard({ onComplete });
    fireEvent.click(await screen.findByText(ANSWERABLE.asnNumber));
    fireEvent.click(next());
    rejectEveryLine();
    fireEvent.click(next());
    answerAllRegulatory('Pass');
    fireEvent.click(next());
    fireEvent.change(screen.getByLabelText('Header rejection reason'), {
      target: { value: 'whole lot wet' }
    });
    fireEvent.change(screen.getByLabelText('Final Notes'), { target: { value: 'fn' } });
    fireEvent.click(createGr());
    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1), { timeout: 4000 });
    const calls = dispatched(dispatch);
    expect(calls.map((c) => c.transitionId)).toEqual([
      't_gr_create',
      't_gr_start_inspection',
      't_gr_reject'
    ]);
    // The header reason wins over the final notes.
    expect(calls[2].payload).toEqual({ dispositionReason: 'whole lot wet' });
    const results = /** @type {{ inspectionResults: Array<Record<string, unknown>> }} */ (
      calls[0].payload
    ).inspectionResults;
    for (const [i, li] of ANSWERABLE.lineItems.entries()) {
      expect(results[i]).toMatchObject({
        qtyReceived: li.qty,
        qtyAccepted: 0,
        qtyRejected: li.qty,
        rejectionReason: `crushed ${li.materialCode}`
      });
    }
    expect(toasts()).toMatch(/— Rejected/);
  });

  it('the lab request id and the check answers are dispatched as drafted', async () => {
    const dispatch = vi.spyOn(mockDataService.commands, 'dispatch');
    await toQuality();
    answerAllRegulatory('Pass');
    fireEvent.click(screen.getAllByRole('checkbox', { name: 'Lab sample required' })[0]);
    fireEvent.click(
      /** @type {HTMLElement} */ (
        screen
          .getAllByRole('radio')
          .find(
            (r) =>
              r.getAttribute('name') === 'pkg-0' &&
              /** @type {HTMLInputElement} */ (r).value === 'N/A'
          )
      )
    );
    fireEvent.click(next());
    fireEvent.click(screen.getByRole('checkbox', { name: 'Auto-post to SAP' }));
    fireEvent.click(createGr());
    await waitFor(() => expect(dispatched(dispatch).length).toBe(3), { timeout: 4000 });
    const first = /** @type {{ inspectionResults: Array<Record<string, unknown>> }} */ (
      dispatched(dispatch)[0].payload
    ).inspectionResults[0];
    expect(first.labResultId).toBe('LAB-2026-100');
    // N/A packaging is recorded as Pass — the stored token set has no N/A.
    expect(first.packagingCheck).toBe('Pass');
  });

  it('a second click while the first submit runs dispatches nothing more', async () => {
    const dispatch = vi.spyOn(mockDataService.commands, 'dispatch');
    const onComplete = vi.fn();
    await toDisposition({ onComplete });
    fireEvent.click(screen.getByRole('checkbox', { name: 'Auto-post to SAP' }));
    fireEvent.click(createGr());
    fireEvent.click(createGr());
    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1), { timeout: 4000 });
    expect(dispatched(dispatch).filter((c) => c.transitionId === 't_gr_create')).toHaveLength(1);
  });

  it('a settle that fails hands the GR and its correlationId up, and claims no post', async () => {
    const onComplete = vi.fn();
    const service = withSettle(async () => null);
    const dispatch = vi.spyOn(service.commands, 'dispatch');
    await toDisposition({ onComplete, service });
    fireEvent.click(createGr());
    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1), { timeout: 4000 });
    const grId = dispatched(dispatch)[1].entityId;
    expect(onComplete).toHaveBeenCalledWith({
      grId,
      correlationId: expect.any(String),
      fault: 'REFUSED'
    });
    expect(toasts()).toMatch(/Settlement did not complete/);
    expect(toasts()).not.toMatch(/posted to SAP/i);
  });
});

// ─── CLOSE AND REOPEN ────────────────────────────────────────────────────────

describe('GR wizard states — Cancel closes, and a reopened wizard starts from its defaults', () => {
  it('Cancel calls onClose and dispatches nothing', async () => {
    const dispatch = vi.spyOn(mockDataService.commands, 'dispatch');
    const onClose = vi.fn();
    await toReceipt({ onClose });
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('closing from the page and opening again forgets the draft', async () => {
    renderWithProviders(<BuyerGoodsReceipt />);
    await screen.findByText('Rejection Rate (30d)', {}, { timeout: 4000 });

    fireEvent.click(screen.getByRole('button', { name: /New GR/i }));
    fireEvent.click(await screen.findByText(ANSWERABLE.asnNumber));
    fireEvent.click(next());
    fireEvent.change(screen.getByLabelText('Notes'), { target: { value: 'stale' } });
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('button', { name: /^Next$/ })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /New GR/i }));
    await screen.findByText(ANSWERABLE.asnNumber);
    // The page has headings of its own, so the step title is found by name.
    expect(screen.getByRole('heading', { name: 'Source selection' })).toBeInTheDocument();
    expect(sourceRow(ANSWERABLE.asnNumber).className).not.toContain('bg-action-soft');
    expect(next()).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Enter ASN number' }));
    expect(screen.getByLabelText('ASN Number')).toHaveValue('');
    fireEvent.click(screen.getByRole('button', { name: 'Select inbound at dock' }));
    fireEvent.click(sourceRow(ANSWERABLE.asnNumber));
    fireEvent.click(next());
    expect(screen.getByLabelText('Notes')).toHaveValue('');
  }, 13120);
});
