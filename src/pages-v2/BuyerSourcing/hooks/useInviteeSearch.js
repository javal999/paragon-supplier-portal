/** @import { DraftRfq } from '../const' */
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useInviteeCandidates } from '@services/query/hooks';
import { CATEGORY_TO_SUPPLIER_CATEGORY, mappedSourcingType } from '@services/sourcing/sourcingType';
import { matchesSupplierFilters } from '@services/sourcing/supplierFilters';
import { purchasingGroupNameKey } from '@services/sourcing/rfxConfig';
import { useSourcingTypeMap } from '../../rfx/eligibilityDisplay';
import {
  useSupplierFilterLabels,
  useSupplierFilterParams
} from '../../suppliers/SupplierFilterBar';

// ── REQ-E03-01 — THE INVITEE SEARCH ────────────────────────────────────
//
// The candidates come from the read model, NOT from `suppliers`: the read
// applies the status gate (`isSelectableSupplier`), so a suspended,
// deactivated or blacklisted supplier is not a candidate at all rather than
// a row this page has to remember to filter. The category filter still maps
// the RFQ category onto the master's own category vocabulary here, because
// that mapping is this wizard's and not the master's.
/**
 * The wizard's invitee search: the purchasing-group filter, the BR-05 filters
 * (in the page address), the candidate read for the draft's category and
 * materials, the event's sourcing type, and what the Suppliers step lists —
 * the AI recommendations, the filtered table, the countries on offer and the
 * filters in force. Moved out of `SourcingWorkspace` by the Phase 5 page split
 * (no behaviour change). `supplierSearch` is owned by the wizard, which clears
 * it on every opening.
 * @param {{
 *   draft: DraftRfq;
 *   supplierSearch: string;
 *   setSupplierSearch: (s: string) => void;
 * }} args
 */
export const useInviteeSearch = ({ draft, supplierSearch, setSupplierSearch }) => {
  const { t } = useTranslation();
  // REQ-E03-01 BR-01 — the purchasing-group filter, usable alone or with the
  // category one. '' means the filter is off, which is a different state from
  // "matched nothing" and is what the empty state has to be able to say.
  const [inviteeGroup, setInviteeGroup] = useState('');
  // BL-52 / REQ-E03-01 BR-05 — certificate validity, band and country, in the
  // page address, composing with the category and purchasing-group filters.
  const { filters: inviteeFilters, setFilters: setInviteeFilters } = useSupplierFilterParams();
  const inviteeFilterLabels = useSupplierFilterLabels();

  /** @type {readonly string[]} */
  const cats = draft.category ? CATEGORY_TO_SUPPLIER_CATEGORY[draft.category] : [];
  // Material G2 (MR-10 BR-06) — the event's type comes from its category; the
  // buyer never types it. It travels with the search so each candidate carries
  // its eligibility (BR-05).
  const sourcingMap = useSourcingTypeMap();
  const draftSourcingType = draft.category
    ? mappedSourcingType({ kind: 'rfq', materialCategory: draft.category }, sourcingMap)
    : undefined;
  // CR-23 / BR-06 — the chosen materials travel with the search so each
  // candidate carries its compliance gate: a failing supplier stays selectable
  // (it can be invited and can quote) and is marked as not awardable.
  const inviteeCandidatesQuery = useInviteeCandidates({
    ...(inviteeGroup ? { purchasingGroup: inviteeGroup } : {}),
    materialCodes: draft.materials,
    ...(draftSourcingType ? { sourcingType: draftSourcingType } : {})
  });
  const inviteePool = useMemo(
    () =>
      (inviteeCandidatesQuery.data?.items ?? []).filter((c) =>
        draft.category ? cats.includes(c.category) : true
      ),
    [inviteeCandidatesQuery.data, draft.category, cats]
  );

  const aiRecommendedSuppliers = useMemo(() => {
    if (!draft.category) return [];
    // A supplier with NO history sorts last rather than bottom-of-the-league:
    // `-1` is outside the 0..100 axis, so it can never be confused with a
    // measured zero, and the list never recommends a supplier on a number that
    // does not exist.
    // Material G2 — never recommend a vendor the event cannot invite.
    return inviteePool
      .filter((c) => c.eligibility?.state !== 'refused')
      .sort((a, b) => (b.otif ?? -1) - (a.otif ?? -1))
      .slice(0, 4);
  }, [draft.category, inviteePool]);

  /** BL-52 — the countries this pool can offer, before the BR-05 filters narrow it. */
  const inviteeCountries = useMemo(
    () => [...new Set(inviteePool.map((c) => c.country))].sort(),
    [inviteePool]
  );

  const supplierTableFiltered = useMemo(
    () =>
      inviteePool.filter((s) => {
        // BL-52 / BR-05 — composes with category and purchasing group (AND).
        if (!matchesSupplierFilters(s, inviteeFilters)) return false;
        if (!supplierSearch) return true;
        const q = supplierSearch.toLowerCase();
        return s.supplierName.toLowerCase().includes(q) || s.country.toLowerCase().includes(q);
      }),
    [supplierSearch, inviteePool, inviteeFilters]
  );

  /** The filters in force, in business language — what the empty state shows. */
  const activeInviteeFilters = useMemo(() => {
    /** @type {string[]} */
    const parts = [];
    if (draft.category) parts.push(draft.category);
    if (inviteeGroup) {
      const key = purchasingGroupNameKey(inviteeGroup);
      parts.push(`${inviteeGroup}${key ? ` · ${t(key)}` : ''}`);
    }
    parts.push(...inviteeFilterLabels(inviteeFilters));
    return parts;
  }, [draft.category, inviteeGroup, t, inviteeFilters, inviteeFilterLabels]);

  const clearInviteeFilters = () => {
    setInviteeGroup('');
    setSupplierSearch('');
    setInviteeFilters({});
  };

  return {
    inviteeGroup,
    setInviteeGroup,
    inviteeFilters,
    setInviteeFilters,
    draftSourcingType,
    aiRecommendedSuppliers,
    inviteeCountries,
    supplierTableFiltered,
    activeInviteeFilters,
    clearInviteeFilters
  };
};
