/** @import React from 'react' */
import { useTranslation } from 'react-i18next';
import { CHART_SERIES } from '@lib/chartPalette';
/** @import { OpenRFQ } from '../utils' */

/** @type {{ key: keyof OpenRFQ['evaluationCriteria']; labelKey: string; color: string; }[]} */
const EVAL_SEGMENTS = [
  // DP-2: single teal→navy ramp (chartPalette CHART_SERIES), not a rainbow.
  { key: 'price', labelKey: 'rfqs.eval.price', color: CHART_SERIES[0] },
  { key: 'leadTime', labelKey: 'rfqs.eval.leadTime', color: CHART_SERIES[1] },
  { key: 'reliability', labelKey: 'rfqs.eval.reliability', color: CHART_SERIES[2] }
];

/**
 * The evaluation-criteria bar on an RFQ card: one segment per CR-15 weight and a
 * legend naming each with its percentage. `criteria` is the card's
 * `evaluationCriteria` (the platform's weights, never restated per RFQ).
 * @type {React.FC<{ criteria: OpenRFQ['evaluationCriteria'] }>}
 */
const EvalBar = ({ criteria }) => {
  const { t } = useTranslation();
  return (
    <div>
      <div className="flex h-2 rounded-full overflow-hidden mb-2">
        {EVAL_SEGMENTS.map((seg) => (
          <div
            key={seg.key}
            style={{ width: `${criteria[seg.key]}%`, background: seg.color }}
            title={`${t(seg.labelKey)}: ${criteria[seg.key]}%`}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-3">
        {EVAL_SEGMENTS.map((seg) => (
          <span
            key={seg.key}
            className="inline-flex items-center gap-1.5 text-[10px] text-text-tertiary"
          >
            <span className="inline-block w-2 h-2 rounded-full" style={{ background: seg.color }} />
            {t(seg.labelKey)} {criteria[seg.key]}%
          </span>
        ))}
      </div>
    </div>
  );
};

export default EvalBar;
