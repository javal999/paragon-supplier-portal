/** @import React from 'react' */
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router-dom';
import AppShellV2 from '@components/layout-v2/AppShellV2';
import PageHeader from '@components/ui-v2/PageHeader';
import PageMetaLine from '@components/ui-v2/PageMetaLine';
import SampleDataBadge from '@components/ui-v2/SampleDataBadge';
import Data from '@components/ui-v2/Data';
import StatusPill from '@components/ui-v2/StatusPill';
import LoadingState from '@components/ui-v2/LoadingState';
import ErrorState from '@components/ui-v2/ErrorState';
import { useCurrentIdentity } from '@context/CurrentIdentityContext';
import { formatDate, formatNumber } from '@lib/format';
import {
  useASNs,
  useCallOffs,
  useCapacityDecisions,
  useDemandAnticipationHistory,
  useForecastCommitments,
  usePurchaseOrders
} from '@services/query/hooks';
import { buildPlanExecutionTrace } from '@services/transitions/planExecutionTrace';
/** @import { TraceCallOff, TraceFlag, TracePo } from '@services/transitions/planExecutionTrace' */
import { inputClass, inventoryNow, labelClass } from './inventory/inventoryDisplay';
import { weekLabel } from './BuyerDemandAnticipation/display';

// ─────────────────────────────────────────────────────────────────────────────
// PLAN VS EXECUTION TRACE — PEX-11 (BL-276). One supplier × material: DA per
// week, then its POs, each PO's call-offs, each call-off's ASNs, with the flags
// of BR-02 (call-off without PO, call-off after its PO is used up, two open POs
// at once) and the BR-03 events (rejections, capacity decisions, demand moved)
// on the week they hit. Read only: every figure comes from the reads the other
// pages use; the rules are `planExecutionTrace`. A PO flowing back into DA
// (BR-04) is Hold, waiting on the SAP identifiers.
// ─────────────────────────────────────────────────────────────────────────────

/** @param {TraceFlag} f @param {import('i18next').TFunction} t */
const flagText = (f, t) =>
  t(`pex.trace.flag.${f.kind}`, {
    callOff: f.callOffNumber ?? '',
    po: f.poNumber ?? '',
    other: f.otherPoNumber ?? ''
  });

/** @type {React.FC<{ item: TraceCallOff }>} */
const CallOffRow = ({ item }) => {
  const { t } = useTranslation();
  const c = item.callOff;
  return (
    <li
      className="py-2 border-t border-border-subtle"
      data-testid={`trace-calloff-${c.callOffNumber}`}
    >
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="font-medium text-text-primary">
          {t('pex.trace.callOff')} <Data>{c.callOffNumber}</Data>
        </span>
        <span className="text-sm text-text-secondary">
          <Data>{formatNumber(c.quantity)}</Data> {c.uom} · {t('pex.trace.need')}{' '}
          <Data>{formatDate(c.needDate)}</Data>
        </span>
        <StatusPill variant={c.status === 'Rejected' ? 'danger' : 'neutral'}>{c.status}</StatusPill>
      </div>
      {item.flags.length > 0 ? (
        <ul className="mt-1 space-y-1" data-testid={`trace-flags-${c.callOffNumber}`}>
          {item.flags.map((f) => (
            <li key={f.kind} className="text-sm text-danger">
              {flagText(f, t)}
            </li>
          ))}
        </ul>
      ) : null}
      <AsnList asns={item.asns} />
    </li>
  );
};

/** @type {React.FC<{ asns: readonly import('@services/data/types').ASN[] }>} */
const AsnList = ({ asns }) => {
  const { t } = useTranslation();
  return asns.length === 0 ? (
    <p className="ml-4 mt-1 text-xs text-text-tertiary">{t('pex.trace.noAsn')}</p>
  ) : (
    <ul className="ml-4 mt-1 space-y-1">
      {asns.map((a) => (
        <li
          key={a.asnNumber}
          className="text-sm text-text-secondary"
          data-testid={`trace-asn-${a.asnNumber}`}
        >
          {t('pex.trace.asn')} <Data>{a.asnNumber}</Data> · {t('pex.trace.eta')}{' '}
          <Data>{formatDate(a.eta)}</Data> · {a.status}
        </li>
      ))}
    </ul>
  );
};

