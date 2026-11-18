/** @import * as React from 'react' */
/** @import { LucideIcon } from 'lucide-react' */
/** @import { TermLabelId } from '@lib/glossary' */
import { useId } from 'react';
import TermLabel from './TermLabel';

// ─────────────────────────────────────────────────────────────────────────────
// BL-322 (WCAG 4.1.2, found with BL-320) — a clickable card is ONE control.
//
// Before, a clickable card WAS a <button>, and the term's (i) was rendered
// inside it (`TermLabel` → `TermTip` → <button>): a button inside a button.
// That is invalid HTML (React logs "In HTML, <button> cannot be a descendant of
// <button>") and two controls a screen reader can merge into one name.
//
// Now the card is a <div>. One stretched <button> covers it and owns the card's
// action; the content (label, the (i), value, subtitle) is a SIBLING layer above
// the button, `pointer-events-none`, so a click anywhere on the card reaches the
// button. `TermTip` re-enables pointer events on the (i) itself, so the (i)
// stays its own control, keeps its own name, and its click never applies the
// card (BL-320's guard, unchanged).
//
// THE CARD'S NAME IS ITS OWN CONTENT (`aria-labelledby` over the label text, the
// value and the subtitle) — the same words the card showed before. It no longer
// swallows the (i)'s aria-label, which is the point of separating the two
// controls; WD-16 and BL-322 record that the name changes by design.
//
// `data-tip-host` marks the card surface for TermTip: BL-319 fits an open tip
// inside the card its label sits in, and the label no longer sits in a control.
// Only a clickable card carries it, so a card with no action behaves as before.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @typedef {Object} KpiCardProps
 * @property {string} [eyebrow] The title. Give `term` instead for a glossary term (BL-233).
 * @property {TermLabelId} [term] BL-233 BR-05: the title is the term's label, with its (i).
 * @property {React.ReactNode} value
 * @property {React.ReactNode} [subtitle]
 * @property {LucideIcon} [icon]
 * @property {string} [className]
 * @property {() => void} [onClick]
 * @property {boolean} [active]
 */

/**
 * @param {KpiCardProps} props
 * @returns {React.ReactNode}
 */
const KpiCard = ({
  eyebrow,
  term,
  value,
  subtitle,
  icon: Icon,
  className = '',
  onClick,
  active = false
}) => {
  // The button is empty, so its name comes from the content it covers: the ids
  // let `aria-labelledby` read the label text, the value and the subtitle — and
  // nothing else (not the (i), not the hidden tip body).
  const id = useId();
  const labelId = `${id}-label`;
  const valueId = `${id}-value`;
  const subtitleId = `${id}-subtitle`;

  const baseClass = `relative rounded-lg p-6 shadow-sm border text-left ${
    active ? 'bg-action-soft border-action' : 'bg-bg-surface border-border-subtle'
  } ${className}`;

  const fields = (
    <>
      <div className="text-eyebrow text-text-tertiary uppercase">
        {term ? <TermLabel term={term} textId={labelId} /> : <span id={labelId}>{eyebrow}</span>}
      </div>
      <div id={valueId} className="text-kpi font-mono tabular-nums text-data-navy mt-3">
        {value}
      </div>
      {subtitle ? (
        <div id={subtitleId} className="text-meta text-text-secondary mt-2">
          {subtitle}
        </div>
      ) : null}
    </>
  );

  if (onClick) {
    return (
      <div className={baseClass} data-tip-host="">
        <button
          type="button"
          onClick={onClick}
          aria-pressed={active}
          aria-labelledby={[labelId, valueId, subtitle ? subtitleId : null]
            .filter(Boolean)
            .join(' ')}
          className="absolute inset-0 w-full cursor-pointer rounded-lg transition-colors hover:bg-bg-hover focus:outline-none focus:ring-2 focus:ring-action/40"
        />
        {Icon ? (
          <Icon
            size={18}
            className="pointer-events-none absolute top-5 right-5 text-text-tertiary"
          />
        ) : null}
        <div className="relative pointer-events-none">{fields}</div>
      </div>
    );
  }

  return (
    <div className={baseClass}>
      {Icon ? <Icon size={18} className="absolute top-5 right-5 text-text-tertiary" /> : null}
      {fields}
    </div>
  );
};

export default KpiCard;
