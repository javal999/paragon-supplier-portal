/** @import React from 'react' */
import Data from '@components/ui-v2/Data';

/**
 * One centred figure + caption in the supply-exposure summary strip, coloured
 * by `tone`.
 *
 * Props: `label` (the caption), `value` (the pre-formatted figure) and `tone`
 * (danger / warning / success text colour).
 * @type {React.FC<{ label: string; value: string; tone: 'danger' | 'warning' | 'success'; }>}
 */
const SummaryStat = ({ label, value, tone }) => (
  <div className="text-center py-2 border-r border-border-subtle last:border-r-0">
    <Data
      as="div"
      className={`text-kpi ${
        tone === 'danger'
          ? 'text-danger'
          : tone === 'warning'
            ? 'text-warning-hover'
            : 'text-success'
      }`}
    >
      {value}
    </Data>
    <div className="text-meta text-text-tertiary mt-1">{label}</div>
  </div>
);

export default SummaryStat;
