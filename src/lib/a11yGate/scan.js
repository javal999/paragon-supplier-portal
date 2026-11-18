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
//   4. NO CONTROL IS RENDERED INSIDE ANOTHER CONTROL (BL-322, WCAG 4.1.2).
//      A `<button>` inside a `<button>` is invalid HTML and two controls a
//      screen reader can merge into one name. The outer element is a button,
//      `Button`, `Link`/`<a href>`, `GlossaryTermChip` or a field; the inner is
//      any of those PLUS `TermTip`/`TermLabel`/`TermInfo`, which render the
//      glossary (i) as a real button — the exact shape BL-322 removed from
//      `KpiCard`: a clickable card was a <button> holding `<TermLabel>`.
//      The subtree is followed through JSX children, fragments, JSX inside
//      expressions, and `{x}` where `x` is a const in the same file bound to an
//      initializer holding JSX — that last one is how the defect was reachable
//      at all: the card's children came from `{content}`, so a scan of literal
//      children only would have reported a clean tree.
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
//   · Invariant 4 follows controls only through the components named above. A
//     component that starts rendering a control is invisible until it is added
//     to `CONTROL_COMPONENTS`; the map is the limit, and it is stated here.
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
 * BL-322 — tags that render an interactive control. `TermTip` and the two
 * wrappers that render it are here because the defect BL-322 removed was
 * invisible to a matcher keyed on `<button>`: the glossary (i) is a `<TermTip>`,
 * not a literal button.
 */
const CONTROL_COMPONENTS = new Set([
  'button',
  'Button',
  'input',
  'select',
  'textarea',
  'Link',
  'GlossaryTermChip',
  'TermTip',
  'TermLabel',
  'TermInfo'
]);

/**
 * An anchor is a control only when it navigates; `<a name="…">` is not.
 * @param {ts.JsxOpeningLikeElement} open
 * @returns {boolean}
 */
const isControlTag = (open) => {
  const tag = open.tagName.getText();
  if (CONTROL_COMPONENTS.has(tag)) return true;
  return tag === 'a' && hasAttr(open, 'href');
};

/**
 * The tag name of this JSX node when it is an interactive control; null when it
 * is not one (a fragment, or an element that renders no control).
 * @param {ts.JsxElement | ts.JsxSelfClosingElement | ts.JsxFragment} node
 * @returns {string | null}
 */
const controlTag = (node) => {
  if (ts.isJsxFragment(node)) return null;
  const open = ts.isJsxElement(node) ? node.openingElement : node;
  return isControlTag(open) ? open.tagName.getText() : null;
};

/**
 * The identifiers this file binds to an initializer that holds JSX. `{content}`
 * resolving to a const is how BL-322's defect was written: the clickable card's
 * children were a fragment held above the button, so following literal JSX
 * children alone reported a clean tree while a button sat inside a button.
 * @param {ts.SourceFile} sf
 * @returns {Map<string, ts.Node>}
 */
function jsxConsts(sf) {
  /** @type {Map<string, ts.Node>} */
  const map = new Map();
  /** @param {ts.Node} n */
  const visit = (n) => {
    if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.initializer) {
      let found = false;
      /** @param {ts.Node} m */
      const holds = (m) => {
        if (found) return;
        if (ts.isJsxElement(m) || ts.isJsxSelfClosingElement(m) || ts.isJsxFragment(m)) {
          found = true;
          return;
        }
        ts.forEachChild(m, (c) => {
          if (ts.isExpression(c) || ts.isJsxElement(c) || ts.isJsxFragment(c)) holds(c);
        });
      };
      holds(n.initializer);
      if (found) map.set(n.name.getText(), n.initializer);
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);
  return map;
}

/**
 * Call `onJsx` for every JSX element or fragment inside an expression,
 * resolving `{x}` where `x` is a const this file binds to JSX. Only expressions
 * and JSX are walked, so nothing else in the AST is read.
 * @param {ts.Node} expr
 * @param {Map<string, ts.Node>} consts
 * @param {(node: ts.JsxElement | ts.JsxSelfClosingElement | ts.JsxFragment) => void} onJsx
 * @param {Set<ts.Node>} visited  Guards a const that (transitively) names itself.
 */
function jsxInExpression(expr, consts, onJsx, visited) {
  if (visited.has(expr)) return;
  visited.add(expr);
  let e = expr;
  while (ts.isParenthesizedExpression(e)) e = e.expression;
  if (ts.isIdentifier(e) && consts.has(e.getText())) {
    jsxInExpression(/** @type {ts.Node} */ (consts.get(e.getText())), consts, onJsx, visited);
    return;
  }
  if (ts.isJsxElement(e) || ts.isJsxSelfClosingElement(e) || ts.isJsxFragment(e)) {
    onJsx(e);
    return;
  }
  if (!ts.isExpression(e)) return;
  ts.forEachChild(e, (c) => {
    if (ts.isExpression(c) || ts.isJsxElement(c) || ts.isJsxFragment(c)) {
      jsxInExpression(c, consts, onJsx, visited);
    }
  });
}

/**
 * BL-322 — every control rendered inside `root`'s subtree.
 * @param {ts.JsxElement} root
 * @param {Map<string, ts.Node>} consts
 * @returns {{ tag: string, node: ts.Node }[]}
 */
function controlsInside(root, consts) {
  /** @type {{ tag: string, node: ts.Node }[]} */
  const out = [];
  /** @param {ts.Node} c */
  const walkChild = (c) => {
    if (ts.isJsxElement(c) || ts.isJsxSelfClosingElement(c)) {
      const tag = controlTag(c);
      if (tag) out.push({ tag, node: c });
      if (ts.isJsxElement(c)) c.children.forEach(walkChild);
      return;
    }
    if (ts.isJsxFragment(c)) {
      c.children.forEach(walkChild);
      return;
    }
    if (ts.isJsxExpression(c) && c.expression) {
      jsxInExpression(
        c.expression,
        consts,
        (jsx) => {
          const tag = controlTag(jsx);
          if (tag) out.push({ tag, node: jsx });
          if (ts.isJsxFragment(jsx)) jsx.children.forEach(walkChild);
          else if (ts.isJsxElement(jsx)) jsx.children.forEach(walkChild);
        },
        new Set()
      );
    }
  };
  root.children.forEach(walkChild);
  return out;
}

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
 * `seen` (optional) collects EVERY site the scan examined — each control, each
 * clickable row and each invalid field, named or not — so a caller can assert
 * the population contains a known member before it believes an empty finding
 * list. A control site is recorded whether or not a spread names it.
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
  const consts = jsxConsts(sf);
  /** @type {Finding[]} */
  const out = [];
  /** @param {ts.Node} n */
  const at = (n) => sf.getLineAndCharacterOfPosition(n.getStart()).line + 1;
  /** @param {ts.Node} n */
  const visit = (n) => {
    if (ts.isJsxElement(n) || ts.isJsxSelfClosingElement(n)) {
      const open = ts.isJsxElement(n) ? n.openingElement : n;
      const tag = open.tagName.getText();
      const control = isControlTag(open);
      if (control) seen?.push({ file: fileName, line: at(n), what: `<${tag}>` });
      if ((tag === 'button' || tag === 'Button') && !hasSpread(open)) {
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
      // Invariant 4 (BL-322): no control is rendered inside another control.
      if (control && ts.isJsxElement(n)) {
        for (const inner of controlsInside(n, consts)) {
          out.push({
            file: fileName,
            line: at(inner.node),
            what: `nested control: <${inner.tag}> inside <${tag}>`
          });
        }
      }
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);
  return out;
}
