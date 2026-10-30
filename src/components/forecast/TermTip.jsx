/** @import React from 'react' */
import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Info } from 'lucide-react';
/** @import { PlanningTerm, TermEntry } from '@lib/glossary' */
import { PLANNING_TERM_GLOSSARY } from '@lib/glossary';
import { FOCUS_RING } from './focusRing';

// ─────────────────────────────────────────────────────────────────────────────
// TERM TIP — F-09 (Forecast UX phase 1, task A4).
//
// A point-of-use definition for a planning term (Firm, Trade-off, MASC,
// tracking signal, reorder point, P50/P90). The sentence is read from the
// glossary entry (`lib/glossary/planning.glossary.js`) in the active language,
// so the tip and the glossary page show the same words and a correction is one
// edit. The tip opens on hover and on keyboard focus of its info button.
//
// Phase 3, task C2 (accessibility):
//   · WCAG 2.4.7 — the info button draws a focus ring; a colour change on a
//     12 px icon was the only sign of focus before.
//   · WCAG 1.4.13 — Escape hides an open tip without moving focus or the
//     pointer; it shows again on the next focus or hover.
//   · WCAG 1.4.10 — a closed tip is `display: none`, not `invisible`: an
//     invisible 256 px box still widened the page, so 4 pages scrolled sideways
//     at 390 and 768 px. An open tip is capped to the screen width.
//   · Target size — the button's hit area is 24 px, and 44 px on a touch
//     screen, through a transparent pseudo-element, so the layout is unchanged.
// The sentence stays in the DOM while hidden: the button's
// `aria-describedby` reads it from there.
//
// BL-233 (TL-R2) — generalised from the planning vocabulary to any glossary
// entry. Pass `term` for a planning term, or `entry` (a `TermEntry`) with the
// `name` the button announces, as `TermLabel` does. An entry's tip shows, in
// this order and each only when the entry has it, the definition, "How it is
// calculated", "Also called" (each name with its source) and "Not" (BR-07).
// ─────────────────────────────────────────────────────────────────────────────

/**
 * `children`:  The label the tip explains; without it only the info button renders.
 * `entry`:     A glossary entry with tooltip lines (BL-233); used instead of `term`.
 * `name`:      What the button announces for an `entry` (the visible label).
 * `slugId`:    The `data-testid` suffix for an `entry` (its glossary key).
 *
 * @typedef {{
 *     readonly term?: PlanningTerm;
 *     readonly entry?: TermEntry;
 *     readonly name?: string;
 *     readonly slugId?: string;
 *     readonly children?: React.ReactNode;
 *     readonly className?: string;
 *   }} TermTipProps
 */

/** @param {string} term */
const slug = (term) =>
  term
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-');

const HIT_AREA =
  "relative before:absolute before:-inset-1.5 before:content-[''] [@media(pointer:coarse)]:before:-inset-4";

/** @type {React.FC<TermTipProps>} */
const TermTip = ({ term, entry: termEntry, name, slugId, children, className = '' }) => {
  const { t, i18n } = useTranslation();
  const id = useId();
  const [dismissed, setDismissed] = useState(false);
  const indonesian = i18n.language?.toLowerCase().startsWith('id') ?? false;
  /** @param {{ en: string; id: string }} text */
  const pick = (text) => (indonesian ? text.id : text.en);
  const entry = termEntry ?? PLANNING_TERM_GLOSSARY[/** @type {PlanningTerm} */ (term)];
  const announced = name ?? term ?? '';
  return (
    <span
      className={`group relative inline-flex items-center gap-1 ${className}`}
      data-testid={`term-tip-${slug(slugId ?? term ?? '')}`}
      data-dismissed={dismissed ? 'true' : 'false'}
      onMouseLeave={() => setDismissed(false)}
    >
      {children ? (
        <span className="underline decoration-dotted underline-offset-2">{children}</span>
      ) : null}
      <button
        type="button"
        aria-label={t('fux.term.aria', { term: announced })}
        aria-describedby={id}
        className={`${HIT_AREA} rounded-sm text-text-tertiary hover:text-action-hover focus:text-action-hover ${FOCUS_RING}`}
        onKeyDown={(e) => {
          if (e.key === 'Escape' && !dismissed) {
            e.stopPropagation();
            setDismissed(true);
          }
        }}
        onFocus={() => setDismissed(false)}
      >
        <Info size={12} aria-hidden="true" />
      </button>
      <span
        role="tooltip"
        id={id}
        className={`pointer-events-none absolute left-0 top-full z-20 mt-1 hidden w-64 max-w-[calc(100vw-2rem)] rounded border border-border-subtle bg-bg-surface p-2 text-left text-xs font-normal normal-case tracking-normal text-text-secondary shadow-md ${
          dismissed ? '' : 'group-focus-within:block group-hover:block'
        }`}
      >
        {termEntry ? (
          <>
            <span className="block">{pick(termEntry)}</span>
            {termEntry.formula ? (
              <span className="mt-1 block">
                <span className="font-semibold">{t('fux.term.formula')}</span>{' '}
                {pick(termEntry.formula)}
              </span>
            ) : null}
            {termEntry.alsoCalled?.length ? (
              <span className="mt-1 block">
                <span className="font-semibold">{t('fux.term.alsoCalled')}</span>{' '}
                {termEntry.alsoCalled.map((a) => `${a.name} (${pick(a.source)})`).join('; ')}
              </span>
            ) : null}
            {termEntry.notToConfuse ? (
              <span className="mt-1 block">
                <span className="font-semibold">{t('fux.term.not')}</span>{' '}
                {pick(termEntry.notToConfuse)}
              </span>
            ) : null}
          </>
        ) : (
          pick(entry)
        )}
      </span>
    </span>
  );
};

export default TermTip;
