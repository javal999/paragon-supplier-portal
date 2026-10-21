import { useMemo, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
/** @import { Shipment, ASN } from '@services/data/types' */
/** @import { InspectionResult } from '@data/mockGoodsReceipts' */
/** @import { GrLineQtyOutcome } from '../../grLineQuantities' */
import { readGrLineQuantities } from '../../grLineQuantities';
/** @import { GrHeaderDisposition } from '@services/transitions' */
import { deriveHeaderDisposition } from '@services/transitions';
import { blocks, effectiveEnforcement } from '@lib/enforcement';
/** @import { EnforcementSetting } from '@lib/enforcement' */
import { verifyHalalAtReceipt } from '@services/data/halalVerification';
/** @import { HalalVerification } from '@services/data/halalVerification' */
/** @import { ComplianceRegistryEntry } from '@services/data/types' */
import { sdcClock } from '@services/sdc/clock';
import { approvedShelfLifeLines } from '@services/transitions/fulfilmentRules';
/** @import { GrDraft, LineDraft } from '../utils' */
import { ROLES, LOCATIONS } from '../components/ReceiptStep';
import useGrSource from './useGrSource';

/**
 * @typedef {object} UseInspectionDraftArgs
 * @property {string} [initialAsnId]
 * @property {Shipment[]} shipments
 * @property {ASN[]} asns
 * @property {readonly EnforcementSetting[]} enforcementSettings -  The enforcement ledger; the mode in force is derived HERE from one captured instant.
 * @property {readonly ComplianceRegistryEntry[]} complianceRegistry -  The rows the certificate notice may read — an argument, never an import.
 */

/**
 * The wizard's draft and every gate over it: the source (via `useGrSource`),
 * the receipt fields and line drafts, the ONE parse of each line's quantities,
 * the derived inspection results and header disposition, the enforcement-read
 * regulatory gates, the certificate verdicts, the per-step validity, the line
 * updater, and the roll-up totals.
 *
 * Moved verbatim out of `GRInspectionWizard` (frontend-standard Phase 5). The
 * gates that read the source (`bpomApplicability`, `halalApplicability`,
 * `halalVerification`, `enforcement`) read this file through the wizard folder.
 *
 * ⚠️ **THE DRAFT IS A REACT-HOOK-FORM `useForm`; THE GATES ARE NOT ITS.** The
 * house pattern (`SupplierRegistration/hooks/useRegistrationWizard.js`): no
 * field is registered with rules and `handleSubmit` is never called, so
 * react-hook-form never validates. Every gate below is derived from the live
 * values (`useWatch`), on every change, exactly as it was over the `useState`
 * draft — which is why each refusal shows at the same moment it always did,
 * and why an untouched field still says nothing. The steps read and write the
 * draft through `FormProvider` (`register` for typed fields, `setValue` for the
 * clicked ones); `methods` is returned for the wizard to provide.
 * @param {UseInspectionDraftArgs} args
 */
const useInspectionDraft = ({
  initialAsnId,
  shipments,
  asns,
  enforcementSettings,
  complianceRegistry
}) => {
  // The draft's starting values, built ONCE (the `useState` initializer), so the
  // hub clock below is read once per opened wizard, as it was.
  const [initialDraft] = useState(
    () =>
      /** @type {GrDraft} */ ({
        // Step 1 — a page that opens the wizard for one ASN pre-selects it.
        sourceMode: 'shipment',
        selectedSourceId: initialAsnId ?? '',
        manualASN: '',
        // Step 2
        // The receipt is dated on the HUB clock by default — the day the demo hub
        // says it is (`sdcClock`), not a literal and not the machine's calendar.
        // It read `'2026-05-20'` (the day the wizard was authored), so every
        // receipt recorded in the demo was back-dated three months behind the
        // hub around it.
        receivedDate: sdcClock.now().slice(0, 10),
        receivedBy: ROLES[0],
        warehouse: LOCATIONS[0],
        notes: '',
        lines: [],
        // Step 4 — NO free-choice disposition: the header is DERIVED from the
        // lines (see derivedDisposition below), never asserted.
        dispositionReason: '',
        autoPostSap: true,
        finalNotes: ''
      })
  );
  const methods = useForm({ defaultValues: initialDraft });
  const { control, setValue, getValues } = methods;
  // Every value, re-read on every change: the gates below derive from them.
  const {
    sourceMode,
    selectedSourceId,
    manualASN,
    receivedDate,
    receivedBy,
    notes,
    lines,
    dispositionReason,
    autoPostSap,
    finalNotes
  } = /** @type {GrDraft} */ (useWatch({ control }));

  /** @param {LineDraft[]} next */
  const setLines = (next) => setValue('lines', next);

  const { sources, manualAsnMatch, manualNotFound, activeSource, sourceValid } = useGrSource({
    sourceMode,
    selectedSourceId,
    manualASN,
    shipments,
    asns,
    lines,
    setLines
  });

  // Finalized inspection lines + the header disposition ROLLED UP from them. The
  // header is DERIVED, never a free-choice assertion (law 0.6) — the same rollup
  // the dispatcher's gr_rollup_* hooks re-check, so the UI cannot present an
  // Accept the lines contradict.
  // ── CP-0 · W1 · 2f-a — the ONE read of every line's quantity pair ─────────
  // Index-aligned with `lines`. The field messages, the receipt guard, the
  // derived qtyRejected, the header rollup and the dispatched payload all read
  // THIS, so none of them can disagree about what arrived.
  // MR-6 BR-08 / BR-09 — the materials Quality approved into blocked stock on
  // this source's ASN (a dock shipment or the ASN itself; one line per material).
  const blockedCodes = useMemo(() => {
    const asn = activeSource ? asns.find((a) => a.asnNumber === activeSource.asnNumber) : undefined;
    return new Set(asn ? approvedShelfLifeLines(asn).map((l) => l.materialCode) : []);
  }, [asns, activeSource]);

  const lineQtys = /** @type {GrLineQtyOutcome[]} */ (
    useMemo(
      () => lines.map((l) => readGrLineQuantities(l.qtyReceivedRaw, l.qtyAcceptedRaw)),
      [lines]
    )
  );
  const allQtysOk = lineQtys.every((q) => q.ok);

  const inspectionResults = /** @type {InspectionResult[]} */ (
    useMemo(
      () =>
        // A receipt with an unreadable line has no coherent description, so there
        // is nothing to describe: the empty set rolls up to 'Pending'
        // (`deriveHeaderDisposition`) and `headerVerbFor` returns null, so nothing
        // is finalizable. Honest by existing construction — no new rule needed.
        !allQtysOk
          ? []
          : lines.map((l, i) => {
              const q = /** @type {Extract<GrLineQtyOutcome, { ok: true }>} */ (lineQtys[i]);
              const rejected = Math.max(0, q.received - q.accepted);
              /** @type {'Pass' | 'Fail' | 'Pending'} */
              const packaging = l.packagingCheck === 'N/A' ? 'Pass' : l.packagingCheck;
              return {
                materialCode: l.materialCode,
                description: l.description,
                qtyExpected: l.qtyExpected,
                qtyReceived: q.received,
                qtyAccepted: q.accepted,
                qtyRejected: rejected,
                rejectionReason: rejected > 0 ? l.rejectionReason : undefined,
                labResultId: l.labRequestId,
                visualCheck: l.visualCheck,
                packagingCheck: packaging,
                halalSealCheck: l.halalSealCheck,
                bpomLotCheck: l.bpomLotCheck
              };
            }),
      [lines, lineQtys, allQtysOk]
    )
  );
  const derivedDisposition = /** @type {GrHeaderDisposition} */ (
    useMemo(() => deriveHeaderDisposition(inspectionResults), [inspectionResults])
  );

  // A GUARD IS ONLY ASKABLE OF A VALUE THAT EXISTS (2f-a) — the third named site
  // of the IntakeAdjustDrawer C6-LOCK pattern, after rfqCreateModel.
  //
  // The three guards below are UNCHANGED and still individually correct. What
  // changed is that they can no longer be reached with a fabricated value: the
  // refusal short-circuits first, so a cleared field is refused rather than
  // silently satisfying all three (not negative, accepted <= received, no
  // rejection reason owed) and posting a receipt asserting nothing arrived.
  // Strictly stronger than adding a fourth blank-check, and it leaves the
  // existing rules alone.
  const receiptValid =
    lines.length > 0 &&
    lines.every((l, i) => {
      const q = lineQtys[i];
      if (!q.ok) return false;
      if (q.received < 0 || q.accepted < 0) return false;
      if (q.accepted > q.received) return false;
      if (q.received - q.accepted > 0 && !l.rejectionReason.trim()) return false;
      return true;
    });

  // ── CP-3 · E4 — THE MODE IN FORCE, READ OFF THE LEDGER ────────────────────
  //
  // ⚠️ **ONE INSTANT, CAPTURED ONCE, AT THE TOP OF THE INSPECTION.** The
  // `BuyerCompliance.jsx` precedent, and law 0.5's shape at a surface: nothing
  // pure reads a clock, so the clock is read HERE, exactly once, and handed to
  // `effectiveEnforcement` as an argument. A fresh `new Date()` inside the
  // derivation would make the same inspection answer differently across renders
  // the moment a `reviewBy` lapsed mid-session — a ratchet biting halfway
  // through a form, with no act to explain it.
  //
  // ⚠️ **RENAMED AT H4 FROM `enforcementInstant`, AND THE RENAME IS THE POINT.**
  // The certificate notice below needs an instant too, and a SECOND
  // `new Date()` would have been a second clock: the mode could then be derived
  // at one moment and the certificate at another, so a lapse falling between
  // them would produce an inspection nothing could explain. ONE READ, ONE NAME,
  // BOTH DERIVATIONS.
  //
  // ⚠️ **AND THAT ONE READ IS THE HUB CLOCK (2026-09-22).** It was the machine
  // clock, by the 2026-09-10 ruling that treated it as a fact about THIS
  // reading. The operator reversed that: the demo hub runs on ONE clock, so an
  // inspection is judged against the enforcement ledger and certificates at the
  // hub's present, the same present every seeded row is coherent at.
  const inspectionInstant = useMemo(() => sdcClock.now(), []);

  /**
   * Does a required-and-unanswered check STOP the step? Read, never assumed.
   *
   * `blocks()` is the ramp comparison from the vocabulary itself — false at
   * `OBSERVE`, true from `BLOCK_OVERRIDABLE` up — so this file states no order
   * and can never disagree with the one `ENFORCEMENT_MODES` declares. Whether a
   * named person may then override at `BLOCK_OVERRIDABLE` is a SEPARATE question
   * (`overrideAllowed`) and it is E3's; nothing here can construct an override,
   * because nothing here can name a human.
   *
   * ⚠️ An EMPTY ledger answers `BLOCK / NO_SETTING_RECORDED`, so an unseeded,
   * unavailable or unreadable ledger blocks exactly as today. There is no path
   * through this derivation on which a missing setting relaxes a check.
   */
  const { sealBlocks, lotBlocks } = useMemo(
    () => ({
      sealBlocks: blocks(
        effectiveEnforcement(enforcementSettings, 'halal.seal', inspectionInstant).mode
      ),
      lotBlocks: blocks(
        effectiveEnforcement(enforcementSettings, 'bpom.lot', inspectionInstant).mode
      )
    }),
    [enforcementSettings, inspectionInstant]
  );

  // ── ⚠️ CP-3 · H4 — THE CERTIFICATE NOTICE. IT TELLS; IT DOES NOT STOP. ────
  //
  // THE OPERATOR'S RULING, and it is a ruling about the CLERK, not about a mode:
  //
  //   THE CLERK'S JOB IS TO WORK WITH THE INTERNAL TEAM AND THE SUPPLIER TO
  //   UPDATE THE CERTIFICATE — AND A CLERK WHO IS NOT TOLD CANNOT DO THAT JOB.
  //
  // So fact 3 finally reaches a surface. `verifyHalalAtReceipt` was authored at
  // H3 with NO CONSUMER AT ALL — measured at H4: zero product callers, every
  // mention in the tree a comment or a type-only glossary import. This is its
  // first.
  //
  // ── ⚠️ WHY IT IS NOT WIRED TO `qualityValid`, AND WHY THAT IS NOT A DODGE ──
  //   `halal.certificate` HAS NO RECORDED SETTING, so `effectiveEnforcement`
  //   derives `BLOCK / NO_SETTING_RECORDED` — the honest ceiling for a check
  //   nobody has ruled on. Adding a `&& certBlocks` clause below would therefore
  //   have STOPPED THE DOCK on six of ten receivable lines, which is the exact
  //   outcome the operator ruled against.
  //
  //   The operator's answer was to seed `OBSERVE`. **MEASURED, AND IT IS
  //   REFUSED**: `OBSERVE` is a LOOSENING from the `MAXIMUM_RIGOUR` baseline, and
  //   `enforcement_set_governed` refuses a loosening by an unattributed actor —
  //   the SAME refusal, for the SAME reason, as `BLOCK_OVERRIDABLE`. The portal
  //   cannot name a person (`ENF-NO-PERSON-IN-IDENTITY-01`), so **EVERY MODE
  //   BELOW `BLOCK` IS UNRECORDABLE TODAY.** See `docs/findings.md` §63.
  //
  //   What is left is the half that needs no setting: **the notice is not the
  //   governed check.** It reads the registry and renders; it is consulted by
  //   nothing that can refuse. `halal.certificate` stays exactly as E4 left it —
  //   unseeded, unwired, at the honest ceiling — and the day identity lands, the
  //   successor is a seed plus ONE clause here.
  //
  // ── ⚠️ GATED ON `l.halal.ok && l.halal.required`, WHICH IS THE WHOLE OF ────
  //   ITEM 5. A material whose applicability nobody has ruled on
  //   (`UNDETERMINED_APPLICABILITY`) must not acquire a certificate warning: a
  //   `NO_CERT` on a material that never needed a certificate IS NOT A FINDING,
  //   IT IS A QUESTION THAT SHOULD NOT HAVE BEEN ASKED, and dressing it as a
  //   warning would answer it in the affirmative by implication. Four receivable
  //   lines are that shape and NONE of them gets a notice. Pinned in the spec,
  //   and mutation-probed by widening this condition.
  /** @type {readonly (HalalVerification | null)[]} */
  const certVerdicts = useMemo(
    () =>
      lines.map((l) =>
        activeSource && l.halal.ok && l.halal.required
          ? verifyHalalAtReceipt(
              activeSource.supplierId,
              l.materialCode,
              complianceRegistry,
              inspectionInstant
            )
          : null
      ),
    [lines, activeSource, complianceRegistry, inspectionInstant]
  );

  // ── CP-2 · 2B-4b — THE REGULATORY GATE, AND IT FAILS CLOSED ───────────────
  // A REGULATORY GATE THAT FAILS OPEN IS WORSE THAN ONE THAT FAILS LOUD. The
  // line this replaces read `if (l.bpomRequired && !l.bpomLotCheck)` over a
  // prefix-parsed boolean, so a material nobody had ruled on took the SAME path
  // as one ruled not-applicable: no row rendered, no check owed, receipt posts.
  //
  // Now an absent determination BLOCKS. `!l.bpom.ok` covers both refusals —
  // the master does not name the code, and the master names it and records no
  // determination — with ONE branch, so neither can be given a way through.
  //
  // ── CP-3 · `REQUIRED-OPENS-PRE-ANSWERED-01` — NOT A LINE CHANGED HERE ──────
  // ⚠️ **THIS BLOCK IS BYTE-IDENTICAL TO WHAT 2B-4b SHIPPED, AND THAT IS THE
  // FINDING.** The two clauses that make a required-and-unanswered check block
  // — `halalRequired && !halalSealCheck`, `bpom.applicable && !bpomLotCheck` —
  // were already here, already correct, and COULD NOT FIRE, because the draft
  // builders stamped an answer into every line they applied to. A gate is only
  // a gate over a value that can be absent. The fix was upstream, in the seed;
  // what changed at this line is that it can now say no.
  //
  // ── CP-3 · H2 — AND NOW THE HALAL HALF FAILS CLOSED TOO ───────────────────
  // `l.halalRequired && !l.halalSealCheck` became the two lines below, and the
  // shape is deliberately IDENTICAL to BPOM's: **ONE refusal branch covering
  // BOTH reasons**, then the required-and-unanswered clause. Nothing branches on
  // `reason` — it reaches the message and nothing else — so neither refusal can
  // be given a way through that the other does not have.
  //
  // ⚠️ THE ORDER MATTERS AND IS NOT COSMETIC. `!l.halal.ok` is tested BEFORE
  // `l.halal.required`, because `required` does not exist on a refusal. Written
  // the other way round the compiler would stop it — which is exactly why the
  // outcome is a discriminated union and not a boolean plus a flag.
  //
  // ── ⚠️ CP-3 · E4 — THE CONSEQUENCE IS NOW READ, NOT HARD-CODED ────────────
  // Two clauses below gained `&& sealBlocks` / `&& lotBlocks` and NOTHING else
  // changed. That is the whole migration: the wizard used to assert that a
  // required-and-unanswered check stops the step; it now ASKS THE REGISTRY
  // whether it does, and today the registry answers what the wizard used to
  // assert. **MEASURED DELTA: ZERO** — `GRInspectionWizard.test.jsx`, per check
  // and per receivable line, on the H2 precedent.
  //
  // ⚠️ **THE TWO REFUSAL BRANCHES ARE UNTOUCHED, AND STRUCTURALLY SO.**
  // `!l.halal.ok` and `!l.bpom.ok` carry no mode and cannot acquire one:
  //
  //   ENFORCEMENT MODE RELAXES THE CONSEQUENCE OF AN ANSWER;
  //   NOTHING MAY RELAX THE ABSENCE OF A QUESTION.
  //
  // A refusal is the statement that the question COULD NOT BE POSED, so there
  // is no answer whose consequence a mode could relax. `UNKNOWN_MATERIAL` and
  // `UNDETERMINED_APPLICABILITY` are not members of `GovernedVerdict`, so there
  // is no way to write a mode into those two lines without inventing a value
  // the union does not contain — the absence is the mechanism, not a rule
  // somebody has to remember here.
  const qualityValid = lines.every((l) => {
    if (!l.visualCheck || !l.packagingCheck) return false;
    if (!l.halal.ok) return false;
    if (l.halal.required && !l.halalSealCheck && sealBlocks) return false;
    if (!l.bpom.ok) return false;
    if (l.bpom.applicable && !l.bpomLotCheck && lotBlocks) return false;
    if (l.labSampleRequired && !l.labRequestId) return false;
    return true;
  });

  // A fully-Rejected rollup needs a reason (t_gr_reject requiredField); Approved
  // / Partially Approved don't. 'Pending' can't be finalized (uninspected line).
  const dispositionValid =
    derivedDisposition === 'Rejected'
      ? dispositionReason.trim().length > 0
      : derivedDisposition !== 'Pending';

  /**
   * @param {number} i
   * @returns {boolean}
   */
  const isStepValid = (i) => {
    if (i === 0) return sourceValid;
    if (i === 1) return receiptValid;
    if (i === 2) return qualityValid;
    if (i === 3) return dispositionValid;
    return true;
  };

  /**
   * @param {number} idx
   * @param {Partial<LineDraft>} patch
   */
  const updateLine = (idx, patch) => {
    setLines(
      getValues('lines').map((l, i) => {
        if (i !== idx) return l;
        const next = { ...l, ...patch };
        if (patch.labSampleRequired === true && !next.labRequestId) {
          next.labRequestId = `LAB-2026-${String(100 + idx).padStart(3, '0')}`;
        }
        if (patch.labSampleRequired === false) {
          next.labRequestId = undefined;
        }
        return next;
      })
    );
  };

  // Summed from the PARSED pairs, so the roll-up can never total a value the
  // guard refused. An unreadable line contributes nothing rather than a zero.
  const totals = useMemo(() => {
    return lineQtys.reduce(
      (acc, q) => ({
        items: acc.items + 1,
        accepted: acc.accepted + (q.ok ? q.accepted : 0),
        rejected: acc.rejected + (q.ok ? Math.max(0, q.received - q.accepted) : 0)
      }),
      { items: 0, accepted: 0, rejected: 0 }
    );
  }, [lineQtys]);

  return {
    methods,
    sources,
    manualAsnMatch,
    manualNotFound,
    activeSource,
    manualASN,
    receivedDate,
    receivedBy,
    notes,
    lines,
    dispositionReason,
    autoPostSap,
    finalNotes,
    blockedCodes,
    lineQtys,
    inspectionResults,
    derivedDisposition,
    certVerdicts,
    isStepValid,
    updateLine,
    totals
  };
};

export default useInspectionDraft;
