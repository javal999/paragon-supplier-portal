// ────────────────────────────────────────────────────────────────────────────
// BuyerRequisitions — pure helpers (no React). Moved out of the page's
// `useMemo` bodies by the Phase 5 page split (no behaviour change): the page
// still memoises each one on the same dependencies.
// ────────────────────────────────────────────────────────────────────────────

/** @import { PurchaseRequisition, PRStatus } from '@services/data/types' */
/** @import { GroupTab } from './const' */

/**
 * @typedef {object} RequisitionCounts
 * @property {number} all
 * @property {number} draft
 * @property {number} pending
 * @property {number} approved
 * @property {number} sourcing
 * @property {number} po
 * @property {number} rejected
 */

/**
 * How many requisitions sit in each status, plus the total. Feeds the KPI
 * tiles and the sub-tab counts.
 * @param {PurchaseRequisition[]} prs
 * @returns {RequisitionCounts}
 */
export const countByStatus = (prs) => {
  /** @param {PRStatus} s */
  const by = (s) => prs.filter((p) => p.status === s).length;
  return {
    all: prs.length,
    draft: by('Draft'),
    pending: by('Pending Approval'),
    approved: by('Approved'),
    sourcing: by('Sourcing Event'),
    po: by('PO Created'),
    rejected: by('Rejected')
  };
};

/**
 * The latest `createdDate` in the list (ISO strings compare in date order),
 * for the meta line. `''` for an empty list.
 * @param {PurchaseRequisition[]} prs
 * @returns {string}
 */
export const latestCreatedDate = (prs) =>
  prs.reduce((acc, p) => (p.createdDate > acc ? p.createdDate : acc), prs[0]?.createdDate ?? '');

/**
 * The rows the table shows: the selected status tab, then a case-insensitive
 * search over number, material, category, requestor and linked document.
 * @param {PurchaseRequisition[]} prs
 * @param {GroupTab} group
 * @param {string} search
 * @returns {PurchaseRequisition[]}
 */
export const filterRequisitions = (prs, group, search) =>
  prs.filter((pr) => {
    if (group !== 'all' && pr.status !== group) return false;
    if (search) {
      const q = search.toLowerCase();
      const hay =
        `${pr.prNumber} ${pr.material} ${pr.category} ${pr.requestor} ${pr.linkedDoc}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
