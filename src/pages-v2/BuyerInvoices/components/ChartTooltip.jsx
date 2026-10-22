/** @import React from 'react' */

/**
 * @typedef {object} ChartTooltipPayload
 * @property {string} name
 * @property {number} value
 * @property {string} [color]
 */
/**
 * @typedef {object} ChartTooltipProps
 * @property {boolean} [active]
 * @property {ChartTooltipPayload[]} [payload]
 * @property {string} [label]
 * @property {string} [suffix]
 */

/**
 * The recharts tooltip for the analytics and aging bar charts: the bucket label
 * and one `Rp {value}{suffix}` line per series. Recharts passes `active`,
 * `payload` and `label`. Moved out of `BuyerInvoices.jsx` by the Phase 5 page
 * split (no behaviour change).
 * @type {React.FC<ChartTooltipProps>}
 */
const ChartTooltip = ({
  active,
  payload,
  label,
  // i18n-defer: an IDR magnitude unit (`juta`, millions) that renders after
  // `Rp` — already Indonesian, and identical in both locales.
  suffix = 'jT'
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-bg-surface border border-border-subtle rounded-md shadow-sm px-3 py-2 text-xs">
      <div className="font-semibold text-text-primary mb-1">{label}</div>
      {payload.map((p) => (
        <div key={p.name} style={{ color: p.color }}>
          {p.name}: Rp {p.value}
          {suffix}
        </div>
      ))}
    </div>
  );
};

export default ChartTooltip;
