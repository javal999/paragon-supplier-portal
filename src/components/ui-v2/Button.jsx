/** @import * as React from 'react' */
/** @import { LucideIcon } from 'lucide-react' */

// ⚠️ **§68 — `'primary'` (SOLID ACTION-BLUE) IS GONE FROM THIS UNION, AND ITS
// ABSENCE IS THE MECHANISM.** DP2-BUTTON-01 used to reserve solid for the
// irreversible commit — Award, Release payment, Post-to-SAP, Reject,
// Override-hold — at most one per surface, with the WhatsApp messenger chrome
// exempt from DP-2 entirely (D-2). The operator retired the whole register:
// OUTLINE IS THE ONLY PRIMARY WEIGHT, messenger chrome included.
//
// This is a TYPE and not a lint rule or a comment because a comment does not
// survive the next page. Fourteen call sites carried the literal, and two more
// producers could render solid without it — a PROP (`BulkActionsBar`'s
// `primary.solid`) and a MODEL FLAG (`invoiceActionModel`'s `solid`), neither
// visible to a matcher keyed on `variant="primary"`. Removing the member makes
// every route back a `tsc` failure rather than a thing somebody has to notice.
//
// ⚠️ AND THE DEFAULT WAS `'primary'`, WHICH MADE SOLID THE SHAPE OF FORGETTING.
// It was unreachable only by luck: all 181 `<Button>` sites in the tree pass an
// explicit variant, so nothing rendered through it — a latent trap, not a live
// defect, and it closes here with the rest.
/** @typedef {'secondary' | 'outline'} Variant */

/**
 * Every native `<button>` attribute, plus the two below.
 * @typedef {React.ButtonHTMLAttributes<HTMLButtonElement> & {
 *   variant?: Variant;
 *   icon?: LucideIcon;
 * }} ButtonProps
 */

/** @type {Record<Variant, string>} */
const VARIANT_CLASS = {
  secondary: 'bg-bg-surface text-text-primary border border-border-input hover:bg-bg-hover',
  // DP2-BUTTON-01 (as amended, §68): action-blue OUTLINE — transparent fill,
  // blue border + text. It is no longer the CALM weight beside a louder one;
  // it is the ONLY primary weight, and therefore the default below.
  //
  // BL-31 (WCAG 1.4.3): the LABEL is `action.hover` (#0064D9), the BORDER stays
  // `action` (#0070F2) — the same fill/text split as DP2-WARN-01. The fill is
  // transparent, so the label sits on whatever is behind the button, and
  // #0070F2 as text fails AA on the page background (4.41:1), on bg-hover
  // (4.21:1) and on its own hover tint action-soft (3.96:1). #0064D9 clears all
  // three (5.30 / 5.07 / 4.76). The border is a non-text mark (3:1 floor).
  outline: 'bg-transparent text-action-hover border border-action hover:bg-action-soft'
};

// BL-31 (WCAG 2.4.7): an explicit keyboard focus ring, so focus does not depend
// on each browser's default and survives any `outline-none` a caller passes.
const FOCUS_RING =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action';

/**
 * @param {ButtonProps} props
 * @returns {React.ReactNode}
 */
const Button = ({ variant = 'outline', icon: Icon, children, className = '', ...rest }) => {
  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${FOCUS_RING} ${VARIANT_CLASS[variant]} ${className}`}
      {...rest}
    >
      {Icon ? <Icon size={16} aria-hidden="true" /> : null}
      {children}
    </button>
  );
};

export default Button;
