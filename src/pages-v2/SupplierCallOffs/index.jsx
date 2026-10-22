/** @import React from 'react' */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle } from 'lucide-react';
import AppShellV2 from '@components/layout-v2/AppShellV2';
import PageHeader from '@components/ui-v2/PageHeader';
import {
  OrderNotFound,
  PoFilterBanner,
  drilledPoId,
  usePoDrillFilter
} from '../orders/PoDrillFilter';
import { callOffsForPo } from '../orders/orderSummaryModel';
import PageMetaLine from '@components/ui-v2/PageMetaLine';
import SampleDataBadge from '@components/ui-v2/SampleDataBadge';
import Data from '@components/ui-v2/Data';
import LoadingState from '@components/ui-v2/LoadingState';
import ErrorState from '@components/ui-v2/ErrorState';
import EmptyState from '@components/ui-v2/EmptyState';
import NoSupplierIdentity from '@components/ui-v2/NoSupplierIdentity';
import { useCurrentIdentity } from '@context/CurrentIdentityContext';
import { useVerbAvailability } from '@hooks/useVerbAvailability';
import { useUrlEnumParam } from '@hooks/useUrlEnumParam';
import FilterChipsBar from '@components/ui-v2/FilterChipsBar';
import { formatDate } from '@lib/format';
/** @import { CallOffView } from '@services/transitions/callOffRules' */
import { isDueWithoutHeadsUp } from '@services/transitions/callOffRules';
import { useCallOffViews } from '../callOffs/callOffDisplay';
import { PicFilter, usePicFilter } from '../materials/picDisplay';
import MaterialSearch, { useMaterialMatcher } from '@components/ui-v2/MaterialSearch';
import { searchMaterials } from '@services/transitions/matchMaterial';
import { useAsnWizardAvailability } from '../shipments/asnWizardEntry';
import { EMPTY } from './const';
import { useCallOffResponse } from './hooks/useCallOffResponse';
import CallOffTable from './components/CallOffTable';
import CallOffPanel from './components/CallOffPanel';

// ─────────────────────────────────────────────────────────────────────────────
// SUPPLIER CALL-OFFS — REQ-E09-03 (confirmation) and REQ-E09-04 (dispatch).
//
// The supplier's own released call-offs, one line each: need date, quantity,
// type, the 1-working-day "confirm by" deadline, and its status. The supplier
// confirms, confirms with a new date or quantity, partially confirms (2
// deliveries) or rejects with a reason; the page says before sending whether
// the answer is accepted at once or goes to PTI for approval, using the same
// tolerance rule the verb applies. On an accepted confirmation the supplier
// sends a dispatch notice; an ASN for the call-off counts as one.
//
// Split into this folder by the Phase 5 page split (no behaviour change): the
// table is `components/CallOffTable` + `CallOffRow`, the side panel is
// `components/CallOffPanel` (details, respond and dispatch sections), and the
// command handlers are `hooks/useCallOffResponse`.
// ─────────────────────────────────────────────────────────────────────────────

