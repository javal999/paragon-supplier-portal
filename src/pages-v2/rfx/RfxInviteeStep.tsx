// ────────────────────────────────────────────────────────────────────────────
// THE INVITEE STEP — REQ-E03-01, shared by every event type (section 3.6a).
//
// The RFQ wizard has asked "who is asked?" since C.2, and the RFI and RFP
// wizards ask it identically: same filters (BR-01 — category and purchasing
// group, alone or together; BR-05 / BL-52 — certificate validity, performance
// band and country, held in the page address), same OTIF column with "No
// history" where nothing is measured, same empty state that NAMES the filters
// in force.
//
// ⚠️ **THE POOL COMES FROM THE READ MODEL, NOT FROM THE SUPPLIER LIST, AND THAT
// IS THE STATUS GATE.** `getInviteeCandidates` applies `isSelectableSupplier`,
// so a suspended, deactivated or blacklisted supplier is NOT A CANDIDATE rather
// than a row each wizard has to remember to filter out. A second copy of that
// filter here is a second place for it to drift, and the publish verb re-reads
// the statuses anyway (`RFX_PUBLISH_HAS_INVITEES`) because the pool a buyer saw
// yesterday is not the pool that exists when the invitation actually goes out.
//
// ⚠️ **`otif === null` IS A SENTENCE, NEVER A ZERO.** A supplier nothing has
// been measured against is not a supplier that failed every delivery, and a
// `?? 0` here would recommend against a new supplier on a number that does not
// exist (REQ-E03-01 AC-02).
// ────────────────────────────────────────────────────────────────────────────

import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Button from '@components/ui-v2/Button';
import Data from '@components/ui-v2/Data';
import SearchBar from '@components/ui-v2/SearchBar';
import { useInviteeCandidates } from '@services/query/hooks';
import { PURCHASING_GROUPS, purchasingGroupNameKey } from '@services/sourcing/rfxConfig';
import { GateMarker } from './rfxDisplay';
import { EligibilityMarker, SourcingTypePill } from './eligibilityDisplay';
import type { SourcingType } from '@services/sourcing/sourcingType';
import { matchesSupplierFilters } from '@services/sourcing/supplierFilters';
import SupplierFilterBar, {
  bandLabel,
  certLabel,
  useSupplierFilterLabels,
  useSupplierFilterParams,
} from '../suppliers/SupplierFilterBar';

interface RfxInviteeStepProps {
  /** The supplier-master category this event's family narrows to; '' = all. */
  supplierCategory: string;
  selected: readonly string[];
  onToggle: (supplierId: string) => void;
  /** Distinguishes this picker's rows in a test sweep (`rfi`, `rfp`). */
  testIdPrefix: string;
  /**
   * Material G2 (MR-10 BR-05, BR-06) — the event's sourcing type, from its
   * category. Absent until a family is chosen: nothing is judged yet.
   */
  sourcingType?: SourcingType;
}

