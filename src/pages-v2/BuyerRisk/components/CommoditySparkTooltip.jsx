/** @import React from 'react' */

/**
 * @typedef {object} SparkTooltipPayload
 * @property {string} name
 * @property {number} value
 */

/**
 * The hover tooltip of one commodity sparkline: the commodity name and the
 * hovered value with its unit. Renders nothing while inactive.
 *
 * Props: `active` / `payload` (injected by recharts' `Tooltip`), `unit` and
 * `name` (passed by `CommodityTab`).
 * @type {React.FC<{ active?: boolean; payload?: SparkTooltipPayload[]; unit?: string; name?: string; }>}
 */
const CommoditySparkTooltip = ({ active, payload, unit, name }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-bg-surface border border-border-subtle rounded-md shadow-sm px-2 py-1 text-xs">
      <span className="text-text-secondary">{name}: </span>
      <span className="font-semibold text-text-primary">
        {payload[0].value} {unit}
      </span>
    </div>
  );
};

export default CommoditySparkTooltip;
