/** @import React from 'react' */

/**
 * One stage of a channel's process-flow diagram: a light card with a 3px left
 * edge in `accent` (a Tailwind `border-l-*` class), a `title` and a `sub` line.
 */
// DP2-FLAG-01 accent-edge — exactly the dashboard-widget signature: a light card,
// thin border, and a 3px LEFT edge keyed to the stage's role (navy = SAP source,
// teal = engine/parser, neutral = channel, success/warning = the fork). Replaces
// the saturated solid fills; the messenger-chrome greens/reds are now used ONLY
// by the LEFT channel mockups (D-2), never by these right-side bands.
/** @type {React.FC<{ accent: string; title: string; sub: string; }>} */
const FlowBox = ({ accent, title, sub }) => (
  <div
    className={`bg-bg-surface border border-border-subtle border-l-[3px] ${accent} rounded-lg px-4 py-3`}
  >
    <div className="text-sm font-bold text-text-primary">{title}</div>
    <div className="text-xs leading-snug mt-0.5 text-text-secondary">{sub}</div>
  </div>
);

export default FlowBox;
