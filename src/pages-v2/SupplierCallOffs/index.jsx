/** @import React from 'react' */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
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
import { DECLARED_PRESENT } from '@services/data/fixturePresent';
/** @import { CallOffView } from '@services/transitions/callOffRules' */
import { isDueWithoutHeadsUp } from '@services/transitions/callOffRules';
import { callOffShipment, draftForCallOff } from '@services/transitions/shipmentNotice';
import { useAdvanceShipNoticeCreate } from '@services/query/commandHooks';
import { useCallOffViews } from '../callOffs/callOffDisplay';
import { useCallOffChase } from '@services/query/hooks';
import { PicFilter, usePicFilter } from '../materials/picDisplay';
import MaterialSearch, { useMaterialMatcher } from '@components/ui-v2/MaterialSearch';
import { searchMaterials } from '@services/transitions/matchMaterial';
import { useAsnWizardAvailability } from '../shipments/asnWizardEntry';
import { EMPTY } from './const';
import { useCallOffResponse } from './hooks/useCallOffResponse';
import { useMarkShipped } from './hooks/useMarkShipped';
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
  // UCX-P1 (BL-362) — the To do's missing-ASN row opens `?status=missingAsn`:
  // the call-offs with an open chase, read from the same source that counts it.
  const missingAsn = useCallOffChase();
  const confirmAvailability = useVerbAvailability('calloff:confirm');
  const dispatchAvailability = useVerbAvailability('calloff:dispatch');
  // IA-S04 — the ASN for a confirmed call-off is made in the Create-ASN wizard,
  // which needs both ASN atoms.
  const asnWizard = useAsnWizardAvailability();
  // UCX-P3 (BL-364) — "Mark as shipped" sends the notice AND opens the draft
  // ASN, so the page holds the ASN create mutation for that one act.
  const createAsnMutation = useAdvanceShipNoticeCreate();
  const [selectedId, setSelectedId] = useState(/** @type {string | null} */ (null));
  const [form, setForm] = useState(EMPTY);
  // UCX-P1 (BL-362) — a To do row counting one call-off opens its panel
  // (`?callOff=`), as the PO row opens its order (`?po=`). The linked call-off
  // is a DERIVED selection, not an effect: until the supplier clicks or edits,
  // the panel reads the linked call-off and its own opening form.
  const [formForId, setFormForId] = useState(/** @type {string | null} */ (null));
  const [searchParams, setSearchParams] = useSearchParams();
  const linkedCallOffId = searchParams.get('callOff');
  /**
   * The form a call-off's panel opens with. UCX-P3 (BL-364) — the mark step
   * starts from the call-off's own values (UCX-F9): the shipped date is the
   * hub's today, the arrival its need date, and the quantity its agreed
   * figure. All three stay editable.
   * @param {CallOffView} v
   */
  const formFor = (v) => {
    const { quantity, expectedArrival } = callOffShipment(v.callOff);
    return {
      ...EMPTY,
      shippedDate: DECLARED_PRESENT,
      expectedArrival,
      dispatchQty: String(quantity)
    };
  };
  const linkedView = linkedCallOffId
    ? (views.find((v) => v.callOff.id === linkedCallOffId) ?? null)
    : null;
  const effectiveSelectedId = selectedId ?? linkedView?.callOff.id ?? null;
  const panelForm =
    formForId === effectiveSelectedId ? form : linkedView ? formFor(linkedView) : EMPTY;
  /** @param {typeof EMPTY} next */
  const setPanelForm = (next) => {
    setFormForId(effectiveSelectedId);
    setForm(next);
  };
  const { command, run, proposal, sendAnswer } = useCallOffResponse(panelForm, setPanelForm);
  // UCX-P3 (BL-364) — the one-step shipment notice: notice + draft ASN.
  const mark = useMarkShipped({ asns, createAsnMutation });
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
    /** @type {'all' | 'toConfirm' | 'dueSoon' | 'missingAsn'} */ ('all')
  );
  // Deep-link read: `?status=toConfirm|dueSoon|missingAsn` narrows to the
  // call-offs the linking task named.
  useUrlEnumParam(
    'status',
    /** @type {('all' | 'toConfirm' | 'dueSoon' | 'missingAsn')[]} */ ([
      'all',
      'toConfirm',
      'dueSoon',
      'missingAsn'
    ]),
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
  const openChaseIds = new Set(
    (missingAsn.data?.items ?? []).filter((r) => r.state === 'open').map((r) => r.callOffId)
  );
  const missingAsnCount = allRows.filter((v) => openChaseIds.has(v.callOff.id)).length;
  const rows =
    statusFilter === 'toConfirm'
      ? allRows.filter((v) => v.callOff.status === 'Awaiting Confirmation')
      : statusFilter === 'dueSoon'
        ? allRows.filter((v) => isDueWithoutHeadsUp(v, nowIso))
        : statusFilter === 'missingAsn'
          ? allRows.filter((v) => openChaseIds.has(v.callOff.id))
          : allRows;
  /** @type {CallOffView | null} */
  const selected = rows.find((v) => v.callOff.id === effectiveSelectedId) ?? null;
  // UCX-P3 — the open draft this call-off's mark step already created, if any.
  const draftAsn = selected ? draftForCallOff(asns, selected.callOff.id) : null;
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
    setFormForId(id);
    const v = rows.find((x) => x.callOff.id === id);
    setForm(v ? formFor(v) : { ...EMPTY });
  };
  /** Close the panel and drop the `?callOff=` link that opened it. */
  const close = () => {
    setSelectedId(null);
    const next = new URLSearchParams(searchParams);
    next.delete('callOff');
    setSearchParams(next, { replace: true });
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
          { id: 'dueSoon', label: t('co.sup.filter.dueSoon'), count: dueSoon },
          { id: 'missingAsn', label: t('co.sup.filter.missingAsn'), count: missingAsnCount }
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
        onClose={close}
        form={panelForm}
        setForm={setPanelForm}
        busy={command.isPending || mark.pending}
        confirmAvailability={confirmAvailability}
        dispatchAvailability={dispatchAvailability}
        asnWizard={asnWizard}
        draftAsn={draftAsn}
        markShipped={mark.markShipped}
        run={run}
        proposal={proposal}
        sendAnswer={sendAnswer}
      />
    </AppShellV2>
  );
};

export default SupplierCallOffs;
