// ────────────────────────────────────────────────────────────────────────────
// Fulfilment rules · shared helpers — the string predicates the ASN,
// shelf-life and batch rules read. Separate so each concern file imports
// them from one place without importing another concern. `isNonBlank` is
// exported for sibling files only; `index.js` does not re-export it.
// ────────────────────────────────────────────────────────────────────────────

/**
 * @param {unknown} v
 * @returns {v is string}
 */
export const isNonBlank = (v) => typeof v === 'string' && v.trim().length > 0;

/**
 * A real calendar date written `YYYY-MM-DD`.
 * @param {unknown} v
 * @returns {v is string}
 */
export const isCalendarDate = (v) => {
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const d = new Date(`${v}T00:00:00.000Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
};
