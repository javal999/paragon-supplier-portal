import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

// ─────────────────────────────────────────────────────────────────────────────
// `?section=<name>` — a deep link that lands on a section of a page.
//
// IA P-08: a My tasks item whose count IS a section of its destination (the
// supplier declarations waiting in Supplier documents' review queue, the
// disputed receipts on Goods receipts) links to that section rather than to
// the top of a long page. The RFQ event page shipped this shape first
// (`?section=award`); this hook is that effect, shared.
//
// The section is the element with id `<prefix>-<name>`. Only a name in
// `validNames` is scrolled to, and only once `ready` is true (the section
// renders after the page's read resolves). An unknown or absent name changes
// nothing, so a plain visit from the menu is untouched.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @param {string} prefix  The id prefix the page's sections share.
 * @param {readonly string[]} validNames
 * @param {boolean} ready  True once the sections can be in the DOM.
 * @returns {string | null} The requested section name, when it is a valid one.
 */
export function useSectionParam(prefix, validNames, ready) {
  const [params] = useSearchParams();
  const raw = params.get('section');
  const section = raw !== null && validNames.includes(raw) ? raw : null;
  useEffect(() => {
    if (!ready || section === null) return;
    document.getElementById(`${prefix}-${section}`)?.scrollIntoView?.({ block: 'start' });
  }, [prefix, section, ready]);
  return section;
}
