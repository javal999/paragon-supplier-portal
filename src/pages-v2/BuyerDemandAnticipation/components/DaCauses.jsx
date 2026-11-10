/** @import React from 'react' */
/** @import { TFunction } from 'i18next' */
import { useTranslation } from 'react-i18next';
import StatusPill from '@components/ui-v2/StatusPill';
import { formatNumber } from '@lib/format';
import { daCauseText } from '@services/transitions/daCauseRules';
/** @import { DaCause } from '@services/transitions/daCauseRules' */

// ─────────────────────────────────────────────────────────────────────────────
// BL-268 (PEX-6) — the causes of a DA version, as lines of text, and the
// "Out of date" note on a card whose published DA an input change moved. The
// words of the inputs are the PEX doc's: LTP A, LTP Festive, LTP B, LTP choice,
// safety stock. Every cause is the read's; none is derived here.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @param {readonly DaCause[]} causes
 * @param {TFunction} t
 * @returns {string[]}
 */
export const causeLines = (causes, t) =>
  causes.map((c) => daCauseText(c, (k) => t(`daCause.kind.${k}`), formatNumber));

/**
 * @type {React.FC<{ causes: readonly DaCause[]; testId: string }>}
 */
export const OutOfDateNote = ({ causes, testId }) => {
  const { t } = useTranslation();
  return (
    <div className="px-4 pb-2 flex flex-wrap items-baseline gap-2" data-testid={testId}>
      <StatusPill variant="warning">{t('daCause.outOfDate')}</StatusPill>
      <span className="text-xs text-text-secondary">
        {t('daCause.because')} {causeLines(causes, t).join(' · ')}
      </span>
    </div>
  );
};
