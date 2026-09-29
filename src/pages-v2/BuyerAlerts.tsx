import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router-dom';
import { ChevronDown, ChevronRight } from 'lucide-react';
import AppShellV2 from '../components/layout-v2/AppShellV2';
import PageHeader from '../components/ui-v2/PageHeader';
import PageMetaLine from '../components/ui-v2/PageMetaLine';
import SampleDataBadge from '../components/ui-v2/SampleDataBadge';
import SubTabs from '../components/ui-v2/SubTabs';
import FilterChipsBar from '../components/ui-v2/FilterChipsBar';
import Button from '../components/ui-v2/Button';
import SidePanel from '../components/ui-v2/SidePanel';
import Data from '../components/ui-v2/Data';
import LoadingState from '../components/ui-v2/LoadingState';
import ErrorState from '../components/ui-v2/ErrorState';
import { HandoffNotice } from '../components/ui-v2/HandoffNotice';
import { useVerbAvailability } from '../hooks/useVerbAvailability';
import { formatDate, formatDateTime } from '../lib/format';
import { useInventoryAlerts } from '../services/query/hooks';
import type { InventoryAlert, RiskClass } from '../services/data/types';
import {
  alertCloseRefusal,
  closeReasonCounts,
  closeReasonOf,
  groupAlertsBySupplier,
} from '../services/transitions/inventoryAlertRules';
import { NOTE_REQUIRED_CODE } from '../services/transitions/reasonCodes';
import { useActiveReasonCodes, useReasonLabel } from './admin/reasonCodeDisplay';
import {
  RiskBasisNote,
  RiskPill,
  inputClass,
  inventoryNow,
  labelClass,
  useInventoryRunner,
} from './inventory/inventoryDisplay';
import { PicCell, PicFilter, PicHeader, usePicFilter } from './materials/picDisplay';

// ─────────────────────────────────────────────────────────────────────────────
// PTI ALERTS — REQ-E08-05.
//
// Rule-based alerts derived from the inventory model and capacity (BR-01), each
// with a risk class (BR-02, CR-24) and the basis it was decided on — the lead
// time, or the CR-02 fallback bands where none is on record — sorted High
// first, then fewest days to impact (MR-9 BR-02). One condition is one open
// alert (BR-05, AC-03). Alerts from one supplier on many materials sit under
// one parent row, placed where its most urgent alert sits (edge case, AR-13).
// The planner opens the affected page directly and closes an alert with a
// reason from the `alertClose` list, and a note for "Other" (MR-9 BR-04). The
// Closed tab filters by reason (kept in the address as `?reason=`) and counts
// closures per rule per reason (BR-06). Alerts are delivered in the hub; email
// delivery is outside the prototype.
// ─────────────────────────────────────────────────────────────────────────────

type StatusTab = 'open' | 'closed';
type RiskFilter = 'all' | RiskClass;

