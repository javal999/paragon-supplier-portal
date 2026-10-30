// BL-233 — a header that carries an (i) also holds the tip's text in the DOM.
// The closed tip is display:none in a browser, so screen readers and the eye
// skip it, but jsdom applies no CSS and counts it. These read a header as the
// page shows it: the label, without the tip.

/**
 * The text of `root` without its (i) tips.
 * @param {Element} root
 * @returns {string}
 */
export const textWithoutTips = (root) => {
  const copy = /** @type {Element} */ (root.cloneNode(true));
  copy.querySelectorAll('[role="tooltip"]').forEach((n) => n.remove());
  return copy.textContent ?? '';
};

/**
 * A name matcher for a header whose label is `label`, with or without its tip.
 * @param {string} label
 * @returns {RegExp}
 */
export const headerNamed = (label) =>
  new RegExp(`^${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\s|$)`);
