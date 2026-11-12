/** @import React from 'react' */
import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
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
//   · Target size — the button's hit area is 24 px, and 44 px on a touch
//     screen, through a transparent pseudo-element, so the layout is unchanged.
//
// BL-233 (TL-R2) — generalised from the planning vocabulary to any glossary
// entry. Pass `term` for a planning term, or `entry` (a `TermEntry`) with the
// `name` the button announces, as `TermLabel` does. An entry's tip shows, in
// this order and each only when the entry has it, the definition, "How it is
// calculated", "Also called" (each name with its source) and "Not" (BR-07).
//
// BL-300 to BL-302 (UI layering review 2026-11, UL-01 to UL-03; portal ruled by
// the owner, UL-Q1). The tip used to be an absolutely positioned box inside the
// label: it inherited `white-space: nowrap` from grid label cells and ran out
// of its box (UL-01), it was cut by the grid's scroll area and only flipped up
// or down (UL-02), and `pointer-events: none` closed it as the pointer moved
// onto it, while Escape worked only from the button (UL-03, WCAG 1.4.13).
// Now the tip is in two parts:
//   · The DESCRIPTION stays where it was, `display: none` with
//     `role="tooltip"`: the button's `aria-describedby` reads hidden text, and
//     hidden text stays out of the accessible name of anything around it (a
//     KPI card button). Screen-reader-only text did not: it put the whole
//     definition into those cards' names.
//   · The VISIBLE box is drawn only while open, in a portal on
//     `document.body`, `position: fixed`, measured against the screen: below
//     the label, above it when the room below is short and the room above is
//     larger, and shifted left to stay on screen (WCAG 1.4.10: never wider
//     than the screen, never widening the page). It is `aria-hidden`, because
//     the description already carries the words.
//   · WCAG 1.4.13: hoverable (the pointer can move onto the box; a short close
//     delay bridges the gap), dismissible (Escape anywhere hides an open tip
//     without moving focus or the pointer, and does not reach a dialog behind
//     it), persistent (it stays until hover and focus both leave, or Escape).
//     After Escape it shows again on the next hover or focus.
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

/** Space between the label and the box, and between the box and the screen edge (px). */
const GAP = 4;
const MARGIN = 8;
/** How long the box stays after the pointer leaves, so it can cross the gap (ms). */
const CLOSE_DELAY = 120;

/**
 * Where the open box goes: below the label, or above it when the room below
 * is short and the room above is larger; its left edge at the label's, moved
 * left as far as needed to stay on screen.
 * @param {DOMRect} anchor  The label's box on screen.
 * @param {{ width: number; height: number }} box  The tip box's size.
 * @param {{ width: number; height: number }} screen  The viewport size.
 * @returns {{ top: number; left: number; above: boolean }}
 */
export const placeTip = (anchor, box, screen) => {
  const below = screen.height - anchor.bottom - GAP - MARGIN;
  const room = anchor.top - GAP - MARGIN;
  const above = box.height > below && room > below;
  const top = above
    ? Math.max(MARGIN, anchor.top - GAP - box.height)
    : Math.max(MARGIN, Math.min(anchor.bottom + GAP, screen.height - MARGIN - box.height));
  const left = Math.max(MARGIN, Math.min(anchor.left, screen.width - MARGIN - box.width));
  return { top, left, above };
};

