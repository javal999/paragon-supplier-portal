/** @import React from 'react' */
/** @import { Grade } from '../const' */

/** @type {Record<Grade, { stroke: string; soft: string }>} */
const GRADE_TONE = {
  A: { stroke: '#107E3E', soft: '#E8F5EC' },
  B: { stroke: '#1E5BAE', soft: '#E5F0FF' },
  C: { stroke: '#B45309', soft: '#FEF3D6' },
  D: { stroke: '#BB0000', soft: '#FCE4E4' },
  F: { stroke: '#BB0000', soft: '#FCE4E4' }
};

/**
 * The supplier's scorecard grade as a square letter tile, toned by
 * `GRADE_TONE` (a separate axis from the DP2 target system). `size="sm"` is
 * the performance-panel variant; the default is the identity-card one.
 * @type {React.FC<{ grade: Grade; size?: 'sm' | 'md' }>}
 */
const GradeBadge = ({ grade, size = 'md' }) => {
  const tone = GRADE_TONE[grade];
  const px = size === 'sm' ? 'w-10 h-10 text-base' : 'w-16 h-16 text-3xl';
  return (
    <div
      className={`rounded-md flex items-center justify-center font-semibold ${px}`}
      style={{
        background: tone.soft,
        color: tone.stroke,
        border: `3px solid ${tone.stroke}`
      }}
    >
      {grade}
    </div>
  );
};

export default GradeBadge;