/** @type {React.FC} */
const SupplierCallOffs = () => {
  const { t } = useTranslation();
  const { identity } = useCurrentIdentity();
  const { views, nowIso, asns, isPending, error, refetch } = useCallOffViews();
  const confirmAvailability = useVerbAvailability('calloff:confirm');
  const dispatchAvailability = useVerbAvailability('calloff:dispatch');
  // IA-S04 — the ASN for a confirmed call-off is made in the Create-ASN wizard,
  // which needs both ASN atoms.
  const asnWizard = useAsnWizardAvailability();
  const [selectedId, setSelectedId] = useState(/** @type {string | null} */ (null));
  const [form, setForm] = useState(EMPTY);
  const { command, run, proposal, sendAnswer } = useCallOffResponse(form, setForm);
  const crumb = [t('hub.nav.section.supplierOrders'), t('co.sup.title')];
  // REQ-E07-03 — the drill-through filter. The supplier's own read already
  // excludes drafts and dismissed drafts, so the predicate only narrows by PO.
  const drill = usePoDrillFilter();
  const drilledPo = drilledPoId(drill);
  // Material C4 — the PIC filter (by name: a supplier never sees the code).
  const pic = usePicFilter();
  // Material C3 — the one material search (MR-3 BR-04); a supplier's names
  // are its own (narrowed in the read model, MAT-R4).
  const [search, setSearch] = useState('');
  const matchOf = useMaterialMatcher();
  const [statusFilter, setStatusFilter] = useState(
    /** @type {'all' | 'toConfirm' | 'dueSoon'} */ ('all')
  );
  // Deep-link read: `?status=toConfirm|dueSoon` narrows to the call-offs the
  // linking task named.
  useUrlEnumParam(
    'status',
    /** @type {('all' | 'toConfirm' | 'dueSoon')[]} */ (['all', 'toConfirm', 'dueSoon']),
    setStatusFilter
  );

  if (!identity.supplierId) return <NoSupplierIdentity />;
  if (isPending || drill.kind === 'pending') return <LoadingState breadcrumb={crumb} />;
  // AC-07 / AC-08 — identical refusal for an unknown PO and another supplier's.
  if (drill.kind === 'notFound') return <OrderNotFound persona="supplier" breadcrumb={crumb} />;
  if (error) return <ErrorState breadcrumb={crumb} error={error} onRetry={refetch} />;
  if (views.length === 0)
    return (
      <EmptyState
        breadcrumb={crumb}
        title={t('co.sup.empty.title')}
        subtitle={t('co.sup.subtitle')}
        message={t('co.sup.empty.message')}
      />
    );

  const scoped = drilledPo === null ? views : callOffsForPo(views, drilledPo);
  const allRows = [...scoped].sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const toConfirm = allRows.filter((v) => v.callOff.status === 'Awaiting Confirmation').length;
  const dueSoon = allRows.filter((v) => isDueWithoutHeadsUp(v, nowIso)).length;
  const rows =
    statusFilter === 'toConfirm'
      ? allRows.filter((v) => v.callOff.status === 'Awaiting Confirmation')
      : statusFilter === 'dueSoon'
        ? allRows.filter((v) => isDueWithoutHeadsUp(v, nowIso))
        : allRows;
  /** @type {CallOffView | null} */
  const selected = rows.find((v) => v.callOff.id === selectedId) ?? null;
  const listed = searchMaterials(
    search,
    rows.filter((v) => pic.matches(v.callOff.mrpController)),
    (v) => ({
      code: v.callOff.materialCode,
      description: v.callOff.description,
      supplierId: v.callOff.supplierId
    }),
    matchOf
  );

  /** @param {string} id */
  const open = (id) => {
    setSelectedId(id);
    const v = rows.find((x) => x.callOff.id === id);
    setForm({
      ...EMPTY,
      dispatchQty: v
        ? String(
            v.callOff.confirmation?.deliveries.reduce((s, d) => s + d.quantity, 0) ??
              v.callOff.quantity
          )
        : ''
    });
  };

  return (
    <AppShellV2>
      <PageHeader breadcrumb={crumb} title={t('co.sup.title')} subtitle={t('co.sup.subtitle')} />
      <PageMetaLine className="-mt-6 mb-4">
        {t('co.asOf')} <Data>{formatDate(nowIso)}</Data>
        <SampleDataBadge className="ml-3 align-middle" />
      </PageMetaLine>

      {/* BR-04 / AC-02 — the filter is visible, and the way back is offered. */}
      <PoFilterBanner
        drill={drill}
        persona="supplier"
        count={drilledPo === null ? undefined : rows.length}
      />

      {(toConfirm > 0 || dueSoon > 0) && (
        <div
          role="status"
          data-testid="supplier-calloff-banner"
          className="bg-warning-soft border-l-2 border-warning rounded px-4 py-3 mb-4 text-sm text-warning-hover space-y-1"
        >
          {toConfirm > 0 && (
            <div className="flex items-center gap-2">
              <AlertTriangle size={14} aria-hidden="true" />
              {t('co.sup.banner.confirm', { count: toConfirm })}
            </div>
          )}
          {dueSoon > 0 && <div>{t('co.sup.banner.dueSoon', { count: dueSoon })}</div>}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex-1 min-w-[240px]">
          <MaterialSearch
            mode="filter"
            query={search}
            onQueryChange={setSearch}
            testId="supplier-calloff-search"
          />
        </div>
        <PicFilter
          refs={rows.map((v) => v.callOff.mrpController)}
          persona="supplier"
          filter={pic.filter}
          setFilter={pic.setFilter}
          myCode={pic.myCode}
        />
      </div>

      <FilterChipsBar
        options={[
          { id: 'all', label: t('co.pti.filter.all') },
          { id: 'toConfirm', label: t('co.sup.filter.toConfirm'), count: toConfirm },
          { id: 'dueSoon', label: t('co.sup.filter.dueSoon'), count: dueSoon }
        ]}
        value={statusFilter}
        onChange={setStatusFilter}
        className="mb-4"
      />

      {statusFilter !== 'all' && rows.length === 0 && (
        <p
          className="text-sm text-text-tertiary py-8 text-center"
          data-testid="supplier-calloff-filter-empty"
        >
          {t('co.pti.filter.empty')}
        </p>
      )}

      <CallOffTable listed={listed} onOpen={open} />

      <CallOffPanel
        selected={selected}
        onClose={() => setSelectedId(null)}
        form={form}
        setForm={setForm}
        busy={command.isPending}
        confirmAvailability={confirmAvailability}
        dispatchAvailability={dispatchAvailability}
        asnWizard={asnWizard}
        asns={asns}
        run={run}
        proposal={proposal}
        sendAnswer={sendAnswer}
      />
    </AppShellV2>
  );
};

export default SupplierCallOffs;
