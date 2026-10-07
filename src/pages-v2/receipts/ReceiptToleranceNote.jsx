/** @import React from 'react' */
import { useTranslation } from 'react-i18next';
/** @import { ReceiptLineComparison } from '@services/transitions' */
import { receiptQtyToleranceFor } from '@services/transitions';

// ─────────────────────────────────────────────────────────────────────────────
// CR-25 (BL-45) — what one received quantity means, said in business words on
// both the supplier's and PTI's receipt screens: exact, over (flagged: any
// over-delivery is a decision), short within tolerance (closes), short beyond
// it (flagged; the receipt stays open). The tolerance is read from
// `fulfilmentConfig.js` for the line's material, never written here.
// ─────────────────────────────────────────────────────────────────────────────

/** @type {Record<ReceiptLineComparison['qtyOutcome'], string>} */
const TONE = {
  exact: 'text-text-secondary',
  overWithin: 'text-success',
  shortWithin: 'text-success',
  over: 'text-warning-hover font-semibold',
  shortOver: 'text-warning-hover font-semibold'
};

/** @type {React.FC<{ line: Pick<ReceiptLineComparison, 'materialCode' | 'difference' | 'differencePct' | 'qtyOutcome'>; testId?: string; }>} */
const ReceiptToleranceNote = ({ line, testId }) => {
  const { t } = useTranslation();
  const tol = receiptQtyToleranceFor(line.materialCode);
  return (
    <span className={`text-xs ${TONE[line.qtyOutcome]}`} data-testid={testId}>
      {/* At the decided 0% "any over-delivery, however small" is the true
          sentence; once the administrator allows some (BL-32) it is not. */}
      {t(
        `fc.gr.tol.${line.qtyOutcome === 'over' && tol.overPct > 0 ? 'overBeyond' : line.qtyOutcome}`,
        {
          qty: Math.abs(line.difference).toLocaleString('en-US'),
          pct: line.differencePct === null ? '' : `${line.differencePct.toFixed(2)}%`,
          shortPct: tol.shortPct,
          overPct: tol.overPct
        }
      )}
    </span>
  );
};

export default ReceiptToleranceNote;