const RfxInviteeStep: React.FC<RfxInviteeStepProps> = ({
  supplierCategory,
  selected,
  onToggle,
  testIdPrefix,
  sourcingType,
}) => {
  const { t } = useTranslation();
  const [group, setGroup] = useState('');
  const [search, setSearch] = useState('');
  // BL-52 / BR-05 — certificate validity, band and country, in the page address.
  const { filters, setFilters } = useSupplierFilterParams();
  const filterLabels = useSupplierFilterLabels();

  const candidates = useInviteeCandidates(
    group || sourcingType
      ? { ...(group ? { purchasingGroup: group } : {}), ...(sourcingType ? { sourcingType } : {}) }
      : undefined,
  );

  const pool = useMemo(
    () =>
      (candidates.data?.items ?? []).filter((c) =>
        supplierCategory ? c.category === supplierCategory : true,
      ),
    [candidates.data, supplierCategory],
  );

  /** The countries this pool can offer — derived before the BR-05 filters narrow it. */
  const countries = useMemo(() => [...new Set(pool.map((c) => c.country))].sort(), [pool]);

  const rows = useMemo(() => {
    // BL-52 — composes with category and purchasing group (AND), the same rule
    // `filterInvitees` applies to the read.
    const narrowed = pool.filter((c) => matchesSupplierFilters(c, filters));
    if (!search) return narrowed;
    const q = search.toLowerCase();
    return narrowed.filter(
      (s) => s.supplierName.toLowerCase().includes(q) || s.country.toLowerCase().includes(q),
    );
  }, [pool, search, filters]);

  /** The filters in force, in business language — what the empty state shows. */
  const activeFilters = useMemo(() => {
    const parts: string[] = [];
    if (supplierCategory) parts.push(supplierCategory);
    if (group) {
      const key = purchasingGroupNameKey(group);
      parts.push(`${group}${key ? ` · ${t(key)}` : ''}`);
    }
    parts.push(...filterLabels(filters));
    return parts;
  }, [supplierCategory, group, t, filters, filterLabels]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[12rem]">
          <label
            className="block text-xs font-semibold text-text-secondary mb-1"
            htmlFor={`${testIdPrefix}-invitee-group`}
          >
            {t('rfx.invite.purchasingGroup')}
          </label>
          <select
            id={`${testIdPrefix}-invitee-group`}
            data-testid={`${testIdPrefix}-invitee-group-filter`}
            value={group}
            onChange={(e) => setGroup(e.target.value)}
            className="w-full bg-white border border-border-input rounded-md px-3 h-10 text-sm focus:outline-none focus:border-action"
          >
            <option value="">{t('rfx.pg.all')}</option>
            {PURCHASING_GROUPS.map((g) => (
              <option key={g.code} value={g.code}>
                {g.code} · {t(g.nameKey)}
              </option>
            ))}
          </select>
        </div>
        <div className="flex-1 min-w-[14rem]">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder={t('sourcing.wizard.search.supplier')}
          />
        </div>
      </div>
      {/* BL-52 / REQ-E03-01 BR-05 — after category and purchasing group. */}
      <SupplierFilterBar
        filters={filters}
        onChange={setFilters}
        countries={countries}
        testIdPrefix={`${testIdPrefix}-invitee`}
      />
      <p className="text-xs text-text-tertiary -mt-3">{t('rfx.invite.onlyActive')}</p>
      <p className="text-xs text-text-tertiary -mt-3">{t('rfx.gate.inviteNote')}</p>
      {/* Material G2 — the event's type, and who it lets through. */}
      {!!sourcingType && (
        <div className="-mt-2 space-y-1">
          <SourcingTypePill type={sourcingType} testId={`${testIdPrefix}-sourcing-type`} />
          <p className="text-xs text-text-tertiary">{t('elig.invite.note')}</p>
        </div>
      )}

      <div className="relative min-w-0 border border-border-subtle rounded-md max-h-64 overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-bg-hover text-text-tertiary uppercase tracking-wider text-xs sticky top-0">
            <tr>
              <th className="px-3 py-2 text-left font-semibold w-10"></th>
              <th className="px-3 py-2 text-left font-semibold">{t('rfx.invite.col.supplier')}</th>
              <th className="px-3 py-2 text-left font-semibold">{t('rfx.invite.col.group')}</th>
              <th className="px-3 py-2 text-left font-semibold">{t('rfx.invite.col.country')}</th>
              <th className="px-3 py-2 text-left font-semibold">{t('supFilter.col.certificates')}</th>
              <th className="px-3 py-2 text-left font-semibold">{t('supFilter.col.band')}</th>
              <th className="px-3 py-2 text-right font-semibold">{t('rfx.invite.col.otif')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((s) => {
              const chosen = selected.includes(s.supplierId);
              // Material G2 — below the level against a real list: listed
              // greyed, never selectable (MR-10 section d step 2).
              const offered = s.eligibility?.state !== 'refused';
              return (
                <tr
                  key={s.supplierId}
                  data-testid={`${testIdPrefix}-invitee-row-${s.supplierId}`}
                  data-offered={offered}
                  className={`border-t border-border-subtle ${offered ? 'hover:bg-bg-hover cursor-pointer' : 'opacity-60'}`}
                  onClick={offered ? () => onToggle(s.supplierId) : undefined}
                >
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      aria-label={offered ? s.supplierName : `${s.supplierName} — ${t('elig.invite.notOffered')}`}
                      checked={chosen && offered}
                      disabled={!offered}
                      onChange={() => onToggle(s.supplierId)}
                      onClick={(e) => e.stopPropagation()}
                      className="accent-teal"
                    />
                  </td>
                  <td className="px-3 py-2 text-text-primary">
                    {s.supplierName}
                    {/* CR-23 / BR-06 — still selectable; marked as not awardable. */}
                    <div className="mt-1">
                      <GateMarker gate={s.gate} testId={`${testIdPrefix}-invitee-gate-${s.supplierId}`} />
                    </div>
                    {/* Material G2 — not qualified for this event's type, with the missing documents. */}
                    <div className="mt-1">
                      <EligibilityMarker eligibility={s.eligibility} testId={`${testIdPrefix}-invitee-elig-${s.supplierId}`} />
                    </div>
                  </td>
                  <td className="px-3 py-2 text-text-secondary">
                    <Data>{s.purchasingGroup ?? '—'}</Data>
                  </td>
                  <td className="px-3 py-2 text-text-secondary">{s.country}</td>
                  {/* BL-52 — the two BR-05 facts the filters read, on the row. */}
                  <td className="px-3 py-2 text-text-secondary" data-testid={`${testIdPrefix}-invitee-cert-${s.supplierId}`}>
                    {certLabel(t, s.certificates)}
                  </td>
                  <td className="px-3 py-2 text-text-secondary" data-testid={`${testIdPrefix}-invitee-band-${s.supplierId}`}>
                    {bandLabel(t, s.band)}
                  </td>
                  {/* REQ-E03-01 AC-02 — the OTIF, or "No history". NEVER 0%. */}
                  <td className="px-3 py-2 text-right text-text-secondary">
                    {s.otif === null ? (
                      <span className="text-text-tertiary">{t('rfx.noHistory')}</span>
                    ) : (
                      <Data>{s.otif}%</Data>
                    )}
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center text-sm text-text-tertiary py-6">
                  {/* REQ-E03-01 edge case — the empty state names what was asked. */}
                  <div data-testid={`${testIdPrefix}-invitee-empty`}>
                    <div>{t('rfx.invite.empty')}</div>
                    <div className="mt-1 text-xs">
                      {activeFilters.length > 0
                        ? t('rfx.invite.activeFilters', { filters: activeFilters.join(', ') })
                        : t('rfx.invite.noFilters')}
                    </div>
                    <Button
                      variant="secondary"
                      className="mt-3"
                      onClick={() => {
                        setGroup('');
                        setSearch('');
                        setFilters({});
                      }}
                      data-testid={`${testIdPrefix}-invitee-clear-filters`}
                    >
                      {t('rfx.invite.clear')}
                    </Button>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="text-sm text-text-secondary">
        <span className="inline-flex items-center gap-1.5 bg-teal-soft text-teal-hover rounded-full px-3 py-1 text-xs font-semibold">
          {t('rfx.invite.selected', { count: selected.length })}
        </span>
        {selected.length === 0 && (
          <p className="text-xs text-text-tertiary mt-2" data-testid={`${testIdPrefix}-invitee-none`}>
            {t('rfx.create.atLeastOneInvitee')}
          </p>
        )}
      </div>
    </div>
  );
};

export default RfxInviteeStep;
