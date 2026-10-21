/** @import React from 'react' */
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import AppShellV2 from '@components/layout-v2/AppShellV2';
import PageHeader from '@components/ui-v2/PageHeader';
import Tabs from '@components/ui-v2/Tabs';
import FilterChipsBar from '@components/ui-v2/FilterChipsBar';
import Data from '@components/ui-v2/Data';
import LoadingState from '@components/ui-v2/LoadingState';
import ErrorState from '@components/ui-v2/ErrorState';
import DataHealthChip from '@components/forecast/DataHealthChip';
import PurposeHeader from '@components/forecast/PurposeHeader';
import CycleSteps from '@components/forecast/CycleSteps';
import SimulatedDataBanner from '@components/forecast/SimulatedDataBanner';
import AboutThisPage, { CollapsedSection } from '@components/forecast/AboutThisPage';
import DataAsOf from '@components/forecast/DataAsOf';
import { forecastCrumb, forecastTitle } from '@components/forecast/forecastPages';
import { useVerbAvailability } from '@hooks/useVerbAvailability';
import { usePageTab } from '@hooks/usePageTab';
import { formatDate, formatNumber } from '@lib/format';
import { useOrderPlan, useReschedule } from '@services/query/hooks';
/** @import { RescheduleView } from '@services/data/types' */
import { planChangeAfter, selectionEffect } from '@services/engine/reschedule';
/** @import { WarehouseKind } from '@services/engine/types' */
import { isLive } from '@services/liveness';
import DecisionCard from './components/DecisionCard';
import DefinitionsSection from './components/DefinitionsSection';
import FillSection from './components/FillSection';
import PlanChangeGuard from './components/PlanChangeGuard';
import ProposalTable from './components/ProposalTable';
import ReliefSection from './components/ReliefSection';
import RescheduleKpis from './components/RescheduleKpis';
import SettingsSection from './components/SettingsSection';
import { useProposalActions } from './hooks/useProposalActions';
import OpenCallOffLink from '../callOffs/OpenCallOffLink';
import { weekLabel } from './utils';
/** @import { ProposalActionContext } from './components/ProposalAction' */

// ─────────────────────────────────────────────────────────────────────────────
// RESCHEDULE OPEN ORDERS — REQ-E14-13, the Material Planner's warehouse relief.
//
// Per warehouse (ENG-D7): the projected fill now, after the planner's selected
// proposals (recomputed from the baseline, AC-03) and after every relief
// proposal; the stock already on hand, and the weeks it alone overfills — which
// no open order can relieve. The relief list is ranked by net saving, valued
// together (BR-06: each freed over-capacity pallet-week is claimed once), with
// everything inside the lead time or the Firm zone last and marked "needs
// supplier agreement". Reschedule-in (shortage) is listed apart.
//
// BR-07: a call-off change goes through the EXISTING change verb
// (`t_calloff_change`, a reason required) with the engine named as its origin;
// a PO-line change is made in SAP and recorded here as "taken to SAP"
// (`t_sapchange_mark`, ENG-D16). BR-08 / X-03: while the engine dataset is not
// live both verbs refuse, and the page says so in place of the act.
// BR-09: the plan-change guard shows how PTI's share of schedules changed inside
// the lead time (E14-02) would move if the selected proposals were sent.
//
// FUX-D3 (F-10, F-22): the weeks that do not fit even with the most rented
// space (from the order plan) sit here above the proposals, each with the
// planner's saved decision (`t_warehousedecision_record`) — a record of intent
// that changes no order and is never sent to SAP or a supplier.
//
// Every figure is computed by the forecast engine at read time on its
// SYNTHETIC dataset (the `engineDataset` pill, X-03).
//
// P-12 (IA-B06) — TABS, THE DECISION FIRST. The page header, purpose line,
// step strip, simulated-data banner, data date, warehouse choice, capacity
// line and KPIs stay above the tabs; below them "Relief" (the weeks that do
// not fit, the supplier-stability guard, the ranked relief, the on-hand
// caveat, shortage and the proposals with no saving), then "Warehouse fill",
// then "Values and method" (open orders for information, values in use, how
// this is calculated, About this page). Nothing was removed; each block moved
// under a tab. The tab is `?tab=relief|fill|values`.
//
// IA-B13 — a sent call-off change links to that call-off on Call-offs: on its
// row while the row stands, in the "sent" lines at the top of Relief once the
// pending change takes the proposal off the list, and on the call-off's line
// under "Open orders for information".
//
// FOLDER MAP (frontend-standard Phase 5, PAGE-SPLIT-GUIDE): this file holds the
// page's state, selection and section order; each section is a file in
// `components/`, the two proposal acts are `hooks/useProposalActions.js`, and
// the number formatters are `utils.js`.
// ─────────────────────────────────────────────────────────────────────────────

/** P-12 — the page's tabs, in order; the first opens by default. */
export const RESCHEDULE_TABS = /** @type {const} */ (['relief', 'fill', 'values']);

