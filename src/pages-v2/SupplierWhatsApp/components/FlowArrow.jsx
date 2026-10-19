/** @import React from 'react' */

/**
 * The down-arrow between two `FlowBox` stages, with an optional `label` above it.
 */
/** @type {React.FC<{ label?: string }>} */
const FlowArrow = ({ label }) => (
  <div className="flex flex-col items-center my-1">
    {label && (
      <span className="text-[length:var(--fs-caption-1)] text-text-tertiary font-semibold mb-1">
        {label}
      </span>
    )}
    <div className="w-0.5 h-4 bg-border-input" />
    <div
      style={{
        width: 0,
        height: 0,
        borderLeft: '5px solid transparent',
        borderRight: '5px solid transparent',
        borderTop: '7px solid #D1D8E0'
      }}
    />
  </div>
);

export default FlowArrow;
