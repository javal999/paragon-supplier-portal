// SupplierForecastCommitments — pure helpers (no React).
// Moved out of the page file unchanged (frontend-standard Phase 5 split).

/** @import { CapacityPlan, CapacityReason, ForecastCommitmentLine } from '@services/data/types' */
/** @import { PeriodCapacityCheck } from '@services/transitions/capacityRules' */
/** @import { PeriodRefusal, PeriodRow, ReadRow, RowDraft, WeekReason } from './const' */
import {
  capacityGroupOfMaterial,
  commitmentCapacityRefusal,
  periodCapacityCheck
} from '@services/transitions/capacityRules';
import { materialEntry } from '@services/sdc';
import { readCommitmentNumber, shortfallRefusal } from '@services/transitions/forecastRules';

/**
 * A line's starting draft: its saved draft, else its submitted response, else
 * the forecast quantity (BR-09). No date: CAP-6 (BL-175) confirms a quantity
 * per period, and the record stores the period start.
 * @param {ForecastCommitmentLine} l
 * @returns {RowDraft}
 */
export const draftOf = (l) => {
  const src = l.draft ?? l.response;
  const c = src?.forecastConfirmation;
  return {
    qty: String(c?.confirmedQty ?? l.forecastQty),
    upside: c?.upsideQty !== undefined ? String(c.upsideQty) : '',
    reason: /** @type {CapacityReason | undefined} */ (src?.rootCause?.level1) ?? '',
    note: src?.rootCause?.note ?? ''
  };
};

/**
 * Read a row's draft: the parsed quantity and upside, and the first refusal
 * its inputs earn (quantity, upside, then BR-04's starter reason).
 * @param {ForecastCommitmentLine} l
 * @param {RowDraft} d  The row's draft (`rowDraft(l)`).
 * @returns {ReadRow}
 */
export const readDraft = (l, d) => {
  const qty = readCommitmentNumber(d.qty);
  const upside = readCommitmentNumber(d.upside);
  const qtyValue = qty.ok ? qty.value : null;
  const refusal =
    qtyValue === null
      ? 'qtyRequired'
      : !upside.ok
        ? 'upsideInvalid'
        : shortfallRefusal(
            l.forecastQty,
            qtyValue,
            d.reason ? { level1: d.reason, note: d.note } : undefined
          );
  return { d, qtyValue, upsideValue: upside.ok ? upside.value : null, refusal };
};

/**
 * BL-133 — the "Submit all" periods: one row per period bucket of the
 * Firm and Trade-off lines, in date order, with each capacity group's check,
 * the root cause each line is sent with, and why the period's Submit all is
 * refused (null when it is not).
 * @param {object} args
 * @param {ForecastCommitmentLine[]} args.commitLines  The stream's Firm and Trade-off lines.
 * @param {ForecastCommitmentLine[]} args.lines  Every line, for the LTP sum across streams.
 * @param {readonly CapacityPlan[]} args.plans  The supplier's capacity plans.
 * @param {string} args.supplierId
 * @param {string[]} args.horizon  The capacity horizon's weeks.
 * @param {Record<string, WeekReason>} args.weekReasons  The period reasons typed so far.
 * @param {Record<string, RowDraft>} args.drafts  The row drafts edited on this page.
 * @param {(l: ForecastCommitmentLine) => RowDraft} args.rowDraft
 * @param {(l: ForecastCommitmentLine) => ReadRow} args.readRow
 * @returns {PeriodRow[]}
 */
export const buildPeriodRows = ({
  commitLines,
  lines,
  plans,
  supplierId,
  horizon,
  weekReasons,
  drafts,
  rowDraft,
  readRow
}) => {
  /**
   * A line the period's Submit all sends: awaiting, sent back, drafted, or edited here.
   * @param {ForecastCommitmentLine} l
   */
  const isPending = (l) =>
    l.state === 'awaiting' ||
    l.state === 'revisionRequested' ||
    l.draft !== null ||
    drafts[l.key] !== undefined;
  const periodFirsts = [...new Map(commitLines.map((l) => [l.periodBucket, l])).values()].sort(
    (a, b) => a.periodStart.localeCompare(b.periodStart)
  );
  return periodFirsts.map((first) => {
    const bucket = first.periodBucket;
    const all = commitLines.filter((l) => l.periodBucket === bucket);
    const pending = all.filter(isPending);
    // Material C5 (MR-8 BR-04) — a line's capacity group is its material's
    // planning group; the check sums the LTP of the group's materials.
    /** @param {ForecastCommitmentLine} l */
    const capOf = (l) => capacityGroupOfMaterial(plans, supplierId, l.materialCode, materialEntry);
    /** @param {ForecastCommitmentLine} l */
    const groupOfLine = (l) => capOf(l).planningGroupId ?? l.materialCode;
    const groups = [...new Map(all.map((l) => [groupOfLine(l), capOf(l)])).entries()].sort((a, b) =>
      a[0].localeCompare(b[0])
    );
    /** @type {{ group: string; check: PeriodCapacityCheck }[]} */
    const checks = groups.map(([group, cap]) => ({
      group,
      check: periodCapacityCheck(
        cap.plan,
        lines,
        supplierId,
        cap.materials,
        first.periodStart,
        first.periodEnd,
        horizon
      )
    }));
    const red = checks.some((c) => c.check.redWeek !== null);
    const wr = weekReasons[bucket] ?? { reason: '', note: '' };
    /**
     * The row's own reason, else the period's reason when the period is above BE.
     * @param {ForecastCommitmentLine} l
     */
    const rootFor = (l) => {
      const d = rowDraft(l);
      if (d.reason) return { level1: d.reason, note: d.note };
      if (red && wr.reason) return { level1: wr.reason, note: wr.note };
      return undefined;
    };
    /** @param {ForecastCommitmentLine} l */
    const rowBlocked = (l) => {
      const r = readRow(l);
      if (r.qtyValue === null || r.refusal === 'upsideInvalid' || r.refusal === 'qtyRequired')
        return true;
      return shortfallRefusal(l.forecastQty, r.qtyValue, rootFor(l)) !== null;
    };
    /** @type {PeriodRefusal | null} */
    let refusal = null;
    const unconfirmed = checks.find((c) => c.check.unconfirmedWeek !== null);
    if (pending.length === 0) refusal = { kind: 'nothing' };
    else if (unconfirmed) refusal = { kind: 'capacityNotConfirmed', group: unconfirmed.group };
    else {
      for (const l of pending) {
        const c = checks.find((x) => x.group === groupOfLine(l))?.check;
        const capRefusal = c ? commitmentCapacityRefusal(c, rootFor(l)) : null;
        if (capRefusal) {
          refusal = { kind: capRefusal.refusal, group: groupOfLine(l) };
          break;
        }
      }
      if (!refusal && pending.some(rowBlocked)) refusal = { kind: 'row' };
    }
    return { first, bucket, pending, checks, red, wr, rootFor, refusal };
  });
};
