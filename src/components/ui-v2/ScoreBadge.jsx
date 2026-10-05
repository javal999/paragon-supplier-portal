/** @import * as React from 'react' */
import { CHART_GRID, CHART_SERIES } from '@lib/chartPalette';
// DP-2: a score bar/dial is single-accent teal — the number conveys the value,
// the colour is not a decision signal (ranking is carried by the number and, in
// comparisons, the top-ranked column highlight). Semantic red/amber/green is
// reserved for true state elsewhere, not for decorating a 0–100 score.
/** @type {ToneStyle} */
const TONE = {
  text: 'text-teal-hover', // BL-31: teal as TEXT uses the text arm (AA); stroke stays DEFAULT
  stroke: CHART_SERIES[0], // teal brand accent — byte-identical, now sourced
  bg: 'bg-teal-soft'
};
/** @type {Record<Size, { px: number; stroke: number; font: string }>} */
const CIRCULAR_SIZE = {
  sm: { px: 40, stroke: 4, font: 'text-xs' },
  md: { px: 64, stroke: 6, font: 'text-base' },
  lg: { px: 96, stroke: 8, font: 'text-xl' }
};
/**
 * @param {ScoreBadgeProps} props
 * @returns {React.ReactNode}
 */
const ScoreBadge = ({ score, label, size = 'md', variant = 'circular', className = '' }) => {
  const clamped = Math.max(0, Math.min(100, score));
  const t = TONE;
  if (variant === 'bar') {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        <div className="flex-1 h-2 rounded-full bg-bg-hover overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{ width: `${clamped}%`, backgroundColor: t.stroke }}
          />
        </div>
        <span className={`text-xs font-semibold tabular-nums ${t.text}`}>{clamped}</span>
        {label ? <span className="text-xs text-text-tertiary">{label}</span> : null}
      </div>
    );
  }
  const { px, stroke, font } = CIRCULAR_SIZE[size];
  const radius = (px - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;
  return (
    <div className={`inline-flex flex-col items-center ${className}`}>
      <div className="relative" style={{ width: px, height: px }}>
        <svg
          width={px}
          height={px}
          className="-rotate-90"
          viewBox={`0 0 ${px} ${px}`}
          aria-hidden="true"
        >
          <circle
            cx={px / 2}
            cy={px / 2}
            r={radius}
            fill="none"
            stroke={CHART_GRID}
            strokeWidth={stroke}
          />
          <circle
            cx={px / 2}
            cy={px / 2}
            r={radius}
            fill="none"
            stroke={t.stroke}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 300ms ease-out' }}
          />
        </svg>
        <div
          className={`absolute inset-0 flex items-center justify-center font-semibold tabular-nums ${font} ${t.text}`}
        >
          {clamped}
        </div>
      </div>
      {label ? <span className="text-xs text-text-tertiary mt-1 text-center">{label}</span> : null}
    </div>
  );
};
export default ScoreBadge;
/** @typedef {'sm' | 'md' | 'lg'} Size */
/** @typedef {'circular' | 'bar'} Variant */
/**
 * @typedef {Object} ScoreBadgeProps
 * @property {number} score
 * @property {string} [label]
 * @property {Size} [size]
 * @property {Variant} [variant]
 * @property {string} [className]
 */
/**
 * @typedef {Object} ToneStyle
 * @property {string} text
 * @property {string} stroke
 * @property {string} bg
 */
