import { useEffect, useState } from 'react';
/** @import { ASN } from '@services/data/types' */

/**
 * Which ASN rows stand expanded, and the toggle. AC-03: when a PO
 * drill-through leaves exactly one ASN, that one arrives open.
 * @param {string | null} drilledPo  The drilled PO number, or null with no drill-through.
 * @param {readonly ASN[]} visibleAsns  The ASNs the list shows.
 */
export function useExpandedAsns(drilledPo, visibleAsns) {
  const [expanded, setExpanded] = useState(/** @type {Set<string>} */ (new Set()));

  // AC-03 — exactly one record behind the cell arrives OPEN, not as a list of one.
  const onlyAsn = drilledPo !== null && visibleAsns.length === 1 ? visibleAsns[0].asnNumber : null;
  useEffect(() => {
    if (onlyAsn === null) return;
    setExpanded((prev) => (prev.has(onlyAsn) ? prev : new Set(prev).add(onlyAsn)));
  }, [onlyAsn]);

  /** @param {string} asnNumber */
  const toggleExpand = (asnNumber) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(asnNumber)) next.delete(asnNumber);
      else next.add(asnNumber);
      return next;
    });
  };

  return { expanded, toggleExpand };
}
