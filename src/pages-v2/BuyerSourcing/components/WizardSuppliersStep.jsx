// ────────────────────────────────────────────────────────────────────────────
// The RFQ wizard's "Suppliers" step: the AI recommendations, the invitee
// filters, the candidate table and the selected count. Moved out of
// `BuyerSourcing.jsx` by the Phase 5 page split (no behaviour change).
// ────────────────────────────────────────────────────────────────────────────
/** @import React from 'react' */
/** @import { TFunction } from 'i18next' */
/** @import { DraftRfq } from '../const' */
/** @import { useInviteeSearch } from '../hooks/useInviteeSearch' */
import { Sparkles } from 'lucide-react';
import SearchBar from '@components/ui-v2/SearchBar';
import Data from '@components/ui-v2/Data';
import Button from '@components/ui-v2/Button';
import { GateMarker } from '../../rfx/rfxDisplay';
import { EligibilityMarker, SourcingTypePill } from '../../rfx/eligibilityDisplay';
import SupplierFilterBar, { bandLabel, certLabel } from '../../suppliers/SupplierFilterBar';
import { PURCHASING_GROUPS } from '@services/sourcing/rfxConfig';

/**
 * @typedef {ReturnType<typeof useInviteeSearch>} InviteeSearch
 * @typedef {object} WizardSuppliersStepProps
 * @property {DraftRfq} draft
 * @property {InviteeSearch} invitees The invitee search (filters, pool, recommendations).
 * @property {string} supplierSearch The free-text search, owned by the wizard.
 * @property {(s: string) => void} setSupplierSearch
 * @property {(id: string) => void} toggleSupplier Invite or un-invite a supplier.
 * @property {TFunction} t
 */

/**
 * The AI-recommended suppliers for the draft's category, as selectable cards.
 * @type {React.FC<Pick<WizardSuppliersStepProps, 'draft' | 'toggleSupplier' | 't'> & { suppliers: InviteeSearch['aiRecommendedSuppliers'] }>}
 */
const RecommendedSuppliers = ({ draft, suppliers, toggleSupplier, t }) => (
  <div className="bg-teal-soft border border-teal/20 rounded-md p-4">
    <div className="flex items-center gap-2 mb-3">
      <Sparkles size={16} className="text-teal" />
      <h4 className="text-sm font-semibold text-text-primary">{t('sourcing.wizard.ai.title')}</h4>
      <span className="text-xs text-text-tertiary">{t('sourcing.wizard.ai.basis')}</span>
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {suppliers.map((s) => {
        const selected = draft.invitedSupplierIds.includes(s.supplierId);
        return (
          <label
            key={s.supplierId}
            className={`flex items-start gap-3 p-3 rounded-md border cursor-pointer transition-colors ${
              selected
                ? 'bg-bg-surface border-action'
                : 'bg-bg-surface border-border-subtle hover:border-action'
            }`}
          >
            <input
              type="checkbox"
              checked={selected}
              onChange={() => toggleSupplier(s.supplierId)}
              className="mt-0.5 accent-teal"
            />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-text-primary truncate">
                {s.supplierName}
              </div>
              <div className="text-xs text-text-tertiary">
                {s.country} · {t('rfx.otif')} {s.otif === null ? t('rfx.noHistory') : `${s.otif}%`}
                {s.purchasingGroup ? ` · ${s.purchasingGroup}` : ''}
              </div>
            </div>
          </label>
        );
      })}
    </div>
  </div>
);

/**
 * The candidate table: one row per invitee candidate, greyed and unselectable
 * when the event's sourcing type refuses it, and an empty state that names the
 * filters in force and offers to clear them.
 * @type {React.FC<Pick<WizardSuppliersStepProps, 'draft' | 'invitees' | 'toggleSupplier' | 't'>>}
 */