/** @type {React.FC<TermTipProps>} */
const TermTip = ({ term, entry: termEntry, name, slugId, children, className = '' }) => {
  const { t, i18n } = useTranslation();
  const id = useId();
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [place, setPlace] = useState(
    /** @type {{ top: number; left: number; above: boolean } | null} */ (null)
  );
  const wrapRef = useRef(/** @type {HTMLSpanElement | null} */ (null));
  const boxRef = useRef(/** @type {HTMLSpanElement | null} */ (null));
  const closeTimer = useRef(/** @type {number | undefined} */ (undefined));
  const open = (hovered || focused) && !dismissed;

  const enter = () => {
    window.clearTimeout(closeTimer.current);
    setHovered(true);
  };
  const leave = () => {
    window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => {
      setHovered(false);
      if (!focused) setDismissed(false);
    }, CLOSE_DELAY);
  };
  useEffect(() => () => window.clearTimeout(closeTimer.current), []);

  // Measure and place before paint, then follow the label while any scroll
  // area moves or the window resizes.
  // The last place is kept while closed: the box is only drawn while open, and
  // it is re-measured before the first paint of every opening.
  useLayoutEffect(() => {
    if (!open) return undefined;
    const measure = () => {
      const wrap = wrapRef.current;
      const box = boxRef.current;
      if (!wrap || !box) return;
      setPlace(
        placeTip(
          wrap.getBoundingClientRect(),
          { width: box.offsetWidth, height: box.offsetHeight },
          { width: window.innerWidth, height: window.innerHeight }
        )
      );
    };
    measure();
    window.addEventListener('scroll', measure, true);
    window.addEventListener('resize', measure);
    return () => {
      window.removeEventListener('scroll', measure, true);
      window.removeEventListener('resize', measure);
    };
  }, [open]);

  // WCAG 1.4.13 — Escape anywhere hides the open tip. Captured on the
  // document so it is handled before a dialog behind the tip closes itself.
  useEffect(() => {
    if (!open) return undefined;
    /** @param {KeyboardEvent} e */
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      setDismissed(true);
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [open]);

  const indonesian = i18n.language?.toLowerCase().startsWith('id') ?? false;
  /** @param {{ en: string; id: string }} text */
  const pick = (text) => (indonesian ? text.id : text.en);
  const entry = termEntry ?? PLANNING_TERM_GLOSSARY[/** @type {PlanningTerm} */ (term)];
  const announced = name ?? term ?? '';
  const body = termEntry ? (
    <>
      <span className="block">{pick(termEntry)}</span>
      {termEntry.formula ? (
        <span className="mt-1 block">
          <span className="font-semibold">{t('fux.term.formula')}</span> {pick(termEntry.formula)}
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
          <span className="font-semibold">{t('fux.term.not')}</span> {pick(termEntry.notToConfuse)}
        </span>
      ) : null}
    </>
  ) : (
    pick(entry)
  );
  const testId = `term-tip-${slug(slugId ?? term ?? '')}`;

  return (
    <span
      className={`relative inline-flex items-center gap-1 ${className}`}
      data-testid={testId}
      data-open={open ? 'true' : 'false'}
      data-dismissed={dismissed ? 'true' : 'false'}
      data-placement={place?.above ? 'above' : 'below'}
      ref={wrapRef}
      onMouseEnter={enter}
      onMouseLeave={leave}
    >
      {children ? (
        <span className="underline decoration-dotted underline-offset-2">{children}</span>
      ) : null}
      <button
        type="button"
        aria-label={t('fux.term.aria', { term: announced })}
        aria-describedby={id}
        className={`${HIT_AREA} rounded-sm text-text-tertiary hover:text-action-hover focus:text-action-hover ${FOCUS_RING}`}
        onFocus={() => {
          setDismissed(false);
          setFocused(true);
        }}
        onBlur={() => setFocused(false)}
      >
        <Info size={12} aria-hidden="true" />
      </button>
      <span role="tooltip" id={id} className="hidden">
        {body}
      </span>
      {open && typeof document !== 'undefined'
        ? createPortal(
            <span
              ref={boxRef}
              aria-hidden="true"
              data-tip-popup={testId}
              data-placement={place?.above ? 'above' : 'below'}
              onMouseEnter={enter}
              onMouseLeave={leave}
              style={{
                top: place?.top ?? 0,
                left: place?.left ?? 0,
                visibility: place ? 'visible' : 'hidden'
              }}
              className="fixed z-[70] block w-64 max-w-[calc(100vw-1rem)] whitespace-normal break-words rounded border border-border-subtle bg-bg-surface p-2 text-left text-xs font-normal normal-case tracking-normal text-text-secondary shadow-md"
            >
              {body}
            </span>,
            document.body
          )
        : null}
    </span>
  );
};

export default TermTip;
