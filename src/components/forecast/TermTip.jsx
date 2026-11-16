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
//     `document.body`, `position: fixed`, measured against the screen: on the
//     side of the label that covers fewer controls (BL-309), below on a tie,
//     and shifted left to stay on screen (WCAG 1.4.10: never wider
//     than the screen, never widening the page). It is `aria-hidden`, because
//     the description already carries the words.
//   · WCAG 1.4.13: hoverable (the pointer can move onto the box; a short close
//     delay bridges the gap), dismissible (Escape anywhere hides an open tip
//     without moving focus or the pointer, and does not reach a dialog behind
//     it), persistent (it stays until hover and focus both leave, or Escape).
//     After Escape it shows again on the next hover or focus.
//
// BL-317 and BL-318 (UL-04, re-measured 2026-11-16). A label inside a clickable
// card (Shipments & ASN status cards, KPI cards):
//   · The card the label sits in is not counted as a covered control: the user
//     is already on it and the tip explains it. The box is fitted inside that
//     card (BL-317), so it no longer lies over the next card in the row.
//   · On a tie in covered controls, the side that hides the smallest area of
//     them wins (BL-317), before the default order.
//   · A click on the (i), or Enter or Space on it, explains the card and does
//     not also apply it (BL-318): on Shipments & ASN it set the "Draft" filter.
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
/** The box's own width (Tailwind `w-64`), and the narrowest it is fitted to inside a card (px). */
const BOX_WIDTH = 256;
const MIN_FIT = 160;

/**
 * Where the open box goes: below the label, or above it when the room below
 * is short and the room above is larger; its left edge at the label's, moved
 * left as far as needed to stay on screen. `side` forces a side when both fit.
 * @param {DOMRect} anchor  The label's box on screen.
 * @param {{ width: number; height: number }} box  The tip box's size.
 * @param {{ width: number; height: number }} screen  The viewport size.
 * @param {'above' | 'below'} [side]  The side to use when the box fits there.
 * @returns {{ top: number; left: number; above: boolean }}
 */
export const placeTip = (anchor, box, screen, side) => {
  const below = screen.height - anchor.bottom - GAP - MARGIN;
  const room = anchor.top - GAP - MARGIN;
  const fallback = box.height > below && room > below;
  const above =
    side === 'above' && room >= box.height
      ? true
      : side === 'below' && below >= box.height
        ? false
        : fallback;
  const top = above
    ? Math.max(MARGIN, anchor.top - GAP - box.height)
    : Math.max(MARGIN, Math.min(anchor.bottom + GAP, screen.height - MARGIN - box.height));
  const left = Math.max(MARGIN, Math.min(anchor.left, screen.width - MARGIN - box.width));
  return { top, left, above };
};

/**
 * BL-311 — the box beside the label, to its right or left, top-aligned with
 * it and kept on screen vertically; null when it does not fit on that side.
 * @param {DOMRect} anchor
 * @param {{ width: number; height: number }} box
 * @param {{ width: number; height: number }} screen
 * @param {'right' | 'left'} side
 * @returns {{ top: number; left: number; above: boolean; side: 'right' | 'left' } | null}
 */
export const placeBeside = (anchor, box, screen, side) => {
  const left = side === 'right' ? anchor.right + GAP : anchor.left - GAP - box.width;
  if (left < MARGIN || left + box.width > screen.width - MARGIN) return null;
  const top = Math.max(MARGIN, Math.min(anchor.top, screen.height - MARGIN - box.height));
  return { top, left, above: false, side };
};

const CONTROLS = 'input, select, textarea, button, a[href], [role="button"]';

/**
 * BL-317 — the control the label sits in (a clickable status or KPI card), or
 * null when it sits in none.
 * @param {Element} wrap
 * @returns {Element | null}
 */
const hostControl = (wrap) => wrap.parentElement?.closest(CONTROLS) ?? null;

/**
 * BL-317 (UL-04) — the box's width and left edge inside the card its label sits
 * in, so it does not lie over the next card in the row: as wide as the card
 * allows (at most its own width), its left edge at the label's, moved left as
 * far as needed to stay inside the card and on screen. Null when the card is
 * too narrow for a readable box; the box then keeps its own width.
 * @param {DOMRect} anchor  The label's box on screen.
 * @param {DOMRect} host  The card's box on screen.
 * @param {{ width: number; height: number }} screen  The viewport size.
 * @returns {{ width: number; left: number } | null}
 */
