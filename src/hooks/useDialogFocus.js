// ────────────────────────────────────────────────────────────────────────────
// useDialogFocus — the keyboard contract of a MODAL surface (BL-31, SC-07).
//
// WCAG 2.1.1 / 2.1.2 / 2.4.3: while a modal is open, keyboard focus
//   · MOVES INTO it (the element marked `data-autofocus`, else the first
//     focusable control, else the container itself),
//   · STAYS in it (Tab from the last control wraps to the first, Shift+Tab from
//     the first wraps to the last),
//   · LEAVES it on Escape (via `onClose`), and
//   · RETURNS to the control that opened it when it closes.
//
// Before BL-31 only `ExpandableWidget` did this, by hand. `SidePanel` closed on
// Escape but never took focus, so a keyboard user opening a PO or an ASN kept
// tabbing through the page BEHIND an `aria-modal` drawer; the five wizard
// overlays (RFQ, RFI, RFP, contract, GR inspection) had no dialog semantics at
// all. One hook, so the contract is stated once.
//
// Nested modals: only the TOPMOST open modal reacts to Tab and Escape, so a
// dialog opened from a drawer does not also close the drawer on the same key
// press. "Topmost" = no other open modal inside it, and none opened after it
// elsewhere in the page (a module-level registry).
// ────────────────────────────────────────────────────────────────────────────

/** @import { RefObject } from 'react' */
import { useEffect, useRef } from 'react';

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]), [contenteditable="true"]';

/** @type {RefObject<HTMLElement | null>[]} */
const stack = [];

/**
 * @param {HTMLElement} root
 * @returns {HTMLElement[]}
 */
export function focusableWithin(root) {
  return Array.from(
    /** @type {NodeListOf<HTMLElement>} */ (root.querySelectorAll(FOCUSABLE))
  ).filter((el) => !el.closest('[inert]') && el.getAttribute('aria-hidden') !== 'true');
}

/**
 * @param {RefObject<HTMLElement | null>} ref
 * @param {boolean} open
 * @param {() => void} [onClose]
 * @returns {void}
 */
export function useDialogFocus(
  // `| null`: React 19's `useRef<T>(null)` returns RefObject<T | null>.
  ref,
  open,
  onClose
) {
  // The latest onClose, without re-running the effect (callers pass inline
  // arrows; re-running would steal focus back to the first control on every
  // parent render).
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const root = ref.current;
    if (!root) return;

    const opener = /** @type {HTMLElement | null} */ (document.activeElement);
    stack.push(ref);

    // Name the dialog by its first heading when the caller gave it no name.
    if (!root.hasAttribute('aria-label') && !root.hasAttribute('aria-labelledby')) {
      const heading = /** @type {HTMLElement | null} */ (root.querySelector('h1, h2, h3'));
      if (heading) {
        if (!heading.id) heading.id = `dlg-h-${Math.random().toString(36).slice(2, 9)}`;
        root.setAttribute('aria-labelledby', heading.id);
      }
    }

    // Which modal is on top is decided by the DOM, not only by push order:
    // when a drawer and a dialog inside it mount in the same commit, React runs
    // the CHILD's effect first, so push order alone would crown the drawer.
    const nestedOpenInside = () =>
      stack.some((r) => r !== ref && r.current && root.contains(r.current));
    const openedLaterElsewhere = () =>
      stack.slice(stack.indexOf(ref) + 1).some((r) => r.current && !r.current.contains(root));
    const isTop = () => !nestedOpenInside() && !openedLaterElsewhere();

    if (!nestedOpenInside()) {
      const initial =
        /** @type {HTMLElement | null} */ (root.querySelector('[data-autofocus]')) ??
        focusableWithin(root)[0] ??
        root;
      if (initial === root && !root.hasAttribute('tabindex')) root.setAttribute('tabindex', '-1');
      initial.focus();
    }

    /** @param {KeyboardEvent} e */
    const onKey = (e) => {
      if (!isTop()) return;
      if (e.key === 'Escape') {
        if (closeRef.current) {
          e.stopPropagation();
          closeRef.current();
        }
        return;
      }
      if (e.key !== 'Tab') return;
      const items = focusableWithin(root);
      if (items.length === 0) {
        e.preventDefault();
        root.focus();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = /** @type {HTMLElement | null} */ (document.activeElement);
      const inside = !!active && root.contains(active);
      if (e.shiftKey && (active === first || !inside)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (active === last || !inside)) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', onKey);

    return () => {
      window.removeEventListener('keydown', onKey);
      const i = stack.lastIndexOf(ref);
      if (i >= 0) stack.splice(i, 1);
      // Return focus only if it is still inside the closing dialog or lost to
      // <body>; a caller that deliberately moved focus elsewhere wins.
      const now = document.activeElement;
      if (opener && opener.isConnected && (!now || now === document.body || root.contains(now))) {
        opener.focus();
      }
    };
  }, [open, ref]);
}
