import { useSyncExternalStore } from 'react';
import { useTranslation } from 'react-i18next';
import {
  BUILT_IN_LABEL_PREFIX,
  activeReasonCodes,
  reasonCodeStore,
  type ReasonListId,
} from '../../services/transitions/reasonCodes';

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

function useReasonCodesVersion(): number {
  return useSyncExternalStore(reasonCodeStore.subscribe, reasonCodeStore.version, reasonCodeStore.version);
}

/** The codes a NEW answer may carry, in order, re-read when the list changes. */
export function useActiveReasonCodes(list: ReasonListId): string[] {
  useReasonCodesVersion();
  return activeReasonCodes(list);
}

/** `(list, code) => label` in the page's language, "(retired)" when retired. */
export function useReasonLabel(): (list: ReasonListId, code: string | undefined | null) => string {
  const { t, i18n } = useTranslation();
  useReasonCodesVersion();
  const indonesian = i18n.language === 'id';
  return (list, code) => {
    if (!code) return '';
    const entry = reasonCodeStore.get(list, code);
    if (!entry) return code;
    const label =
      entry.labelEn !== undefined
        ? (indonesian ? entry.labelId : entry.labelEn) ?? code
        : t(`${BUILT_IN_LABEL_PREFIX[list]}${code}`, { defaultValue: code });
    return entry.active ? label : t('adminRsn.retiredLabel', { label });
  };
}
