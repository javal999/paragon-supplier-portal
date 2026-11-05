// ─────────────────────────────────────────────────────────────────────────────
// DRC-17 (BL-202) — what the What-if sandbox page derives for display: a
// headline figure as text, its difference from the current plan ("PR
// +120,000", "first shortage W41 → W38"), the "Provisional" label, and a
// number field. No figure is computed here; every number is `runWhatIf`'s.
// ─────────────────────────────────────────────────────────────────────────────

/** @import React from 'react' */
/** @import { TFunction } from 'i18next' */
/** @import { HeadlineDiff, HeadlineKey } from '@services/transitions/whatIfSandboxRules' */
import { useTranslation } from 'react-i18next';
import { formatNumber } from '@lib/format';
import { HEADLINE_QUESTIONS } from '@services/transitions/whatIfSandboxRules';
import { provisionalBasis } from '@components/forecast/provisionalBasis';
import { inputClass, labelClass } from '../inventory/inventoryDisplay';
import { signedDelta, weekLabel } from '../BuyerDemandAnticipation/display';

/** The headline figures that are a week rather than a quantity. */
const WEEK_KEYS = /** @type {readonly HeadlineKey[]} */ (['firstShortageWeek']);

/**
 * A headline figure as text: a quantity, a week (`W42`), "None" for no
 * shortage week, or "Not available".
 * @param {HeadlineKey} key
 * @param {number | string | null} value
 * @param {TFunction} t
 * @returns {string}
 */
export function figureText(key, value, t) {
  if (WEEK_KEYS.includes(key))
    return typeof value === 'string' ? weekLabel(value) : t('whatIf.none');
  return typeof value === 'number' ? formatNumber(value) : t('whatIf.notAvailable');
}

/**
 * DRC-17 BR-03 — the difference from the current plan: `+120,000`, `W41 → W38`,
 * or "no change".
 * @param {HeadlineDiff} d
 * @param {TFunction} t
 * @returns {string}
 */
export function diffText(d, t) {
  if (!d.changed) return t('whatIf.unchanged');
  if (d.delta !== null) return signedDelta(d.delta) ?? t('whatIf.unchanged');
  return t('whatIf.weekShift', {
    from: figureText(d.key, d.plan, t),
    to: figureText(d.key, d.scenario, t)
  });
}

/**
 * Design rule 5 — "Provisional: rule awaiting Material Planning (…)" under a
 * figure built on a [Default], the label BL-203 uses.
 * @type {React.FC<{ figure: HeadlineKey; testId: string }>}
 */
export const Provisional = ({ figure, testId }) => {
  const { t } = useTranslation();
  // Every question behind the figure is answered: no label.
  if (HEADLINE_QUESTIONS[figure].length === 0) return null;
  return (
    <span className="block text-xs text-warning-hover" data-testid={testId}>
      {t('ltpFg.provisional', { question: provisionalBasis(HEADLINE_QUESTIONS[figure], t) })}
    </span>
  );
};

/**
 * A number input. Blank reads as null when `blank` is allowed, else as 0.
 * @type {React.FC<{
 *   id: string;
 *   label: string;
 *   value: number | null;
 *   onChange: (value: number | null) => void;
 *   blank?: boolean;
 *   note?: React.ReactNode;
 *   step?: string;
 * }>}
 */
export const NumberField = ({ id, label, value, onChange, blank = false, note, step }) => (
  <div>
    <label htmlFor={id} className={labelClass}>
      {label}
    </label>
    <input
      id={id}
      type="number"
      step={step ?? 'any'}
      className={inputClass}
      value={value ?? ''}
      data-testid={id}
      onChange={(e) => {
        const raw = e.target.value;
        if (raw === '') onChange(blank ? null : 0);
        else {
          const n = Number(raw);
          if (Number.isFinite(n)) onChange(n);
        }
      }}
    />
    {note ? <span className="block text-xs text-text-tertiary mt-0.5">{note}</span> : null}
  </div>
);

/**
 * A section card with a title.
 * @type {React.FC<{ title: string; testId: string; children: React.ReactNode }>}
 */
export const Section = ({ title, testId, children }) => (
  <section
    className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm p-4"
    data-testid={testId}
  >
    <h2 className="text-sm font-semibold text-text-primary mb-3">{title}</h2>
    {children}
  </section>
);