/** @type {React.FC<{ item: TracePo }>} */
const PoCard = ({ item }) => {
  const { t } = useTranslation();
  const { po } = item;
  return (
    <section
      className="bg-bg-surface border border-border-subtle rounded-lg p-4 mb-3"
      data-testid={`trace-po-${po.poNumber}`}
    >
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h3 className="text-sm font-semibold text-text-primary">
          {t('pex.trace.po')} <Data>{po.poNumber}</Data>
        </h3>
        <StatusPill variant="neutral">{po.status}</StatusPill>
        <span className="text-sm text-text-secondary">
          <Data>{formatDate(po.orderDate)}</Data> →{' '}
          <Data>{formatDate(po.confirmedDeliveryDate || po.requestedDeliveryDate)}</Data>
        </span>
        <span className="text-sm text-text-secondary" data-testid={`trace-po-used-${po.poNumber}`}>
          {t('pex.trace.calledOff', {
            called: formatNumber(item.calledOff),
            ordered: formatNumber(item.lineQty)
          })}
        </span>
      </div>
      {item.flags.length > 0 ? (
        <ul className="mt-1 space-y-1" data-testid={`trace-flags-${po.poNumber}`}>
          {item.flags.map((f) => (
            <li key={`${f.poNumber}-${f.otherPoNumber}`} className="text-sm text-danger">
              {flagText(f, t)}
            </li>
          ))}
        </ul>
      ) : null}
      {item.callOffs.length === 0 ? (
        <p className="mt-2 text-sm text-text-tertiary">{t('pex.trace.noCallOffs')}</p>
      ) : (
        <ul className="mt-2">
          {item.callOffs.map((c) => (
            <CallOffRow key={c.callOff.id} item={c} />
          ))}
        </ul>
      )}
      {item.poLevelAsns.length > 0 ? (
        <div className="mt-2">
          <p className="text-xs text-text-tertiary uppercase">{t('pex.trace.poLevelAsns')}</p>
          <AsnList asns={item.poLevelAsns} />
        </div>
      ) : null}
    </section>
  );
};

