import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
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
import { groupAlertsBySupplier } from '../services/transitions/inventoryAlertRules';
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
// time, or the CR-02 fallback bands where none is on record — sorted High first. One condition is one open alert
// (BR-05, AC-03). Alerts from one supplier on many materials sit under one
// parent row (edge case). The planner opens the affected page directly and
// closes an alert with an action note. Alerts are delivered in the hub; email
// delivery is outside the prototype.
// ─────────────────────────────────────────────────────────────────────────────

type StatusTab = 'open' | 'closed';
type RiskFilter = 'all' | RiskClass;

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
  const [tab, setTab] = useState<StatusTab>('open');
  const [risk, setRisk] = useState<RiskFilter>('all');
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [closing, setClosing] = useState<InventoryAlert | null>(null);
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
  const shown = ofTab.filter((a) => (risk === 'all' || a.riskClass === risk) && pic.matches(a.mrpController));
  const groups = groupAlertsBySupplier(shown);
  const openCount = (r: RiskClass) => alerts.filter((a) => a.status === 'open' && a.riskClass === r).length;

  const submitClose = async () => {
    if (!closing) return;
    const res = await run({ verb: 'closeAlert', key: closing.key, actionNote: note }, t('inv.alerts.toast.closed'));
    if (res.ok) {
      setClosing(null);
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
          refs={ofTab.map((a) => a.mrpController)}
          persona="buyer"
          filter={pic.filter}
          setFilter={pic.setFilter}
          myCode={pic.myCode}
        />
      </div>

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
                            <div className="text-xs text-text-secondary mt-1">
                              {t('inv.alerts.closedAt')} <Data>{formatDateTime(a.closedAt ?? '')}</Data> — {a.actionNote}
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
            <Button variant="outline" disabled={pending || note.trim() === ''} onClick={() => void submitClose()} data-testid="alert-close-submit">
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
              <label htmlFor="alert-action-note" className={labelClass}>
                {t('inv.alerts.actionNote')}
              </label>
              <textarea
                id="alert-action-note"
                rows={4}
                className={inputClass}
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
          </div>
        )}
      </SidePanel>
    </AppShellV2>
  );
};

export default BuyerAlerts;
