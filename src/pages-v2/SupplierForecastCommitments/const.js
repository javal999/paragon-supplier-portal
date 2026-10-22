// SupplierForecastCommitments — the page's shared typedefs.
// Moved out of the page file unchanged (frontend-standard Phase 5 split). This
// file holds the types its sections and hooks share, and the page's tab ids
// (P-04).

/** @import { CapacityReason, ForecastCommitmentLine } from '@services/data/types' */
/** @import { CommitmentCapacityRefusal, PeriodCapacityCheck } from '@services/transitions/capacityRules' */
/** @import { CommitmentRowRefusal, ShortfallRefusal } from '@services/transitions/forecastRules' */

/** @import { ForecastCommandVars } from '@services/query/commandHooks' */

/** @typedef {'forecast' | 'changes'} ViewMode */

/**
 * P-04 (IA-S03) — the page's tabs: the commitments (the default), and the
 * responses and shipment reports that had their own page at
 * /supplier/forecasts/responses. `?tab=responses` opens the second.
 * @typedef {'commitments' | 'responses'} PageTab
 */
/** @type {readonly PageTab[]} */
export const PAGE_TABS = ['commitments', 'responses'];

/**
 * The forecast runner (`useForecastRunner().run`): sends one act, toasts when
 * given a success text, and resolves with whether it landed.
 * @typedef {(vars: ForecastCommandVars, success?: string) => Promise<{ ok: boolean; reason?: string }>} ForecastRun
 */

/**
 * A reason code's label (`useReasonLabel()`).
 * @typedef {ReturnType<typeof import('../admin/reasonCodeDisplay').useReasonLabel>} ReasonLabel
 */

/**
 * @typedef {object} RowDraft
 * @property {string} qty
 * @property {string} upside
 * @property {CapacityReason | ''} reason
 * @property {string} note
 */

/**
 * @typedef {object} WeekReason
 * @property {CapacityReason | ''} reason
 * @property {string} note
 */

/**
 * @typedef {| { kind: CommitmentCapacityRefusal; group: string }
 *   | { kind: 'row' }
 *   | { kind: 'nothing' }} PeriodRefusal
 */

/**
 * @typedef {object} UploadResult
 * @property {number} saved
 * @property {{ row: number; materialCode: string; period: string; reason?: CommitmentRowRefusal; message?: string }[]} refused
 */

/**
 * What a row's draft reads as: the draft itself, its parsed quantity and
 * upside (null when unreadable), and the first refusal the row's inputs earn.
 * @typedef {object} ReadRow
 * @property {RowDraft} d
 * @property {number | null} qtyValue
 * @property {number | null} upsideValue
 * @property {'qtyRequired' | 'upsideInvalid' | ShortfallRefusal | null} refusal
 */

/**
 * The root cause a line is submitted with, when it has one.
 * @typedef {{ level1: CapacityReason; note: string }} RootCause
 */

/**
 * One period of the BL-133 "Submit all" table: its first line, its bucket,
 * the lines Submit all sends, the capacity check per group, whether any group
 * is above BE, the period's own reason, the root cause each line goes with,
 * and why Submit all is refused (null when it is not).
 * @typedef {object} PeriodRow
 * @property {ForecastCommitmentLine} first
 * @property {string} bucket
 * @property {ForecastCommitmentLine[]} pending
 * @property {{ group: string; check: PeriodCapacityCheck }[]} checks
 * @property {boolean} red
 * @property {WeekReason} wr
 * @property {(l: ForecastCommitmentLine) => RootCause | undefined} rootFor
 * @property {PeriodRefusal | null} refusal
 */

export {};