/** @type {React.FC} */
const BuyerPlanTrace = () => {
  const { t } = useTranslation();
  const { identity } = useCurrentIdentity();
  const [params, setParams] = useSearchParams();
  const nowIso = inventoryNow();
  const crumb = [t('hub.nav.section.review'), t('hub.nav.pti.planTrace')];
  const pos = usePurchaseOrders();
  const callOffs = useCallOffs();
  const asns = useASNs();
  const da = useDemandAnticipationHistory();
  const decisions = useCapacityDecisions();
  const lines = useForecastCommitments();
  const queries = [pos, callOffs, asns, da, decisions, lines];
  const pending = queries.some((q) => q.isPending);
  const failed = queries.find((q) => q.isError);

  const poRows = useMemo(() => pos.data?.items ?? [], [pos.data]);
  const callOffRows = useMemo(() => callOffs.data?.items ?? [], [callOffs.data]);
  const pairs = useMemo(() => {
    /** @type {Map<string, { supplierId: string; supplierName: string; materialCode: string }>} */
    const m = new Map();
    for (const p of poRows)
      for (const l of p.lineItems)
        m.set(`${p.supplierId}|${l.materialCode}`, {
          supplierId: p.supplierId,
          supplierName: p.supplierName,
          materialCode: l.materialCode
        });
    for (const c of callOffRows)
      m.set(`${c.supplierId}|${c.materialCode}`, {
        supplierId: c.supplierId,
        supplierName: c.supplierName,
        materialCode: c.materialCode
      });
    return [...m.values()].sort(
      (a, b) =>
        a.supplierName.localeCompare(b.supplierName) || a.materialCode.localeCompare(b.materialCode)
    );
  }, [poRows, callOffRows]);

  const picked = pairs.find(
    (p) => p.supplierId === params.get('supplier') && p.materialCode === params.get('material')
  );
  const pair = picked ?? pairs[0] ?? null;
  const trace = useMemo(
    () =>
      pair
        ? buildPlanExecutionTrace({
            supplierId: pair.supplierId,
            materialCode: pair.materialCode,
            daRows: da.data?.items ?? [],
            purchaseOrders: poRows,
            callOffs: callOffRows,
            asns: asns.data?.items ?? [],
            capacityDecisions: decisions.data?.items ?? [],
            commitmentLines: lines.data?.items ?? []
          })
        : null,
    [pair, da.data, poRows, callOffRows, asns.data, decisions.data, lines.data]
  );

  if (identity.personaType !== 'buyer')
    return (
      <AppShellV2>
        <PageHeader breadcrumb={crumb} title={t('hub.nav.pti.planTrace')} />
        <p className="text-sm text-text-tertiary" data-testid="trace-supplier">
          {t('pex.trace.supplierOnly')}
        </p>
      </AppShellV2>
    );
  if (pending) return <LoadingState breadcrumb={crumb} />;
  if (failed)
    return <ErrorState breadcrumb={crumb} error={failed.error} onRetry={() => failed.refetch()} />;

  return (
    <AppShellV2>
      <PageHeader
        breadcrumb={crumb}
        title={t('hub.nav.pti.planTrace')}
        subtitle={t('pex.trace.subtitle')}
      />
      <PageMetaLine className="-mt-6 mb-4">
        {t('pex.trace.asOf')} <Data>{formatDate(nowIso)}</Data>
        <SampleDataBadge className="ml-3 align-middle" />
      </PageMetaLine>
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 mb-4 text-sm">
        <Link to="/buyer/demand-anticipation-history" className="text-action-hover hover:underline">
          {t('pex.trace.daHistory')}
        </Link>
        <span className="text-xs text-text-tertiary" data-testid="trace-hold">
          {t('pex.trace.hold')}
        </span>
      </div>
      {!pair || !trace ? (
        <p className="text-sm text-text-tertiary" data-testid="trace-empty">
          {t('pex.trace.empty')}
        </p>
      ) : (
        <>
          <div className="max-w-md mb-4">
            <label htmlFor="trace-pair" className={labelClass}>
              {t('pex.trace.pair')}
            </label>
            <select
              id="trace-pair"
              data-testid="trace-pair"
              className={inputClass}
              value={`${pair.supplierId}|${pair.materialCode}`}
              onChange={(e) => {
                const [supplier, material] = e.target.value.split('|');
                setParams({ supplier, material }, { replace: true });
              }}
            >
              {pairs.map((p) => (
                <option
                  key={`${p.supplierId}|${p.materialCode}`}
                  value={`${p.supplierId}|${p.materialCode}`}
                >
                  {p.supplierName} · {p.materialCode}
                </option>
              ))}
            </select>
          </div>

          <div
            className="bg-bg-surface border border-border-subtle rounded-lg p-4 mb-4"
            data-testid="trace-summary"
          >
            <h2 className="text-sm font-semibold text-text-primary mb-1">{t('pex.trace.flags')}</h2>
            {trace.flags.length === 0 ? (
              <p className="text-sm text-text-tertiary" data-testid="trace-no-flags">
                {t('pex.trace.noFlags')}
              </p>
            ) : (
              <ul className="space-y-1" data-testid="trace-flag-list">
                {trace.flags.map((f) => (
                  <li
                    key={`${f.kind}-${f.callOffNumber ?? ''}-${f.poNumber ?? ''}-${f.otherPoNumber ?? ''}`}
                    className="text-sm text-danger"
                  >
                    {flagText(f, t)}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <h2 className="text-sm font-semibold text-text-primary mb-2">{t('pex.trace.weeks')}</h2>
          {trace.weeks.length === 0 ? (
            <p className="text-sm text-text-tertiary mb-4" data-testid="trace-no-da">
              {t('pex.trace.noDa')}
            </p>
          ) : (
            <div className="overflow-x-auto border border-border-subtle rounded-lg mb-4">
              <table className="w-full text-sm" data-testid="trace-weeks">
                <thead>
                  <tr className="text-label text-text-tertiary uppercase bg-bg-hover">
                    <th className="text-left px-4 py-2">{t('pex.trace.col.week')}</th>
                    <th className="text-right px-4 py-2">{t('pex.trace.col.da')}</th>
                    <th className="text-left px-4 py-2">{t('pex.trace.col.version')}</th>
                    <th className="text-left px-4 py-2">{t('pex.trace.col.events')}</th>
                    <th className="text-left px-4 py-2">{t('pex.trace.col.poLines')}</th>
                  </tr>
                </thead>
                <tbody>
                  {trace.weeks.map((w) => (
                    <tr
                      key={w.week}
                      className="border-t border-border-subtle align-top"
                      data-testid={`trace-week-${w.week}`}
                    >
                      <td className="px-4 py-2">
                        <Data>{weekLabel(w.week)}</Data>{' '}
                        <span className="text-xs text-text-tertiary">{formatDate(w.week)}</span>
                      </td>
                      <td className="px-4 py-2 text-right">
                        {w.da === null ? '—' : <Data>{formatNumber(w.da)}</Data>}
                      </td>
                      <td className="px-4 py-2">
                        {w.publicationId ? <Data>{w.publicationId}</Data> : '—'}
                      </td>
                      <td className="px-4 py-2">
                        {w.events.length === 0 ? (
                          <span className="text-text-tertiary">—</span>
                        ) : (
                          <ul className="space-y-1">
                            {w.events.map((e) => (
                              <li
                                key={`${e.kind}-${e.ref}`}
                                data-testid={`trace-event-${w.week}-${e.kind}`}
                              >
                                {t(`pex.trace.event.${e.kind}`, {
                                  ref: e.ref,
                                  detail: e.detail ?? ''
                                })}
                              </li>
                            ))}
                          </ul>
                        )}
                      </td>
                      <td className="px-4 py-2" data-testid={`trace-polines-${w.week}`}>
                        {w.poLines.length === 0 ? (
                          <span className="text-text-tertiary">—</span>
                        ) : (
                          <ul className="space-y-1">
                            {w.poLines.map((l) => (
                              <li key={l.key} data-testid={`trace-poline-${l.key}`}>
                                <Data>{l.key}</Data> · <Data>{formatNumber(l.quantity)}</Data>{' '}
                                {l.uom}
                              </li>
                            ))}
                          </ul>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <h2 className="text-sm font-semibold text-text-primary mb-2">{t('pex.trace.pos')}</h2>
          {trace.pos.length === 0 ? (
            <p className="text-sm text-text-tertiary mb-3" data-testid="trace-no-po">
              {t('pex.trace.noPos')}
            </p>
          ) : (
            trace.pos.map((p) => <PoCard key={p.po.id} item={p} />)
          )}
          {trace.noPoCallOffs.length > 0 ? (
            <section
              className="bg-bg-surface border border-danger/40 rounded-lg p-4 mb-3"
              data-testid="trace-no-po-calloffs"
            >
              <h3 className="text-sm font-semibold text-text-primary">
                {t('pex.trace.noPoCallOffs')}
              </h3>
              <ul className="mt-2">
                {trace.noPoCallOffs.map((c) => (
                  <CallOffRow key={c.callOff.id} item={c} />
                ))}
              </ul>
            </section>
          ) : null}
        </>
      )}
    </AppShellV2>
  );
};

export default BuyerPlanTrace;
