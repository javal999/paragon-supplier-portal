/** @import React from 'react' */
/** @import { Grade } from '../const' */

/** @type {Record<Grade, { stroke: string; soft: string }>} */
const GRADE_TONE = {
  A: {
    stroke: 'var(--pds-color-feedback-success)',
    soft: 'var(--pds-color-feedback-success-background)'
  },
  B: {
    stroke: 'var(--pds-color-feedback-info)',
    soft: 'var(--pds-color-feedback-info-background)'
  },
  C: {
    stroke: 'var(--pds-color-feedback-warning)',
    soft: 'var(--pds-color-feedback-warning-background)'
  },
  D: {
    stroke: 'var(--pds-color-feedback-danger)',
    soft: 'var(--pds-color-feedback-danger-background)'
  },
  F: {
    stroke: 'var(--pds-color-feedback-danger)',
    soft: 'var(--pds-color-feedback-danger-background)'
  }
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
