// Pure helpers for the RFQ authoring controls (no React).
// Split out of `sourcing/RfqAuthoring.jsx` (frontend-standard Phase 5).

/** @import { TFunction } from 'i18next' */
/** @import { RfqSpecField } from '@services/sourcing/rfqModel' */
import { refusalCode } from '@services/sourcing/rfqModel';

/**
 * The words for a `CODE: detail` refusal, through the step-refusal keys.
 * @param {TFunction} t
 * @param {string} reason
 * @returns {string}
 */
export function refusalMessage(t, reason) {
  const key = `rfqAuthoring.refusal.${refusalCode(reason)}`;
  const text = t(key);
  return text === key ? reason : text;
}

/**
 * The label a spec field shows: its i18n key, else its own label, else its key.
 * @param {TFunction} t
 * @param {RfqSpecField} f
 * @returns {string}
 */
export const fieldLabel = (t, f) => (f.labelKey ? t(f.labelKey) : (f.label ?? f.key));