/** @type {React.FC} */
const BuyerReschedule = () => {
  const { t } = useTranslation();
  const query = useReschedule();
  // FUX-D3 — the weeks that do not fit come from the order plan (BL-117).
  const orderPlan = useOrderPlan();
  const actions = useProposalActions();
  const planAvailability = useVerbAvailability('calloff:plan');
  const sapAvailability = useVerbAvailability('sapchange:mark');
  const [kind, setKind] = useState(/** @type {WarehouseKind} */ ('packaging'));
  const [selected, setSelected] = useState(/** @type {ReadonlySet<string>} */ (new Set()));
  const crumb = forecastCrumb(t, 'makeRoom');
  const { tab, select } = usePageTab(RESCHEDULE_TABS);
  /** @type {RescheduleView | null} */
  const run = query.data ?? null;
  // X-03 — the registry's own answer, read at render; each verb reads it again.
  const withheld = !isLive('engineDataset');

  const w = run?.warehouses.find((x) => x.kind === kind) ?? run?.warehouses[0] ?? null;
  const planW = orderPlan.data?.warehouses.find((x) => x.kind === (w?.kind ?? kind)) ?? null;
  const rentRate = orderPlan.data?.costs.rentIdrPerPalletWeek ?? null;
  const relief = useMemo(() => (w?.proposals ?? []).filter((p) => p.rank !== null), [w]);
  const shortage = useMemo(
    () => (w?.proposals ?? []).filter((p) => p.type === 'rescheduleIn'),
    [w]
  );
  const noSaving = useMemo(
    () => (w?.proposals ?? []).filter((p) => p.rank === null && p.type !== 'rescheduleIn'),
    [w]
  );
  const mine = useMemo(
    () => new Set([...selected].filter((id) => w?.proposals.some((p) => p.id === id))),
    [selected, w]
  );
  const effect = w && run ? selectionEffect(w, mine, run.costs) : null;
  const allProposals = useMemo(() => (run?.warehouses ?? []).flatMap((x) => x.proposals), [run]);
  const guardAfter = run ? planChangeAfter(run.planChange, allProposals, selected) : null;

  if (query.isPending) return <LoadingState breadcrumb={crumb} />;
  if (query.isError)
    return (
      <ErrorState breadcrumb={crumb} error={query.error} onRetry={() => void query.refetch()} />
    );

  /** @type {{ id: WarehouseKind; label: string }[]} */
  const kinds = (run?.warehouses ?? []).map((x) => ({
    id: x.kind,
    label: t(`rs.warehouse.${x.kind}`)
  }));
  /** @param {string} id */
  const toggle = (id) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const selectFree = () =>
    setSelected(
      (prev) =>
        new Set([...prev, ...relief.filter((p) => !p.needsSupplierAgreement).map((p) => p.id)])
    );
  const clearSelection = () => setSelected(new Set());

  /** @type {ProposalActionContext} */
  const action = {
    sent: actions.sent,
    sapMarks: run?.sapMarks ?? [],
    planAvailability,
    sapAvailability,
    withheld,
    onSend: actions.sendChange,
    onMark: actions.markSap,
    sendPending: actions.sendPending,
    markPending: actions.markPending
  };

  const onHandWeeks = w ? w.weeks.filter((wk) => wk.onHandOverPallets > 0) : [];
  const freeCount = relief.filter((p) => !p.needsSupplierAgreement).length;

  return (
    <AppShellV2>
      <PageHeader breadcrumb={crumb} title={forecastTitle(t, 'makeRoom')} />
      <PurposeHeader page="makeRoom" />
      <CycleSteps current="makeRoom" />
      <SimulatedDataBanner capability="engineDataset" />
      <DataAsOf
        date={run?.planMadeAt ?? null}
        detail={
          run?.planMadeAt ? (
            <>
              {t('rs.meta.horizon')} {t('rs.meta.weeks', { count: run.weeks.length })}
            </>
          ) : (
            t('rs.meta.noPlan')
          )
        }
      />
      <DataHealthChip step="E14-13" className="mb-3" />

      <div className="mb-4">
        <FilterChipsBar options={kinds} value={w?.kind ?? kind} onChange={setKind} />
      </div>

      {w && effect && (
        <>
          <p className="text-sm text-text-secondary mb-3" data-testid="rs-capacity">
            {t(`rs.warehouse.${w.kind}`)} · <Data>{w.warehouseId}</Data> ·{' '}
            {t('rs.warehouse.capacity')}{' '}
            <Data>{t('rs.warehouse.pallets', { value: formatNumber(w.capacityPallets) })}</Data>
          </p>

          <RescheduleKpis w={w} freeCount={freeCount} />
        </>
      )}

      <Tabs
        tabs={RESCHEDULE_TABS.map((id) => ({ id, label: t(`rs.tab.${id}`) }))}
        active={tab}
        onChange={(id) => select(/** @type {(typeof RESCHEDULE_TABS)[number]} */ (id))}
        className="mb-4"
      />

      <div role="tabpanel" aria-label={t(`rs.tab.${tab}`)} data-testid={`rs-tabpanel-${tab}`}>
        {tab === 'relief' && actions.sentCallOffs.length > 0 && (
          <ul
            role="status"
            className="bg-bg-surface border border-border-subtle rounded-lg px-4 py-3 mb-4 text-sm space-y-1"
            data-testid="rs-sent"
          >
            {actions.sentCallOffs.map((c) => (
              <li key={c.callOffId} data-testid={`rs-sent-${c.callOffId}`}>
                {t('rs.sent.line', { reference: c.reference })}{' '}
                <OpenCallOffLink
                  callOffId={c.callOffId}
                  label={t('rs.action.openCallOff')}
                  testId={`rs-sent-open-${c.callOffId}`}
                />
              </li>
            ))}
          </ul>
        )}

        {tab === 'relief' && w && effect ? (
          <>
            {planW && rentRate !== null && planW.shortfallWeeks.length > 0 && (
              <DecisionCard
                key={planW.kind}
                plan={planW}
                rate={rentRate}
                ledger={/** @type {RescheduleView} */ (run).warehouseDecisions}
                currentVersion={/** @type {RescheduleView} */ (run).planVersions[planW.kind]}
              />
            )}

            <PlanChangeGuard
              run={/** @type {RescheduleView} */ (run)}
              selectedCount={mine.size}
              effect={effect}
              guardAfter={guardAfter}
            />

            <ReliefSection
              relief={relief}
              withheld={withheld}
              freeCount={freeCount}
              onSelectFree={selectFree}
              onClear={clearSelection}
              selected={selected}
              onToggle={toggle}
              action={action}
            />

            {/* FUX A4 (F-08): the on-hand caveat sits under the proposals, not above them. */}
            {onHandWeeks.length > 0 && (
              <p className="text-sm text-text-secondary mb-4" data-testid="rs-onhand-note">
                {t('rs.onHand.note', {
                  count: onHandWeeks.length,
                  first: weekLabel(onHandWeeks[0].weekStart),
                  last: weekLabel(onHandWeeks[onHandWeeks.length - 1].weekStart)
                })}
              </p>
            )}

            {shortage.length > 0 && (
              <section
                className="bg-bg-surface border border-border-subtle rounded-lg p-4 mb-6"
                data-testid="rs-shortage"
              >
                <h2 className="text-section text-text-primary mb-1">{t('rs.shortage.title')}</h2>
                <p className="text-xs text-text-tertiary mb-3">{t('rs.shortage.intro')}</p>
                <ProposalTable
                  rows={shortage}
                  selectable
                  testPrefix="rs-shortage"
                  selected={selected}
                  onToggle={toggle}
                  action={action}
                />
              </section>
            )}

            {noSaving.length > 0 && (
              <details
                className="bg-bg-surface border border-border-subtle rounded-lg p-4 mb-6"
                data-testid="rs-nosaving"
              >
                <summary className="text-section text-text-primary cursor-pointer">
                  {t('rs.noSaving.title', { count: noSaving.length })}
                </summary>
                <p className="text-xs text-text-tertiary my-3">{t('rs.noSaving.intro')}</p>
                <ProposalTable
                  rows={noSaving}
                  selectable={false}
                  testPrefix="rs-nosaving"
                  selected={selected}
                  onToggle={toggle}
                  action={action}
                />
              </details>
            )}
          </>
        ) : null}

        {tab === 'fill' && w && effect ? <FillSection w={w} effect={effect} /> : null}

        {tab === 'values' && (
          <>
            {w && w.info.length > 0 ? (
              <CollapsedSection
                title={t('rs.info.title')}
                testId="rs-info"
                className="bg-bg-surface border border-border-subtle rounded-lg p-4 mb-6"
              >
                <p className="text-xs text-text-tertiary my-3">{t('rs.info.intro')}</p>
                <ul className="text-sm space-y-1">
                  {w.info.map((i) => (
                    <li key={i.line.id} data-testid={`rs-info-${i.line.id}`}>
                      <Data>{i.line.reference}</Data> · {i.materialLabel} ·{' '}
                      <Data>{formatDate(i.line.date)}</Data> —{' '}
                      <span className="text-text-secondary">{t(`rs.info.reason.${i.reason}`)}</span>
                      {i.line.callOffId ? (
                        <>
                          {' '}
                          <OpenCallOffLink
                            callOffId={i.line.callOffId}
                            label={t('rs.action.openCallOff')}
                            testId={`rs-info-open-${i.line.id}`}
                          />
                        </>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </CollapsedSection>
            ) : null}

            {run && <SettingsSection run={run} />}

            <DefinitionsSection run={run} />

            <AboutThisPage>
              <p>{t('rs.subtitle')}</p>
              <p data-testid="rs-synthetic-note">{t('rs.synthetic')}</p>
              {withheld && <p data-testid="rs-withheld-note">{t('rs.withheld')}</p>}
            </AboutThisPage>
          </>
        )}
      </div>
    </AppShellV2>
  );
};

export default BuyerReschedule;
