// ────────────────────────────────────────────────────────────────────────────
// a11yGate — the two SOURCE-level accessibility invariants BL-31 can hold
// tree-wide (SC-07: "every action can be reached by keyboard, and every control
// has an accessible name"):
//
//   1. ICON-ONLY BUTTONS ARE NAMED. A `<button>` or `<Button>` whose children
//      carry no text (an icon, or nothing — `<Button icon={X} />`) must carry
//      `aria-label`, `aria-labelledby` or `title`. An icon is aria-hidden by
//      lucide's default, so such a button is announced as "button" and nothing
//      else.
//   2. A CLICKABLE ROW IS KEYBOARD-OPERABLE. A raw `<tr onClick>` must spread
//      `rowActivation(...)` (the helper `TableRow` uses) or carry its own
//      `tabIndex` + `onKeyDown`. `<TableRow onClick>` is operable by
//      construction and is not a finding. Neither is a selection row whose
//      click mirrors a checkbox/radio inside it (that control is the keyboard
//      path).
//   3. A FIELD MARKED INVALID NAMES ITS ERROR (BL-84, WCAG 1.3.1 / 3.3.1).
//      An `<input>` / `<select>` / `<textarea>` carrying `aria-invalid` must
//      also carry `aria-describedby`, so the message the reader sees is the
//      message assistive technology announces with the field. The registration
//      form is the pattern: `aria-describedby` points at the error element's
//      `id`. A SPREAD acquits it, exactly as it does for buttons.
//
// ⚠️ WHAT IT DELIBERATELY CANNOT SEE, SAID RATHER THAN LEFT TO BE DISCOVERED:
//   · A child written as an EXPRESSION (`{label}`, `{t('x')}`, `{icon}`) is
//     counted as TEXT. It cannot tell a string from an icon element held in a
//     variable, and it errs toward acquitting — the opposite choice would
//     accuse every `{t(...)}` button in the tree.
//   · A JSX SPREAD (`{...rest}`) on a BUTTON acquits it: the name may arrive
//     through the spread. On a ROW only `{...rowActivation(...)}` acquits.
//   · Rendered names (what a screen reader actually hears) are checked in the
//     render tests beside this file, not here.
// ────────────────────────────────────────────────────────────────────────────

import ts from 'typescript';
import { scriptKindOf } from '@test/sourceFiles';

/**
 * @typedef {object} Finding
 * @property {string} file
 * @property {number} line
 * @property {string} what
 */

/**
 * @param {ts.JsxOpeningLikeElement} open
 * @param {...string} names
 */
const hasAttr = (open, ...names) =>
  open.attributes.properties.some((a) => ts.isJsxAttribute(a) && names.includes(a.name.getText()));
/** @param {ts.JsxOpeningLikeElement} open */
const hasSpread = (open) => open.attributes.properties.some(ts.isJsxSpreadAttribute);

/**
 * Does this child render text a screen reader would read as the name?
 * @param {ts.JsxChild} c
 * @returns {boolean}
 */
function carriesText(c) {
  if (ts.isJsxText(c)) return c.getText().trim().length > 0;
  if (ts.isJsxExpression(c)) {
    const e = c.expression;
    if (!e) return false; // a {/* comment */}
    if (ts.isJsxElement(e) || ts.isJsxSelfClosingElement(e) || ts.isJsxFragment(e)) {
      return ts.isJsxSelfClosingElement(e) ? false : e.children.some(carriesText);
    }
    return true; // see header: an expression is acquitted
  }
  if (ts.isJsxFragment(c)) return c.children.some(carriesText);
  if (ts.isJsxElement(c)) {
    if (hasAttr(c.openingElement, 'aria-hidden')) return false;
    return c.children.some(carriesText);
  }
  // A self-closing child is an icon or an empty element — unless it is the
  // tree's <Data> / <Trans> text carriers.
  if (ts.isJsxSelfClosingElement(c)) return ['Data', 'Trans'].includes(c.tagName.getText());
  return false;
}

/**
 * `seen` (optional) collects EVERY site the scan examined — each button and
 * each clickable row, named or not — so a caller can assert the population
 * contains a known member before it believes an empty finding list.
 * @param {string} fileName
 * @param {string} text
 * @param {Finding[]} [seen]
 * @returns {Finding[]}
 */
export function scanSource(fileName, text, seen) {
  const sf = ts.createSourceFile(
    fileName,
    text,
    ts.ScriptTarget.Latest,
    true,
    scriptKindOf(fileName)
  );
  /** @type {Finding[]} */
  const out = [];
  /** @param {ts.Node} n */
  const at = (n) => sf.getLineAndCharacterOfPosition(n.getStart()).line + 1;
  /** @param {ts.Node} n */
  const visit = (n) => {
    if (ts.isJsxElement(n) || ts.isJsxSelfClosingElement(n)) {
      const open = ts.isJsxElement(n) ? n.openingElement : n;
      const tag = open.tagName.getText();
      if ((tag === 'button' || tag === 'Button') && !hasSpread(open)) {
        seen?.push({ file: fileName, line: at(n), what: `<${tag}>` });
        const named = hasAttr(open, 'aria-label', 'aria-labelledby', 'title');
        const text = ts.isJsxElement(n) && n.children.some(carriesText);
        if (!named && !text)
          out.push({
            file: fileName,
            line: at(n),
            what: `icon-only <${tag}> has no accessible name`
          });
      }
      if (tag === 'tr' && hasAttr(open, 'onClick')) {
        seen?.push({ file: fileName, line: at(n), what: '<tr onClick>' });
        // Only the shared helper's spread acquits; any other spread does not.
        const viaHelper = open.attributes.properties.some(
          (a) => ts.isJsxSpreadAttribute(a) && /^rowActivation\(/.test(a.expression.getText())
        );
        // A selection row whose click mirrors a checkbox/radio INSIDE it is
        // already operable through that control (a second tab stop on the row
        // would only double the work). Derived from the row's own subtree.
        let mirrorsControl = false;
        /** @param {ts.Node} d */
        const find = (d) => {
          if (ts.isJsxSelfClosingElement(d) && d.tagName.getText() === 'input') {
            const type = d.attributes.properties.find(
              (a) => ts.isJsxAttribute(a) && a.name.getText() === 'type'
            );
            if (
              type &&
              /^"(checkbox|radio)"$/.test(
                /** @type {ts.JsxAttribute} */ (type).initializer?.getText() ?? ''
              )
            ) {
              mirrorsControl = true;
            }
          }
          ts.forEachChild(d, find);
        };
        if (ts.isJsxElement(n)) n.children.forEach(find);
        const operable =
          viaHelper || mirrorsControl || (hasAttr(open, 'tabIndex') && hasAttr(open, 'onKeyDown'));
        if (!operable)
          out.push({ file: fileName, line: at(n), what: '<tr onClick> is not keyboard-operable' });
      }
      // Invariant 3: an invalid field names the message that explains it.
      if (
        ['input', 'select', 'textarea'].includes(tag) &&
        hasAttr(open, 'aria-invalid') &&
        !hasSpread(open)
      ) {
        seen?.push({ file: fileName, line: at(n), what: `<${tag} aria-invalid>` });
        if (!hasAttr(open, 'aria-describedby'))
          out.push({
            file: fileName,
            line: at(n),
            what: `<${tag} aria-invalid> does not describe its error`
          });
      }
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);
  return out;
}