export const fitInHost = (anchor, host, screen) => {
  const width = Math.min(BOX_WIDTH, Math.floor(host.width) - 2 * GAP);
  if (width < MIN_FIT) return null;
  const inside = Math.max(host.left + GAP, Math.min(anchor.left, host.right - GAP - width));
  return { width, left: Math.max(MARGIN, Math.min(inside, screen.width - MARGIN - width)) };
};

/**
 * BL-309 (UL-04) — how many visible controls a box placed at `p` would cover,
 * and the area of them it hides. A fixed side does not work: measured on the
 * 26 pages with tips, "below first" covered a control in 33 tips and "above
 * first" in 39 (header and card tips sit under filters and cards), so each
 * opening counts. Not counted: the tip's own button, and the card the label
 * sits in (BL-317).
 * @param {{ top: number; left: number }} p
 * @param {{ width: number; height: number }} box
 * @param {Element} own
 * @returns {{ n: number; area: number }}
 */
const coveredControls = (p, box, own) => {
  const right = p.left + box.width;
  const bottom = p.top + box.height;
  let n = 0;
  let area = 0;
  for (const el of document.querySelectorAll(CONTROLS)) {
    if (own.contains(el) || el.contains(own)) continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    const w = Math.min(r.right, right) - Math.max(r.left, p.left);
    const h = Math.min(r.bottom, bottom) - Math.max(r.top, p.top);
    if (w > 0 && h > 0) {
      n += 1;
      area += w * h;
    }
  }
  return { n, area };
};

/** @type {React.FC<TermTipProps>} */
const TermTip = ({ term, entry: termEntry, name, slugId, children, className = '' }) => {
  const { t, i18n } = useTranslation();
  const id = useId();
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [place, setPlace] = useState(
    /** @type {{ top: number; left: number; above: boolean; side?: "right" | "left"; width?: number } | null} */ (
      null
    )
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
      const anchor = wrap.getBoundingClientRect();
      const screen = { width: window.innerWidth, height: window.innerHeight };
      // BL-317: inside a clickable card the box is fitted to the card. The
      // width is set before the height is read, because a narrower box is taller.
      const host = hostControl(wrap);
      const fit = host ? fitInHost(anchor, host.getBoundingClientRect(), screen) : null;
      box.style.width = fit ? `${fit.width}px` : '';
      const size = { width: fit ? fit.width : box.offsetWidth, height: box.offsetHeight };
      // The side that covers fewest controls (BL-309: below or above;
      // BL-311: right or left of the label too); on a tie, the side that hides
      // the least of them (BL-317); then this order, the default rule first, so
      // a tip with nothing near it opens as before.
      const options = [
        placeTip(anchor, size, screen),
        placeTip(anchor, size, screen, 'below'),
        placeTip(anchor, size, screen, 'above'),
        placeBeside(anchor, size, screen, 'right'),
        placeBeside(anchor, size, screen, 'left')
      ].flatMap((p) => {
        if (!p) return [];
        const at = fit && !('side' in p) ? { ...p, left: fit.left } : p;
        return [{ p: at, ...coveredControls(at, size, wrap) }];
      });
      const best = options.reduce((a, b) =>
        b.n < a.n || (b.n === a.n && b.area < a.area) ? b : a
      );
      setPlace({ ...best.p, width: fit?.width });
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
      data-placement={place?.side ?? (place?.above ? 'above' : 'below')}
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
        onClick={(e) => {
          // BL-318: inside a clickable card the (i) explains the card; it does
          // not also apply it (the click reached the card's own handler).
          const wrap = e.currentTarget.parentElement;
          if (wrap && hostControl(wrap)) e.stopPropagation();
        }}
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
              data-placement={place?.side ?? (place?.above ? 'above' : 'below')}
              onMouseEnter={enter}
              onMouseLeave={leave}
              style={{
                top: place?.top ?? 0,
                left: place?.left ?? 0,
                width: place?.width,
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