/** MR-9 BR-06 — closures counted per rule per reason, over the closed alerts listed. */
const CloseReasonCounts: React.FC<{ alerts: readonly InventoryAlert[] }> = ({ alerts }) => {
  const { t } = useTranslation();
  const reasonLabel = useReasonLabel();
  const rows = closeReasonCounts(alerts);
  if (rows.length === 0) return null;
  return (
    <section className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm px-4 py-3 mb-4" data-testid="alert-reason-counts">
      <h2 className="text-sm font-semibold text-text-primary">{t('inv.alerts.counts.title')}</h2>
      <p className="text-xs text-text-tertiary mb-2">{t('inv.alerts.counts.scope')}</p>
      <div className="relative w-full min-w-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-label text-text-tertiary uppercase">
              <th className="text-left py-1">{t('inv.alerts.counts.rule')}</th>
              <th className="text-left py-1">{t('inv.alerts.closeReason')}</th>
              <th className="text-right py-1">{t('inv.alerts.counts.count')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={`${r.rule}|${r.reason}`} className="border-t border-border-subtle" data-testid={`alert-reason-count-${r.rule}-${r.reason}`}>
                <td className="py-2">{t(`inv.alerts.rule.${r.rule}`)}</td>
                <td className="py-2">{reasonLabel('alertClose', r.reason)}</td>
                <td className="py-2 text-right">
                  <Data>{r.count}</Data>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
};

const linkFor = (a: InventoryAlert): string =>
  a.rule === 'capacityBelowDemand'
    ? '/buyer/capacity'
    : a.rule === 'commitmentBelowForecast'
      ? `/buyer/collaboration?material=${encodeURIComponent(a.subject)}`
      : '/buyer/inventory';

const BuyerAlerts: React.FC = () => {
  const { t } = useTranslation();
  const alertsQuery = useInventoryAlerts();
  const close = useVerbAvailability('inventoryalert:close');
  const { run, pending } = useInventoryRunner();
  const reasonLabel = useReasonLabel();
  const closeReasons = useActiveReasonCodes('alertClose');
  const [params, setParams] = useSearchParams();
  const reasonFilter = params.get('reason') ?? '';
  // A reason in the address is a Closed-tab filter, so that tab opens.
  const [tab, setTab] = useState<StatusTab>(reasonFilter ? 'closed' : 'open');
  const [risk, setRisk] = useState<RiskFilter>('all');
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [closing, setClosing] = useState<InventoryAlert | null>(null);
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  // Material C4 — the PIC filter, kept in the page address (MR-5 BR-03).
  const pic = usePicFilter();
  const nowIso = inventoryNow();
  const crumb = [t('hub.nav.section.inventory'), t('inv.alerts.title')];

  const alerts = useMemo(() => alertsQuery.data?.items ?? [], [alertsQuery.data]);

  if (alertsQuery.isPending) return <LoadingState breadcrumb={crumb} />;
  if (alertsQuery.isError)
    return <ErrorState breadcrumb={crumb} error={alertsQuery.error} onRetry={() => alertsQuery.refetch()} />;

  const ofTab = alerts.filter((a) => a.status === tab);
  const closed = alerts.filter((a) => a.status === 'closed');
  const byReason = (a: InventoryAlert) => tab !== 'closed' || reasonFilter === '' || closeReasonOf(a) === reasonFilter;
  // Material C4 — the PIC filter (`?pic=`) sits beside the reason filter (`?reason=`).
  const shown = ofTab.filter(
    (a) => (risk === 'all' || a.riskClass === risk) && byReason(a) && pic.matches(a.mrpController),
  );
  const groups = groupAlertsBySupplier(shown);
  const openCount = (r: RiskClass) => alerts.filter((a) => a.status === 'open' && a.riskClass === r).length;
  // The filter offers every code offered today plus any retired code a closure
  // still carries (MR-9 AC-03).
  const reasonOptions = [...new Set([...closeReasons, ...closed.map(closeReasonOf)])];
  const setReasonFilter = (code: string) => {
    const next = new URLSearchParams(params);
    if (code) next.set('reason', code);
    else next.delete('reason');
    setParams(next, { replace: true });
  };
  // MR-9 BR-04 — the verb's own rule, as the pre-check.
  const closeRefusal = alertCloseRefusal(reason, note);

  const submitClose = async () => {
    if (!closing) return;
    const res = await run(
      { verb: 'closeAlert', key: closing.key, closeReason: reason, ...(note.trim() ? { actionNote: note } : {}) },
      t('inv.alerts.toast.closed'),
    );
    if (res.ok) {
      setClosing(null);
      setReason('');
      setNote('');
    }
  };

  return (
    <AppShellV2>
      <PageHeader breadcrumb={crumb} title={t('inv.alerts.title')} subtitle={t('inv.alerts.subtitle')} />
      <PageMetaLine className="-mt-6 mb-4">
        {t('inv.asOf')} <Data>{formatDate(nowIso)}</Data>
        <span className="ml-3 text-xs text-text-tertiary">{t('inv.alerts.channel')}</span>
        <SampleDataBadge className="ml-3 align-middle" />
      </PageMetaLine>

      {openCount('high') > 0 && (
        <div
          role="status"
          data-testid="pti-alerts-banner"
          className="bg-danger-soft border-l-2 border-danger rounded px-4 py-3 mb-4 text-sm text-danger"
        >
          {t('inv.alerts.banner', { count: openCount('high') })}
        </div>
      )}

      <SubTabs<StatusTab>
        options={[
          { id: 'open', label: t('inv.alerts.tab.open'), count: alerts.filter((a) => a.status === 'open').length },
          { id: 'closed', label: t('inv.alerts.tab.closed'), count: alerts.filter((a) => a.status === 'closed').length },
        ]}
        value={tab}
        onChange={setTab}
        className="mb-4"
      />
      <FilterChipsBar<RiskFilter>
        options={(['all', 'high', 'medium', 'low'] as RiskFilter[]).map((r) => ({
          id: r,
          label: `${r === 'all' ? t('inv.filter.all') : t(`inv.risk.${r}`)} (${
            r === 'all' ? ofTab.length : ofTab.filter((a) => a.riskClass === r).length
          })`,
        }))}
        value={risk}
        onChange={setRisk}
        className="mb-3"
      />
      <div className="mb-4">
        <PicFilter
          refs={alerts.map((a) => a.mrpController)}
          persona="buyer"
          filter={pic.filter}
          setFilter={pic.setFilter}
          myCode={pic.myCode}
        />
      </div>

      {tab === 'closed' ? (
        <>
          <div className="mb-4 max-w-xs">
            <label htmlFor="alert-reason-filter" className={labelClass}>
              {t('inv.alerts.filter.reason')}
            </label>
            <select
              id="alert-reason-filter"
              className={inputClass}
              value={reasonFilter}
              onChange={(e) => setReasonFilter(e.target.value)}
            >
              <option value="">{t('inv.alerts.filter.allReasons')}</option>
              {reasonOptions.map((code) => (
                <option key={code} value={code}>
                  {`${reasonLabel('alertClose', code)} (${closed.filter((a) => closeReasonOf(a) === code).length})`}
                </option>
              ))}
            </select>
          </div>
          <CloseReasonCounts alerts={closed} />
        </>
      ) : null}

      {groups.length === 0 ? (
        <p className="text-sm text-text-tertiary py-8 text-center" data-testid="alerts-empty">
          {t(tab === 'open' ? 'inv.alerts.emptyOpen' : 'inv.alerts.emptyClosed')}
        </p>
      ) : (
        <div className="space-y-3">
          {groups.map((g) => {
            const isCollapsed = collapsed[g.supplierId] ?? false;
            return (
              <section
                key={g.supplierId}
                className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm"
                data-testid={`alert-group-${g.supplierId}`}
              >
                <button
                  type="button"
                  className="w-full px-4 py-3 flex items-center gap-3 text-left"
                  aria-expanded={!isCollapsed}
                  onClick={() => setCollapsed({ ...collapsed, [g.supplierId]: !isCollapsed })}
                >
                  {isCollapsed ? <ChevronRight size={16} aria-hidden="true" /> : <ChevronDown size={16} aria-hidden="true" />}
                  <span className="text-sm font-semibold text-text-primary">{g.supplierName}</span>
                  <RiskPill riskClass={g.riskClass} />
                  <span className="text-xs text-text-secondary">{t('inv.alerts.count', { count: g.alerts.length })}</span>
                </button>
                {!isCollapsed && (
                  <ul className="border-t border-border-subtle divide-y divide-border-subtle">
                    {g.alerts.map((a) => (
                      <li key={a.key} className="px-4 py-3 flex flex-wrap items-center gap-3" data-testid={`alert-${a.key}`}>
                        <RiskPill riskClass={a.riskClass} />
                        <div className="min-w-0 flex-1">
                          <div className="text-sm text-text-primary">{t(`inv.alerts.rule.${a.rule}`)}</div>
                          <div className="text-xs text-text-secondary">
                            {a.rule === 'capacityBelowDemand' ? (
                              t(`inv.group.${a.subject}`)
                            ) : (
                              <>
                                <Data>{a.subject}</Data> · {a.subjectLabel}
                              </>
                            )}
                          </div>
                          <RiskBasisNote basis={a.riskBasis} testId={`alert-basis-${a.key}`} withCover />
                          {!!a.mrpController && (
                            <div className="text-xs text-text-secondary mt-1 flex flex-wrap items-center gap-2">
                              <PicHeader />
                              <PicCell value={a.mrpController} testId={`alert-pic-${a.key}`} />
                            </div>
                          )}
                          {a.status === 'closed' && (
                            <div className="text-xs text-text-secondary mt-1" data-testid={`alert-closure-${a.key}`}>
                              {t('inv.alerts.closedAt')} <Data>{formatDateTime(a.closedAt ?? '')}</Data> —{' '}
                              {reasonLabel('alertClose', closeReasonOf(a))}
                              {a.actionNote ? `: ${a.actionNote}` : ''}
                            </div>
                          )}
                        </div>
                        <Link to={linkFor(a)} className="text-sm text-action hover:underline">
                          {t(
                            a.rule === 'capacityBelowDemand'
                              ? 'inv.alerts.openCapacity'
                              : a.rule === 'commitmentBelowForecast'
                                ? 'inv.alerts.openCommitments'
                                : 'inv.alerts.openInventory',
                          )}
                        </Link>
                        {a.status === 'open' &&
                          (close.kind === 'held' ? (
                            <Button
                              variant="secondary"
                              onClick={() => {
                                setClosing(a);
                                setReason('');
                                setNote('');
                              }}
                              aria-label={t('inv.alerts.closeFor', { rule: t(`inv.alerts.rule.${a.rule}`), subject: a.subject })}
                            >
                              {t('inv.alerts.close')}
                            </Button>
                          ) : (
                            <HandoffNotice availability={close} testId="handoff-alert-close" />
                          ))}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      )}

      <SidePanel
        open={closing !== null && close.kind === 'held'}
        onClose={() => setClosing(null)}
        title={t('inv.alerts.closeTitle')}
        footerActions={
          close.kind === 'held' ? (
            <Button
              variant="outline"
              disabled={pending || closeRefusal !== null}
              onClick={() => void submitClose()}
              data-testid="alert-close-submit"
            >
              {t('inv.alerts.close')}
            </Button>
          ) : undefined
        }
      >
        {closing && (
          <div className="space-y-3">
            <p className="text-sm text-text-primary">
              {t(`inv.alerts.rule.${closing.rule}`)} · {closing.supplierName} · <Data>{closing.subject}</Data>
            </p>
            <div>
              <label htmlFor="alert-close-reason" className={labelClass}>
                {t('inv.alerts.closeReason')}
              </label>
              <select
                id="alert-close-reason"
                className={inputClass}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              >
                <option value="">{t('inv.alerts.closeReason.select')}</option>
                {closeReasons.map((code) => (
                  <option key={code} value={code}>
                    {reasonLabel('alertClose', code)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="alert-action-note" className={labelClass}>
                {t('inv.alerts.actionNote')}
              </label>
              <textarea
                id="alert-action-note"
                rows={4}
                className={inputClass}
                aria-required={reason === NOTE_REQUIRED_CODE}
                aria-describedby="alert-action-note-hint"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
              <p id="alert-action-note-hint" className="text-xs text-text-tertiary mt-1">
                {t('inv.alerts.actionNoteHint')}
              </p>
            </div>
          </div>
        )}
      </SidePanel>
    </AppShellV2>
  );
};

export default BuyerAlerts;
