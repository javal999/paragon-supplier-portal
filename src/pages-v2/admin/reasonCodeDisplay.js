import { useSyncExternalStore } from 'react';
import { useTranslation } from 'react-i18next';
/** @import { ReasonListId } from '@services/transitions/reasonCodes' */
import {
  BUILT_IN_LABEL_PREFIX,
  BUILT_IN_RECORD_LABEL_PREFIX,
  activeReasonCodes,
  reasonCodeStore
} from '@services/transitions/reasonCodes';

// ─────────────────────────────────────────────────────────────────────────────
// REASON CODES ON SCREEN — BL-32. The ONE way a page names a reason code and
// the ONE way a picker lists the codes it offers, so every surface follows the
// administrator's list in force.
//
//   · A picker offers ACTIVE codes only (`useActiveReasonCodes`).
//   · A record shows its code's label, marked "(retired)" when the code has
//     been retired since — never a blank, never the raw code where a label
//     exists. A code the list has never held (a record older than the list)
//     shows the code itself, honestly, rather than a guessed label.
// ─────────────────────────────────────────────────────────────────────────────

/** @returns {number} */
function useReasonCodesVersion() {
  return useSyncExternalStore(
    reasonCodeStore.subscribe,
    reasonCodeStore.version,
    reasonCodeStore.version
  );
}

/**
 * The codes a NEW answer may carry, in order, re-read when the list changes.
 * @param {ReasonListId} list
 * @returns {string[]}
 */
export function useActiveReasonCodes(list) {
  useReasonCodesVersion();
  return activeReasonCodes(list);
}

/**
 * Where a label is shown: `form` is a picker offering the code (its label may
 * carry a hint such as "(note required)"); `record` is a recorded answer, a
 * filter over records or a count, which reads the reason's name only (BL-156).
 */
/** @typedef {'form' | 'record'} ReasonLabelUse */

/**
 * `(list, code, use?) => label` in the page's language, "(retired)" when retired.
 * @returns {(list: ReasonListId, code: string | undefined | null, use?: ReasonLabelUse) => string}
 */
export function useReasonLabel() {
  const { t, i18n } = useTranslation();
  useReasonCodesVersion();
  const indonesian = i18n.language === 'id';
  return (list, code, use = 'form') => {
    if (!code) return '';
    const entry = reasonCodeStore.get(list, code);
    if (!entry) return code;
    /** @returns {string} */
    const formLabel = () => t(`${BUILT_IN_LABEL_PREFIX[list]}${code}`, { defaultValue: code });
    const recordPrefix = BUILT_IN_RECORD_LABEL_PREFIX[list];
    // BL-156 — a built-in code's record name, from its own key; the form label
    // when the code has none. An administrator's label is used as typed.
    const label =
      entry.labelEn !== undefined
        ? ((indonesian ? entry.labelId : entry.labelEn) ?? code)
        : use === 'record' && recordPrefix
          ? t(`${recordPrefix}${code}`, { defaultValue: formLabel() })
          : formLabel();
    return entry.active ? label : t('adminRsn.retiredLabel', { label });
  };
}
