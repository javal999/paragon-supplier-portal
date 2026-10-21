/** @import React from 'react' */

/**
 * @typedef {object} MatchTileProps
 * @property {string} label
 * @property {number} count
 * @property {'success' | 'warning' | 'danger' | 'neutral'} variant
 */

/** @type {Record<MatchTileProps['variant'], string>} */
const MATCH_TILE_CLASS = {
  success: 'bg-success-soft text-success',
  warning: 'bg-warning-soft text-warning-hover',
  danger: 'bg-danger-soft text-danger',
  neutral: 'bg-bg-hover text-text-secondary'
};

/**
 * One tile of the analytics tab's 3-way match summary: a label and a count on
 * a tint chosen by `variant`. Moved out of `BuyerInvoices.jsx` by the Phase 5
 * page split (no behaviour change).
 * @type {React.FC<MatchTileProps>}
 */
const MatchTile = ({ label, count, variant }) => (
  <div className={`rounded-md px-4 py-4 text-center ${MATCH_TILE_CLASS[variant]}`}>
    <div className="text-label uppercase mb-2">{label}</div>
    <div className="text-kpi font-mono tabular-nums">{count}</div>
  </div>
);

export default MatchTile;
