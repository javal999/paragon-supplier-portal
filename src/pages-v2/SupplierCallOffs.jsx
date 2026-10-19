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
} from './orders/PoDrillFilter';
import { callOffsForPo } from './orders/orderSummaryModel';
import PageMetaLine from '@components/ui-v2/PageMetaLine';
import SampleDataBadge from '@components/ui-v2/SampleDataBadge';
import Table from '@components/ui-v2/Table';
import TableHeader, { TableHeaderCell } from '@components/ui-v2/TableHeader';
import TableRow from '@components/ui-v2/TableRow';
import TableCell from '@components/ui-v2/TableCell';
import Button from '@components/ui-v2/Button';
import SidePanel from '@components/ui-v2/SidePanel';
import Data from '@components/ui-v2/Data';
import LoadingState from '@components/ui-v2/LoadingState';
import ErrorState from '@components/ui-v2/ErrorState';
import EmptyState from '@components/ui-v2/EmptyState';
import NoSupplierIdentity from '@components/ui-v2/NoSupplierIdentity';
import { HandoffNotice } from '@components/ui-v2/HandoffNotice';
import { useCurrentIdentity } from '@context/CurrentIdentityContext';
import { useToast } from '@hooks/useToast';
import { useRefusalText } from '@hooks/useRefusalText';
import { useVerbAvailability } from '@hooks/useVerbAvailability';
import { useUrlEnumParam } from '@hooks/useUrlEnumParam';
import FilterChipsBar from '@components/ui-v2/FilterChipsBar';
import { formatDate, formatDateTime } from '@lib/format';
/** @import { CallOffCommandVars } from '@services/query/commandHooks' */
import { useCallOffCommand } from '@services/query/commandHooks';
/** @import { CallOffConfirmationKind } from '@services/data/types' */
/** @import { CallOffView, ToleranceCheck } from '@services/transitions/callOffRules' */
import {
  checkTolerance,
  isConfirmedAndAccepted,
  isDueWithoutHeadsUp,
  pendingDelay,
  proposedDeliveries
} from '@services/transitions/callOffRules';
import CallOffDelays from './callOffs/CallOffDelays';
import {
  ConfirmationPill,
  DeliveryPill,
  ToleranceFindings,
  ToleranceTags,
  inputClass,
  labelClass,
  numberOf,
  qty,
  useCallOffViews
} from './callOffs/callOffDisplay';
import { PicCell, PicFilter, PicHeader, usePicFilter } from './materials/picDisplay';
import MaterialSearch, {
  MaterialMatchReason,
  useMaterialMatcher
} from '@components/ui-v2/MaterialSearch';
import { searchMaterials } from '@services/transitions/matchMaterial';

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
// ─────────────────────────────────────────────────────────────────────────────

/** @typedef {CallOffConfirmationKind | 'reject'} Answer */
// i18n-defer: answer identifiers, not copy — each renders through t(`co.respond.option.<id>`)
/** @type {readonly Answer[]} */
const ANSWERS = ['confirm', 'newDate', 'changes', 'partial', 'reject'];

const EMPTY = {
  answer: /** @type {Answer} */ ('confirm'),
  date: '',
  quantity: '',
  qty1: '',
  date1: '',
  qty2: '',
  date2: '',
  comment: '',
  reason: '',
  shippedDate: '',
  expectedArrival: '',
  dispatchQty: '',
  asnNumber: ''
};