const InviteeTable = ({ draft, invitees, toggleSupplier, t }) => (
  <div className="relative min-w-0 border border-border-subtle rounded-md max-h-64 overflow-auto">
    <table className="w-full text-sm">
      <thead className="bg-bg-hover text-text-tertiary uppercase tracking-wider text-xs sticky top-0">
        <tr>
          <th className="px-3 py-2 text-left font-semibold w-10" />
          <th className="px-3 py-2 text-left font-semibold">{t('sourcing.wizard.col.supplier')}</th>
          <th className="px-3 py-2 text-left font-semibold">{t('rfx.invite.col.group')}</th>
          <th className="px-3 py-2 text-left font-semibold">{t('sourcing.wizard.col.country')}</th>
          <th className="px-3 py-2 text-left font-semibold">{t('supFilter.col.certificates')}</th>
          <th className="px-3 py-2 text-left font-semibold">{t('supFilter.col.band')}</th>
          <th className="px-3 py-2 text-right font-semibold">{t('sourcing.wizard.col.otif')}</th>
        </tr>
      </thead>
      <tbody>
        {invitees.supplierTableFiltered.map((s) => {
          const selected = draft.invitedSupplierIds.includes(s.supplierId);
          // Material G2 — below the level against a real list: listed
          // greyed with its missing documents, never selectable.
          const offered = s.eligibility?.state !== 'refused';
          return (
            <tr
              key={s.supplierId}
              data-testid={`invitee-row-${s.supplierId}`}
              data-offered={offered}
              className={`border-t border-border-subtle ${offered ? 'hover:bg-bg-hover cursor-pointer' : 'opacity-60'}`}
              onClick={offered ? () => toggleSupplier(s.supplierId) : undefined}
            >
              <td className="px-3 py-2">
                <input
                  type="checkbox"
                  aria-label={
                    offered ? s.supplierName : `${s.supplierName} — ${t('elig.invite.notOffered')}`
                  }
                  checked={selected && offered}
                  disabled={!offered}
                  onChange={() => toggleSupplier(s.supplierId)}
                  onClick={(e) => e.stopPropagation()}
                  className="accent-teal"
                />
              </td>
              <td className="px-3 py-2 text-text-primary">
                {s.supplierName}
                <div className="mt-1">
                  <GateMarker gate={s.gate} testId={`invitee-gate-${s.supplierId}`} />
                </div>
                <div className="mt-1">
                  <EligibilityMarker
                    eligibility={s.eligibility}
                    testId={`invitee-elig-${s.supplierId}`}
                  />
                </div>
              </td>
              <td className="px-3 py-2 text-text-secondary">
                <Data>{s.purchasingGroup ?? '—'}</Data>
              </td>
              <td className="px-3 py-2 text-text-secondary">{s.country}</td>
              {/* BL-52 — the two BR-05 facts the filters read, on the row. */}
              <td
                className="px-3 py-2 text-text-secondary"
                data-testid={`invitee-cert-${s.supplierId}`}
              >
                {certLabel(t, s.certificates)}
              </td>
              <td
                className="px-3 py-2 text-text-secondary"
                data-testid={`invitee-band-${s.supplierId}`}
              >
                {bandLabel(t, s.band)}
              </td>
              {/* REQ-E03-01 AC-02 — the OTIF, or "No history". NEVER 0%:
                  a supplier nothing has been measured against is not a
                  supplier that failed every delivery. */}
              <td
                className="px-3 py-2 text-right text-text-secondary"
                data-testid={`invitee-otif-${s.supplierId}`}
              >
                {s.otif === null ? (
                  <span className="text-text-tertiary">{t('rfx.noHistory')}</span>
                ) : (
                  <Data>{s.otif}%</Data>
                )}
              </td>
            </tr>
          );
        })}
        {invitees.supplierTableFiltered.length === 0 && (
          <tr>
            <td colSpan={7} className="text-center text-sm text-text-tertiary py-6">
              {/* REQ-E03-01 edge case — the empty state NAMES the active
                  filters and offers to clear them, because "no results"
                  without saying what was asked for is a dead end. */}
              <div data-testid="invitee-empty">
                <div>{t('rfx.invite.empty')}</div>
                <div className="mt-1 text-xs">
                  {invitees.activeInviteeFilters.length > 0
                    ? t('rfx.invite.activeFilters', {
                        filters: invitees.activeInviteeFilters.join(', ')
                      })
                    : t('rfx.invite.noFilters')}
                </div>
                <Button
                  variant="secondary"
                  className="mt-3"
                  onClick={invitees.clearInviteeFilters}
                  data-testid="invitee-clear-filters"
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
);

/**
 * The Suppliers step's content.
 * @type {React.FC<WizardSuppliersStepProps>}
 */
const WizardSuppliersStep = ({
  draft,
  invitees,
  supplierSearch,
  setSupplierSearch,
  toggleSupplier,
  t
}) => (
  <div className="space-y-5">
    {invitees.aiRecommendedSuppliers.length > 0 && (
      <RecommendedSuppliers
        draft={draft}
        suppliers={invitees.aiRecommendedSuppliers}
        toggleSupplier={toggleSupplier}
        t={t}
      />
    )}

    {/* REQ-E03-01 BR-01 — category (taken from the event) and purchasing
        group, usable alone or together. */}
    <div className="flex flex-wrap items-end gap-3">
      <div className="min-w-[12rem]">
        <label
          className="block text-xs font-semibold text-text-secondary mb-1"
          htmlFor="invitee-group"
        >
          {t('rfx.invite.purchasingGroup')}
        </label>
        <select
          id="invitee-group"
          data-testid="invitee-group-filter"
          value={invitees.inviteeGroup}
          onChange={(e) => invitees.setInviteeGroup(e.target.value)}
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
          value={supplierSearch}
          onChange={setSupplierSearch}
          placeholder={t('sourcing.wizard.search.supplier')}
        />
      </div>
    </div>
    {/* BL-52 / REQ-E03-01 BR-05 — after category and purchasing group. */}
    <SupplierFilterBar
      filters={invitees.inviteeFilters}
      onChange={invitees.setInviteeFilters}
      countries={invitees.inviteeCountries}
      testIdPrefix="rfq-invitee"
    />
    <p className="text-xs text-text-tertiary -mt-3">{t('rfx.invite.onlyActive')}</p>
    <p className="text-xs text-text-tertiary -mt-3">{t('rfx.gate.inviteNote')}</p>
    {/* Material G2 — the event's type, and who it lets through. */}
    {!!invitees.draftSourcingType && (
      <div className="-mt-2 space-y-1">
        <SourcingTypePill type={invitees.draftSourcingType} testId="rfq-sourcing-type" />
        <p className="text-xs text-text-tertiary">{t('elig.invite.note')}</p>
      </div>
    )}

    <InviteeTable draft={draft} invitees={invitees} toggleSupplier={toggleSupplier} t={t} />

    <div className="text-sm text-text-secondary">
      <span className="inline-flex items-center gap-1.5 bg-teal-soft text-teal-hover rounded-full px-3 py-1 text-xs font-semibold">
        {t(
          draft.invitedSupplierIds.length === 1
            ? 'sourcing.wizard.selectedCount.one'
            : 'sourcing.wizard.selectedCount.other',
          { count: draft.invitedSupplierIds.length }
        )}
      </span>
    </div>
  </div>
);

export default WizardSuppliersStep;
