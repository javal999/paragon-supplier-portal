/** @import React from 'react' */
import { Link } from 'react-router-dom';
import { HIGHLIGHT_PARAM, deepLink } from '@lib/deepLink';

// ─────────────────────────────────────────────────────────────────────────────
// IA-B13 (P-01) — a page that creates or changes a call-off links to it.
//
// What to order drafts call-offs and Make warehouse room changes them; the
// row that did it carries this link, so the planner checks the result on
// Call-offs without going through the menu. The address is the deep-link
// pattern's own row param (`?highlight=<call-off id>`, `useRowHighlight`):
// Call-offs opens its "All call-offs" tab, scrolls to that row, marks it and
// opens its panel.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Buyer Call-offs, opened on one call-off.
 * @param {string} callOffId
 * @returns {string}
 */
export const buyerCallOffHref = (callOffId) =>
  deepLink('/buyer/call-offs', { [HIGHLIGHT_PARAM]: callOffId });

/**
 * @typedef {object} OpenCallOffLinkProps
 * @property {string} callOffId
 * @property {string} label The link text, from the caller's own i18n fragment.
 * @property {string} testId
 */

/** @type {React.FC<OpenCallOffLinkProps>} */
const OpenCallOffLink = ({ callOffId, label, testId }) => (
  <Link
    to={buyerCallOffHref(callOffId)}
    className="inline-block mt-1 text-xs text-action-hover underline"
    data-testid={testId}
  >
    {label}
  </Link>
);

export default OpenCallOffLink;