/** @type {React.FC} */
const SupplierCallOffs = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const refusalText = useRefusalText();
  const { identity } = useCurrentIdentity();
  const { views, nowIso, asns, isPending, error, refetch } = useCallOffViews();
  const command = useCallOffCommand();
  const confirmAvailability = useVerbAvailability('calloff:confirm');
  const dispatchAvailability = useVerbAvailability('calloff:dispatch');
  const [selectedId, setSelectedId] = useState(/** @type {string | null} */ (null));
  const [form, setForm] = useState(EMPTY);
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

  /**
   * @param {CallOffCommandVars} vars
   * @param {string} success
   */
  const run = async (vars, success) => {
    try {
      const res = await command.mutateAsync(vars);
      if (res.status === 'failed') {
        toast({
          variant: 'warning',
          title: t('co.toast.refused'),
          description: refusalText(res.reason) ?? res.reason ?? ''
        });
        return;
      }
      toast({ variant: 'success', title: success });
      setForm(EMPTY);
    } catch {
      toast({ variant: 'error', title: t('co.toast.refused') });
    }
  };

  /**
   * What the chosen answer proposes, read the way the verb reads it.
   * @param {CallOffView} v
   */
  const proposal = (v) => {
    if (form.answer === 'reject') return null;
    const input = {
      confirmedDate:
        form.answer === 'changes' ? (form.date === '' ? undefined : form.date) : form.date,
      confirmedQty: numberOf(form.quantity),
      deliveries: [
        { quantity: numberOf(form.qty1), date: form.date1 },
        { quantity: numberOf(form.qty2), date: form.date2 }
      ]
    };
    const p = proposedDeliveries(v.callOff, form.answer, input);
    return 'deliveries' in p ? { deliveries: p.deliveries, input } : null;
  };

  /** @param {CallOffView} v */
  const sendAnswer = (v) => {
    const id = v.callOff.id;
    const comment = form.comment.trim() || undefined;
    const success = t(`co.toast.answer.${form.answer}`, { number: v.callOff.callOffNumber });
    if (form.answer === 'reject') {
      void run({ verb: 'reject', id, reason: form.reason.trim() }, success);
      return;
    }
    const p = proposal(v);
    if (!p) return;
    /** @type {CallOffCommandVars} */
    const vars =
      form.answer === 'confirm'
        ? { verb: 'confirm', id, comment }
        : form.answer === 'newDate'
          ? { verb: 'confirmNewDate', id, confirmedDate: form.date, comment }
          : form.answer === 'changes'
            ? {
                verb: 'confirmChanges',
                id,
                confirmedQty: numberOf(form.quantity),
                ...(form.date ? { confirmedDate: form.date } : {}),
                comment
              }
            : { verb: 'confirmPartial', id, deliveries: [...p.deliveries], comment };
    void run(vars, success);
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

      <div className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm overflow-x-auto">
        <Table>
          <TableHeader>
            {/* BL-38 — 7 columns, not 10: separately, the PO, the type and the
                confirm-by deadline pushed Confirmation, Delivery and the action
                off a 1280px screen. Each rides as a second line in the cell it
                qualifies, and each header names both, as the Order summary does. */}
            <TableHeaderCell>
              {t('co.col.callOff')}{' '}
              <span className="block text-[11px] font-normal normal-case text-text-tertiary">
                {t('co.col.po')}
              </span>
            </TableHeaderCell>
            {/* The PIC (#90) rides under the material, as the PO rides under the
                call-off: as its own column it pushed the table 257px past 1280. */}
            <TableHeaderCell>
              {t('co.col.material')}{' '}
              <span className="block text-[11px] font-normal normal-case text-text-tertiary">
                <PicHeader wrap />
              </span>
            </TableHeaderCell>
            <TableHeaderCell className="text-right">{t('co.col.quantity')}</TableHeaderCell>
            <TableHeaderCell>
              {t('co.col.needDate')}{' '}
              <span className="block text-[11px] font-normal normal-case text-text-tertiary">
                {t('co.col.type')}
              </span>
            </TableHeaderCell>
            <TableHeaderCell>
              {t('co.col.confirmation')}{' '}
              <span className="block text-[11px] font-normal normal-case text-text-tertiary">
                {t('co.col.confirmBy')}
              </span>
            </TableHeaderCell>
            <TableHeaderCell>{t('co.col.delivery')}</TableHeaderCell>
            <TableHeaderCell className="text-right">{t('co.col.action')}</TableHeaderCell>
          </TableHeader>
          <tbody>
            {listed.map(({ item: v, match }) => {
              const c = v.callOff;
              const needsAnswer = c.status === 'Awaiting Confirmation';
              return (
                <TableRow key={c.id} data-testid={`supplier-calloff-row-${c.id}`}>
                  <TableCell>
                    <Data
                      as="div"
                      className="text-xs font-bold text-text-primary whitespace-nowrap"
                    >
                      {c.callOffNumber}
                    </Data>
                    <Data as="div" className="text-[11px] text-text-secondary whitespace-nowrap">
                      {c.poNumber}
                    </Data>
                  </TableCell>
                  <TableCell>
                    <Data as="div" className="text-[11px] text-text-tertiary whitespace-nowrap">
                      {c.materialCode}
                    </Data>
                    <div className="text-xs text-text-primary">{c.description}</div>
                    <MaterialMatchReason match={match} testId={`supplier-calloff-match-${c.id}`} />
                    <div className="mt-1">
                      <PicCell value={c.mrpController} testId={`supplier-calloff-pic-${c.id}`} />
                    </div>
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    <Data>{`${qty(c.quantity)} ${c.uom}`}</Data>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <Data as="div" className="text-xs">
                      {formatDate(c.needDate)}
                    </Data>
                    <div className="text-[11px] text-text-secondary">{t(`co.type.${c.type}`)}</div>
                  </TableCell>
                  <TableCell>
                    <ConfirmationPill status={v.confirmation} />
                    {needsAnswer && v.deadline && (
                      <div
                        className="mt-1 text-[11px] text-text-secondary"
                        data-testid={`supplier-calloff-confirm-by-${c.id}`}
                      >
                        {t('co.col.confirmBy')}{' '}
                        <Data className="whitespace-nowrap">
                          {formatDateTime(v.deadline.toISOString())}
                        </Data>
                      </div>
                    )}
                    {/* CR-05 — the rule that decided this confirmation, on the row
                        the supplier is reading, not only inside the panel. */}
                    {v.tolerance && c.confirmation && (
                      <ToleranceTags
                        check={v.tolerance}
                        uom={c.uom}
                        approval={c.confirmation.approval}
                        testId={`supplier-calloff-tol-${c.id}`}
                      />
                    )}
                  </TableCell>
                  <TableCell>
                    <DeliveryPill status={v.delivery} />
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    <Button
                      variant={needsAnswer ? 'outline' : 'secondary'}
                      onClick={() => open(c.id)}
                      aria-label={`${t(needsAnswer ? 'co.action.respond' : 'co.action.open')} ${c.callOffNumber}`}
                    >
                      {t(needsAnswer ? 'co.action.respond' : 'co.action.open')}
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </tbody>
        </Table>
      </div>

      <SidePanel
        open={selected !== null}
        onClose={() => setSelectedId(null)}
        title={selected ? t('co.panel.title', { number: selected.callOff.callOffNumber }) : ''}
      >
        {selected && (
          <div className="space-y-6">
            <dl className="grid grid-cols-[150px_1fr] gap-y-2 text-sm">
              <dt className="text-text-tertiary">{t('co.col.po')}</dt>
              <dd>
                <Data>{selected.callOff.poNumber}</Data>
              </dd>
              <dt className="text-text-tertiary">{t('co.col.material')}</dt>
              <dd>
                <Data className="text-text-tertiary">{selected.callOff.materialCode}</Data>{' '}
                {selected.callOff.description}
              </dd>
              <dt className="text-text-tertiary">{t('co.col.quantity')}</dt>
              <dd>
                <Data>{`${qty(selected.callOff.quantity)} ${selected.callOff.uom}`}</Data>
              </dd>
              <dt className="text-text-tertiary">{t('co.col.needDate')}</dt>
              <dd>
                <Data>{formatDate(selected.callOff.needDate)}</Data>
              </dd>
              <dt className="text-text-tertiary">{t('co.col.type')}</dt>
              <dd>{t(`co.type.${selected.callOff.type}`)}</dd>
              <dt className="text-text-tertiary">{t('co.col.confirmation')}</dt>
              <dd>
                <ConfirmationPill status={selected.confirmation} />
              </dd>
              <dt className="text-text-tertiary">{t('co.col.delivery')}</dt>
              <dd>
                <DeliveryPill status={selected.delivery} />
              </dd>
            </dl>

            {selected.callOff.confirmation && (
              <section>
                <h3 className="text-label text-text-tertiary uppercase mb-2">
                  {t('co.panel.confirmation')}
                </h3>
                <ul className="text-sm space-y-1">
                  {selected.callOff.confirmation.deliveries.map((d, i) => (
                    // eslint-disable-next-line react/no-array-index-key -- read-only snapshot of a confirmed schedule, rendered in stored order; deliveries carry no id and may share qty+date
                    <li key={i}>
                      <Data>{`${qty(d.quantity)} ${selected.callOff.uom}`}</Data> ·{' '}
                      <Data>{formatDate(d.date)}</Data>
                    </li>
                  ))}
                </ul>
                <p className="mt-1 text-xs text-text-tertiary">
                  {t(`co.approval.${selected.callOff.confirmation.approval}`)}
                </p>
                {/* CR-05 — which rule applied to this answer, and why. */}
                {selected.tolerance && (
                  <div className="mt-2">
                    <ToleranceFindings
                      check={selected.tolerance}
                      uom={selected.callOff.uom}
                      needDate={selected.callOff.needDate}
                      testId="supplier-calloff-tolerance-applied"
                    />
                  </div>
                )}
              </section>
            )}

            {/* slice(-1) leaves at most one note; its timestamp `at` is its identity. */}
            {selected.callOff.notes
              .filter((n) => n.action === 'returned' || n.action === 'change')
              .slice(-1)
              .map((n) => (
                <section key={n.at}>
                  <h3 className="text-label text-text-tertiary uppercase mb-2">
                    {t('co.sup.fromPti')}
                  </h3>
                  <p className="text-sm text-text-primary">{n.text}</p>
                </section>
              ))}

            {selected.callOff.rejectionReason && (
              <section>
                <h3 className="text-label text-text-tertiary uppercase mb-2">
                  {t('co.panel.rejection')}
                </h3>
                <p className="text-sm text-text-primary">{selected.callOff.rejectionReason}</p>
              </section>
            )}

            {/* DRC-5 (BL-191) — delays PTI proposed for an LTP drop, and the answers. */}
            <CallOffDelays callOff={selected.callOff} testId="supplier-calloff-delays" />

            {selected.callOff.status === 'Awaiting Confirmation' && (
              <section className="space-y-3" data-testid="supplier-calloff-respond">
                <h3 className="text-label text-text-tertiary uppercase">{t('co.respond.title')}</h3>
                {confirmAvailability.kind === 'held' && pendingDelay(selected.callOff) ? (
                  <DelayAnswerForm
                    view={selected}
                    comment={form.comment}
                    setComment={(comment) => setForm({ ...form, comment })}
                    busy={command.isPending}
                    onAnswer={(delayAnswer) =>
                      void run(
                        {
                          verb: 'confirm',
                          id: selected.callOff.id,
                          delayAnswer,
                          comment: form.comment.trim() || undefined
                        },
                        t(
                          delayAnswer === 'approve'
                            ? 'co.toast.delayApproved'
                            : 'co.toast.delayRejected',
                          { number: selected.callOff.callOffNumber }
                        )
                      )
                    }
                  />
                ) : confirmAvailability.kind === 'held' ? (
                  <RespondForm
                    view={selected}
                    form={form}
                    setForm={setForm}
                    busy={command.isPending}
                    check={(() => {
                      const p = proposal(selected);
                      return p ? checkTolerance(selected.callOff, p.deliveries) : null;
                    })()}
                    onSend={() => sendAnswer(selected)}
                  />
                ) : (
                  <HandoffNotice
                    availability={confirmAvailability}
                    testId="handoff-calloff-confirm"
                  />
                )}
              </section>
            )}

            {selected.confirmation === 'Awaiting Approval' && (
              <p
                className="text-sm text-text-secondary"
                data-testid="supplier-calloff-awaiting-approval"
              >
                {t('co.sup.awaitingApproval')}
              </p>
            )}

            {isConfirmedAndAccepted(selected.callOff) && (
              <section className="space-y-3" data-testid="supplier-calloff-dispatch">
                <h3 className="text-label text-text-tertiary uppercase">
                  {t('co.dispatch.title')}
                </h3>
                {selected.headsUps.length > 0 && (
                  <ul className="text-sm space-y-1">
                    {selected.headsUps.map((h) => (
                      <li key={h.ref}>
                        <Data>{`${qty(h.quantity)} ${selected.callOff.uom}`}</Data> ·{' '}
                        {t('co.headsUp.line', {
                          shipped: formatDate(h.shippedDate),
                          arrival: formatDate(h.expectedArrival)
                        })}
                        {h.source === 'asn' && (
                          <>
                            {' '}
                            · <Data>{h.ref}</Data>
                          </>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
                <p className="text-xs text-text-tertiary">{t('co.dispatch.asnCounts')}</p>
                {dispatchAvailability.kind === 'held' ? (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label htmlFor="co-dispatch-shipped" className={labelClass}>
                          {t('co.dispatch.shippedDate')}
                        </label>
                        <input
                          id="co-dispatch-shipped"
                          type="date"
                          className={inputClass}
                          value={form.shippedDate}
                          onChange={(e) => setForm({ ...form, shippedDate: e.target.value })}
                        />
                      </div>
                      <div>
                        <label htmlFor="co-dispatch-arrival" className={labelClass}>
                          {t('co.dispatch.expectedArrival')}
                        </label>
                        <input
                          id="co-dispatch-arrival"
                          type="date"
                          className={inputClass}
                          value={form.expectedArrival}
                          onChange={(e) => setForm({ ...form, expectedArrival: e.target.value })}
                        />
                      </div>
                      <div>
                        <label htmlFor="co-dispatch-qty" className={labelClass}>
                          {t('co.field.quantity', { uom: selected.callOff.uom })}
                        </label>
                        <input
                          id="co-dispatch-qty"
                          inputMode="numeric"
                          className={inputClass}
                          value={form.dispatchQty}
                          onChange={(e) => setForm({ ...form, dispatchQty: e.target.value })}
                        />
                      </div>
                      <div>
                        <label htmlFor="co-dispatch-asn" className={labelClass}>
                          {t('co.dispatch.asn')}
                        </label>
                        <select
                          id="co-dispatch-asn"
                          className={inputClass}
                          value={form.asnNumber}
                          onChange={(e) => setForm({ ...form, asnNumber: e.target.value })}
                        >
                          <option value="">{t('co.dispatch.noAsn')}</option>
                          {asns
                            .filter(
                              (a) =>
                                a.poReference === selected.callOff.poNumber &&
                                a.status !== 'Cancelled'
                            )
                            .map((a) => (
                              <option key={a.asnNumber} value={a.asnNumber}>
                                {a.asnNumber}
                              </option>
                            ))}
                        </select>
                      </div>
                    </div>
                    {form.expectedArrival !== '' && form.expectedArrival > selected.dueDate && (
                      <p role="alert" className="text-xs text-warning-hover">
                        {t('co.dispatch.lateWarning')}
                      </p>
                    )}
                    <div className="flex justify-end">
                      <Button
                        variant="outline"
                        disabled={
                          command.isPending ||
                          form.shippedDate === '' ||
                          form.expectedArrival === '' ||
                          !(numberOf(form.dispatchQty) > 0)
                        }
                        onClick={() =>
                          void run(
                            {
                              verb: 'dispatch',
                              id: selected.callOff.id,
                              shippedDate: form.shippedDate,
                              expectedArrival: form.expectedArrival,
                              quantity: numberOf(form.dispatchQty),
                              ...(form.asnNumber ? { asnNumber: form.asnNumber } : {})
                            },
                            t('co.toast.dispatched', { number: selected.callOff.callOffNumber })
                          )
                        }
                      >
                        {t('co.dispatch.send')}
                      </Button>
                    </div>
                  </>
                ) : (
                  <HandoffNotice
                    availability={dispatchAvailability}
                    testId="handoff-calloff-dispatch"
                  />
                )}
              </section>
            )}
          </div>
        )}
      </SidePanel>
    </AppShellV2>
  );
};

/**
 * DRC-5 (BL-191) — the answer to a delay PTI proposed because the LTP dropped:
 * approve (the need date moves) or reject (the call-off stays on its date).
 * Both are the confirm verb with `delayAnswer`, so the call-off is confirmed
 * either way.
 * @type {React.FC<{ view: CallOffView; comment: string; setComment: (c: string) => void; busy: boolean; onAnswer: (a: 'approve' | 'reject') => void }>}
 */
const DelayAnswerForm = ({ view, comment, setComment, busy, onAnswer }) => {
  const { t } = useTranslation();
  const d = pendingDelay(view.callOff);
  if (!d) return null;
  const from = formatDate(d.fromNeedDate);
  return (
    <div className="space-y-3" data-testid="supplier-calloff-delay-answer">
      <p className="text-sm text-text-primary">
        {t('co.delay.sup.intro', { from, to: formatDate(d.toNeedDate) })}
      </p>
      {d.reason ? (
        <p className="text-sm text-text-secondary">
          <span className="text-text-tertiary">{t('co.delay.sup.reason')}: </span>“{d.reason}”
        </p>
      ) : null}
      <div>
        <label htmlFor="co-delay-comment" className={labelClass}>
          {t('co.respond.comment')}
        </label>
        <textarea
          id="co-delay-comment"
          rows={2}
          className={inputClass}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
      </div>
      <div className="flex flex-wrap justify-end gap-2">
        <Button
          variant="secondary"
          disabled={busy}
          onClick={() => onAnswer('reject')}
          data-testid="supplier-calloff-delay-reject"
        >
          {t('co.delay.sup.reject', { from })}
        </Button>
        <Button
          variant="outline"
          disabled={busy}
          onClick={() => onAnswer('approve')}
          data-testid="supplier-calloff-delay-approve"
        >
          {t('co.delay.sup.approve')}
        </Button>
      </div>
    </div>
  );
};

/**
 * `check`:  The tolerance rule read on the answer being typed — null while it is not yet readable.
 * @type {React.FC<{ view: CallOffView; form: typeof EMPTY; setForm: (f: typeof EMPTY) => void; busy: boolean; check: ToleranceCheck | null; onSend: () => void; }>}
 */
const RespondForm = ({ view, form, setForm, busy, check, onSend }) => {
  const { t } = useTranslation();
  const c = view.callOff;
  /** @param {Partial<typeof EMPTY>} patch */
  const set = (patch) => setForm({ ...form, ...patch });
  const ready = form.answer === 'reject' ? form.reason.trim() !== '' : check !== null;
  /**
   * @param {string} id
   * @param {string} label
   * @param {string} value
   * @param {keyof typeof EMPTY} key
   * @param {'date' | 'qty'} type
   */
  const field = (id, label, value, key, type) => (
    <div>
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      <input
        id={id}
        type={type === 'date' ? 'date' : 'text'}
        inputMode={type === 'qty' ? 'numeric' : undefined}
        className={inputClass}
        value={value}
        onChange={(e) => set(/** @type {Partial<typeof EMPTY>} */ ({ [key]: e.target.value }))}
      />
    </div>
  );

  return (
    <div className="space-y-3">
      <fieldset>
        <legend className={labelClass}>{t('co.respond.answer')}</legend>
        <div className="space-y-1">
          {ANSWERS.map((a) => (
            <label key={a} className="flex items-center gap-2 text-sm text-text-primary">
              <input
                type="radio"
                name="co-answer"
                value={a}
                checked={form.answer === a}
                onChange={() => set({ answer: a })}
              />
              {t(`co.respond.option.${a}`)}
            </label>
          ))}
        </div>
      </fieldset>

      {form.answer === 'newDate' &&
        field('co-new-date', t('co.respond.newDate'), form.date, 'date', 'date')}
      {form.answer === 'changes' && (
        <div className="grid grid-cols-2 gap-3">
          {field(
            'co-changes-qty',
            t('co.field.quantity', { uom: c.uom }),
            form.quantity,
            'quantity',
            'qty'
          )}
          {field('co-changes-date', t('co.respond.dateOptional'), form.date, 'date', 'date')}
        </div>
      )}
      {form.answer === 'partial' && (
        <div className="grid grid-cols-2 gap-3">
          {field('co-part1-qty', t('co.respond.deliveryQty', { n: 1 }), form.qty1, 'qty1', 'qty')}
          {field(
            'co-part1-date',
            t('co.respond.deliveryDate', { n: 1 }),
            form.date1,
            'date1',
            'date'
          )}
          {field('co-part2-qty', t('co.respond.deliveryQty', { n: 2 }), form.qty2, 'qty2', 'qty')}
          {field(
            'co-part2-date',
            t('co.respond.deliveryDate', { n: 2 }),
            form.date2,
            'date2',
            'date'
          )}
        </div>
      )}

      {form.answer === 'reject' ? (
        <div>
          <label htmlFor="co-reject-reason" className={labelClass}>
            {t('co.field.reason')}
          </label>
          <textarea
            id="co-reject-reason"
            rows={2}
            className={inputClass}
            value={form.reason}
            onChange={(e) => set({ reason: e.target.value })}
          />
        </div>
      ) : (
        <div>
          <label htmlFor="co-answer-comment" className={labelClass}>
            {t('co.respond.comment')}
          </label>
          <textarea
            id="co-answer-comment"
            rows={2}
            className={inputClass}
            value={form.comment}
            onChange={(e) => set({ comment: e.target.value })}
          />
        </div>
      )}

      {/* CR-05 — before the answer is sent: the rule that will apply to it, its
          reason, and what follows. The verb re-applies the same rule. */}
      {form.answer !== 'reject' && check !== null && (
        <div className="space-y-1">
          <p
            className={`text-xs ${check.within ? 'text-success' : 'text-warning-hover'}`}
            data-testid="supplier-calloff-tolerance"
          >
            {t(check.within ? 'co.respond.within' : 'co.respond.outside')}
          </p>
          <ToleranceFindings
            check={check}
            uom={c.uom}
            needDate={c.needDate}
            testId="supplier-calloff-tolerance-rule"
          />
        </div>
      )}

      <div className="flex justify-end">
        <Button variant="outline" disabled={busy || !ready} onClick={onSend}>
          {t(form.answer === 'reject' ? 'co.respond.sendReject' : 'co.respond.send')}
        </Button>
      </div>
    </div>
  );
};

export default SupplierCallOffs;
