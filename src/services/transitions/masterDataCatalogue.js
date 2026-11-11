// ─────────────────────────────────────────────────────────────────────────────
// MASTER DATA FIELD CATALOGUE — PEX-14 (BL-278) [Proposed]. SC-HUB-PLAN-EXECUTION-
// REQUIREMENTS-2026-11 PEX-14: each master field has a definition, a group and a
// mandatory or optional mark; mandatory fields show a marker and block save when
// empty. The OSIP MDM template review by Mba Septi has not happened, so this is an
// educated first catalogue, read only, that she can correct field by field.
//
// SEED [Proposed]: the RFI fields that already exist in code (`RFI_QUESTION_LIBRARY`,
// every RFI template's question once; group = the RFI section; mandatory = the
// question's `required`), plus the three planning parameters the requirement names
// (lead time, MOQ, and the order multiple that carries MPQ) from the engine's
// `MaterialSource`, mandatory because the safety and ROP figures cannot be computed
// without them. Alternative if wrong: the MDM template's own field list.
//
// MARK FIRST, BLOCK LATER [Proposed]: `MASTER_DATA_ENFORCEMENT.mode` is 'mark': a
// mandatory field shows its marker and a missing one is listed, but save is allowed.
// 'block' (not set anywhere) refuses a save with a mandatory field empty, so the
// warning period ends by changing one constant after the planners have fixed their
// records. Alternative: block at once, which breaks incomplete records.
//
// Pure: nothing is stored and no save path is touched yet.
// ─────────────────────────────────────────────────────────────────────────────

/** @import { RfiQuestion } from '../sourcing/types' */

/** @typedef {'planning' | 'capability' | 'experience' | 'facilities' | 'products' | 'compliance' | 'event'} MasterFieldGroup */

/**
 * `labelKey` / `definitionKey`: i18n keys (RFI fields use the question's prompt as the definition).
 * `source`: where the seed came from.
 * @typedef {{
 *   readonly id: string;
 *   readonly source: 'rfi' | 'engine';
 *   readonly labelKey: string;
 *   readonly definitionKey: string;
 *   readonly group: MasterFieldGroup;
 *   readonly mandatory: boolean;
 * }} MasterField
 */

/** The groups in page order. @type {readonly MasterFieldGroup[]} */
export const MASTER_FIELD_GROUPS = Object.freeze([
  'planning',
  'capability',
  'experience',
  'facilities',
  'products',
  'compliance',
  'event'
]);

/**
 * The planning parameters of `MaterialSource` (engine/types): lead time in days, MOQ, and the
 * order multiple (MPQ until the master data feed carries MPQ).
 * @type {readonly MasterField[]}
 */
export const PLANNING_FIELDS = Object.freeze([
  ...['leadTimeDays', 'moq', 'orderMultiple'].map((id) =>
    Object.freeze({
      id,
      source: /** @type {const} */ ('engine'),
      labelKey: `pex.md.field.${id}`,
      definitionKey: `pex.md.def.${id}`,
      group: /** @type {const} */ ('planning'),
      mandatory: true
    })
  )
]);

/**
 * The catalogue: the planning fields, then one row per RFI question.
 * @param {readonly RfiQuestion[]} rfiQuestions  `RFI_QUESTION_LIBRARY`.
 * @returns {readonly MasterField[]}
 */
export function buildMasterFieldCatalogue(rfiQuestions) {
  const rfi = rfiQuestions.map(
    (q) =>
      /** @type {MasterField} */ ({
        id: q.id,
        source: 'rfi',
        labelKey: q.promptKey,
        definitionKey: q.promptKey,
        group: /** @type {MasterFieldGroup} */ (
          MASTER_FIELD_GROUPS.includes(/** @type {MasterFieldGroup} */ (q.sectionId))
            ? q.sectionId
            : 'event'
        ),
        mandatory: q.required
      })
  );
  return [...PLANNING_FIELDS, ...rfi];
}

/**
 * Enforcement of the mandatory mark. 'mark': show it, never refuse. 'block': refuse a save with a
 * mandatory field empty. [Proposed]: 'mark' until the planners have completed their records.
 * @type {{ readonly mode: 'mark' | 'block' }}
 */
export const MASTER_DATA_ENFORCEMENT = Object.freeze({ mode: 'mark' });

/**
 * The mandatory fields a record leaves empty. A value is empty when it is null, undefined, an
 * empty or blank string, or an empty array; 0 and false are values.
 * @param {Readonly<Record<string, unknown>>} record
 * @param {readonly MasterField[]} catalogue
 * @returns {string[]}  Field ids.
 */
export function missingMandatory(record, catalogue) {
  return catalogue
    .filter((f) => f.mandatory)
    .filter((f) => {
      const v = record[f.id];
      return (
        v === null ||
        v === undefined ||
        (typeof v === 'string' && v.trim() === '') ||
        (Array.isArray(v) && v.length === 0)
      );
    })
    .map((f) => f.id);
}

/**
 * What a save of a record would do: 'allow' (nothing missing, or the warning period), or 'block'.
 * The one function a save path calls, so ending the warning period changes no caller.
 * @param {readonly string[]} missing  From `missingMandatory`.
 * @param {'mark' | 'block'} [mode]
 * @returns {'allow' | 'block'}
 */
export const saveVerdict = (missing, mode = MASTER_DATA_ENFORCEMENT.mode) =>
  mode === 'block' && missing.length > 0 ? 'block' : 'allow';
