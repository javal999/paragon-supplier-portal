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
// Nested modals: only the TOPMOST open modal reacts to Tab and Escape (a
// module-level stack), so a dialog opened from a drawer does not also close the
// drawer on the same key press.
// ────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef, type RefObject } from 'react';

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]), [contenteditable="true"]';

const stack: RefObject<HTMLElement>[] = [];

export function focusableWithin(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) => !el.closest('[inert]') && el.getAttribute('aria-hidden') !== 'true',
  );
}

export function useDialogFocus(
  ref: RefObject<HTMLElement>,
  open: boolean,
  onClose?: () => void,
): void {
  // The latest onClose, without re-running the effect (callers pass inline
  // arrows; re-running would steal focus back to the first control on every
  // parent render).
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const root = ref.current;
    if (!root) return;

    const opener = document.activeElement as HTMLElement | null;
    stack.push(ref);

    // Name the dialog by its first heading when the caller gave it no name.
    if (!root.hasAttribute('aria-label') && !root.hasAttribute('aria-labelledby')) {
      const heading = root.querySelector<HTMLElement>('h1, h2, h3');
      if (heading) {
        if (!heading.id) heading.id = `dlg-h-${Math.random().toString(36).slice(2, 9)}`;
        root.setAttribute('aria-labelledby', heading.id);
      }
    }

    const initial =
      root.querySelector<HTMLElement>('[data-autofocus]') ?? focusableWithin(root)[0] ?? root;
    if (initial === root && !root.hasAttribute('tabindex')) root.setAttribute('tabindex', '-1');
    initial.focus();

    const onKey = (e: KeyboardEvent) => {
      if (stack[stack.length - 1] !== ref) return;
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
      const active = document.activeElement as HTMLElement | null;
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
