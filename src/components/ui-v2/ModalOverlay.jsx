/** @import * as React from 'react' */
// ────────────────────────────────────────────────────────────────────────────
// ModalOverlay — the centred modal scrim (BL-31, SC-07).
//
// Replaces the hand-written `<div className="fixed inset-0 … bg-[rgba(13,27,42,0.4)]">`
// wrapper that the RFQ, RFI, RFP, contract and GR-inspection wizards (and the
// FX-pin and raised-elsewhere dialogs) each carried. Those wrappers painted a
// modal and told assistive technology nothing: no `role="dialog"`, no name, no
// focus moved in, Tab walked straight out into the page behind the scrim, and
// Escape did nothing. The wrapper now IS the dialog and runs the shared modal
// keyboard contract (`useDialogFocus`).
//
// Naming: pass `label` when the caller has a title string; otherwise the
// dialog is named by the first heading inside it (the Wizard's step title).
// Unlike SidePanel this renders only while mounted — callers keep their own
// `{open && <ModalOverlay …>}` guard, which is the same absent-not-hidden
// contract SidePanel states.
// ────────────────────────────────────────────────────────────────────────────
import { useRef } from 'react';
import { useDialogFocus } from '@hooks/useDialogFocus';

/**
 * @typedef {Object} ModalOverlayProps
 * @property {() => void} onClose Escape (and nothing else) calls this. The scrim is not click-to-close.
 * @property {string} [label]
 * @property {React.ReactNode} children
 * @property {'default' | 'dark'} [scrim] Scrim opacity; the GR wizard historically used a darker scrim.
 * @property {string} [testId]
 */

/**
 * @param {ModalOverlayProps} props
 * @returns {React.ReactNode}
 */
const ModalOverlay = ({ onClose, label, children, scrim = 'default', testId }) => {
  const ref = useRef(/** @type {HTMLDivElement | null} */ (null));
  useDialogFocus(ref, true, onClose);
  return (
    <div
      ref={ref}
      role="dialog"
      aria-modal="true"
      aria-label={label}
      data-testid={testId}
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${scrim === 'dark' ? 'bg-[rgba(13,27,42,0.5)]' : 'bg-[rgba(13,27,42,0.4)]'}`}
    >
      {children}
    </div>
  );
};

export default ModalOverlay;
