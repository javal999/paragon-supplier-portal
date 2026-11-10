/** @import React from 'react' */
/** @import { TFunction } from 'i18next' */
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router-dom';
import AppShellV2 from '@components/layout-v2/AppShellV2';
import PageHeader from '@components/ui-v2/PageHeader';
import PageMetaLine from '@components/ui-v2/PageMetaLine';
import SampleDataBadge from '@components/ui-v2/SampleDataBadge';
import Data from '@components/ui-v2/Data';
import Button from '@components/ui-v2/Button';
import StatusPill from '@components/ui-v2/StatusPill';
import WeekGrid from '@components/ui-v2/WeekGrid';
import TermLabel from '@components/ui-v2/TermLabel';
import LoadingState from '@components/ui-v2/LoadingState';
import ErrorState from '@components/ui-v2/ErrorState';
import { useCurrentIdentity } from '@context/CurrentIdentityContext';
import { formatDate, formatDateTime, formatNumber } from '@lib/format';
import { useDemandAnticipationHistory } from '@services/query/hooks';
import { DA_PROVISIONAL_QUESTIONS } from '@services/transitions/demandAnticipationRules';
/** @import { ActorAttribution } from '@lib/enforcement' */
/** @import { DaHistoryRow } from '@services/transitions/demandAnticipationHistory' */
/** @import { WeekGridRow } from '@components/ui-v2/WeekGrid' */
import {
  DA_HISTORY_CSV_COLUMNS,
  DA_HISTORY_RULES,
  daHistoryCsv,
  defaultHistoryRange,
  filterDaHistory
} from '@services/transitions/demandAnticipationHistory';
import { inputClass, inventoryNow, labelClass } from './inventory/inventoryDisplay';
import { downloadText } from './forecasts/forecastDisplay';
import { weekDates, weekLabel } from './BuyerDemandAnticipation/display';
import { causeLines } from './BuyerDemandAnticipation/components/DaCauses';
import { compareVersions } from '@services/transitions/daCauseRules';

// ─────────────────────────────────────────────────────────────────────────────
// DEMAND ANTICIPATION HISTORY — DRC-3 (BL-189), SC-HUB-DA-ROP-CALLOFF-
// REQUIREMENTS-2026-10, decision DRC-D16, [Owner A10].
//
// The audit view of every demand anticipation publication, READ ONLY: one card
// per publication × supplier × material, newest first, with who published it
// and when, whether it is still in force for its planning week or which
// publication superseded it, the figure's parts per week (LTP, safety order,
// carried in and from which week, the figure, and the figure after the plan
// check) in a WeekGrid, OSPO, the additional PO, the call-offs of the planning
// week, the remainder and where it went, the supplier's agreement to carry
// outside the horizon, the rules version it was stamped with, and (DRC-5,
// BL-191) the call-off delays the supplier approved that the figure reflects.
//
// Filters (in the page address): supplier, material, and a planning-week range
// that opens [MoM 1A] on the current week and 52 weeks back. The filtered rows
// export as CSV (the hub's comparison-export pattern: built in the browser,
// nothing sent).
//
// Who sees it [Owner A10]: Material Planning (under Review), Procurement and
// Finance (under Audit) reach it from their menus. The page is not gated on
// business role (CLAUDE.md §65); a supplier persona reads an empty page and is
// told the history is PTI's own plan.
// ─────────────────────────────────────────────────────────────────────────────

/** @param {DaHistoryRow} r */
const keyOf = (r) => `${r.publicationId}-${r.supplierId}-${r.materialCode}`;

/**
 * @param {ActorAttribution} actor
 * @param {TFunction} t
 */
const actorText = (actor, t) =>
  actor.kind === 'RESOLVED' ? actor.person.displayName : t('daHist.unattributed');

/** @type {React.FC} */
const BuyerDemandAnticipationHistory = () => {
  const { t } = useTranslation();
  const { identity } = useCurrentIdentity();
  const query = useDemandAnticipationHistory();
  const [params, setParams] = useSearchParams();
  // BL-268 (PEX-6 BR-04) — up to two versions of one supplier × material, to compare side by side.
  const [picked, setPicked] = useState(/** @type {string[]} */ ([]));
  const nowIso = inventoryNow();
  const crumb = [t('hub.nav.section.review'), t('hub.nav.pti.demandAnticipationHistory')];
  const rows = useMemo(() => query.data?.items ?? [], [query.data]);
  const range = defaultHistoryRange(nowIso);
  const supplier = params.get('supplier');
  const material = params.get('material');
  const from = params.get('from') ?? range.from;
  const to = params.get('to') ?? range.to;

  if (identity.personaType !== 'buyer')
    return (
      <AppShellV2>
        <PageHeader breadcrumb={crumb} title={t('hub.nav.pti.demandAnticipationHistory')} />
        <div
          className="bg-bg-surface border border-border-subtle rounded-lg py-10 px-6 text-center"
          data-testid="dah-supplier"
        >
          <p className="text-base font-semibold text-text-primary mb-1">
            {t('daHist.supplier.title')}
          </p>
          <p className="text-sm text-text-tertiary">{t('daHist.supplier.body')}</p>
        </div>
      </AppShellV2>
    );
  if (query.isPending) return <LoadingState breadcrumb={crumb} />;
  if (query.isError)
    return <ErrorState breadcrumb={crumb} error={query.error} onRetry={() => query.refetch()} />;

  const supplierOptions = [
    ...new Map(rows.map((r) => [r.supplierId, r.supplierName])).entries()
  ].sort((a, b) => a[1].localeCompare(b[1]));
  const materialOptions = [
    ...new Set(
      rows.filter((r) => !supplier || r.supplierId === supplier).map((r) => r.materialCode)
    )
  ].sort();
  const shown = filterDaHistory(rows, { supplierId: supplier, materialCode: material, from, to });
  const filtered = [...params.keys()].length > 0;
  // U-21 (BL-250) — the planning weeks the cards show: one week reads as such,
  // not as "W36 to W36" (the default range's two ends are a year apart).
  const shownWeeks = [...new Set(shown.map((r) => r.planningWeek))];

  /**
   * @param {'supplier' | 'material' | 'from' | 'to'} name
   * @param {string} value
   */
  const setFilter = (name, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(name, value);
    else next.delete(name);
    if (name === 'supplier') next.delete('material');
    setParams(next, { replace: true });
  };

  const exportCsv = () => {
    const csv = daHistoryCsv(
      shown,
      DA_HISTORY_CSV_COLUMNS.map((c) => t(`daHist.csv.${c}`)),
      (a) => actorText(a, t),
      (r) =>
        r.inForce
          ? t('daHist.status.inForce')
          : t('daHist.status.superseded', { id: r.supersededBy })
    );
    downloadText(`demand-anticipation-history-${nowIso.slice(0, 10)}.csv`, csv);
  };

  return (
    <AppShellV2>
      <PageHeader
        breadcrumb={crumb}
        title={t('hub.nav.pti.demandAnticipationHistory')}
        subtitle={t('daHist.subtitle')}
      />
      <PageMetaLine className="-mt-6 mb-4">
        {t('daHist.asOf')} <Data>{formatDate(nowIso)}</Data>
        <SampleDataBadge className="ml-3 align-middle" />
      </PageMetaLine>

      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 mb-4 text-sm">
        <Link
          to="/buyer/demand-anticipation"
          className="text-action-hover hover:underline"
          data-testid="dah-back"
        >
          {t('daHist.back')}
        </Link>
        {/* Design rule 5 — every stored figure is built on [Default] A1, A2, A8b, A9. */}
        <span className="text-xs text-warning-hover" data-testid="dah-provisional">
          {t('ltpFg.provisional', { question: DA_PROVISIONAL_QUESTIONS.join(', ') })}
        </span>
      </div>

      <div
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[repeat(4,minmax(0,12rem))_auto_auto] items-end gap-3 mb-2"
        data-testid="dah-filters"
      >
        <div>
          <label htmlFor="dah-filter-supplier" className={labelClass}>
            {t('daHist.filter.supplier')}
          </label>
          <select
            id="dah-filter-supplier"
            className={inputClass}
            value={supplier ?? ''}
            onChange={(e) => setFilter('supplier', e.target.value)}
          >
            <option value="">{t('daHist.filter.all')}</option>
            {supplierOptions.map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="dah-filter-material" className={labelClass}>
            {t('daHist.filter.material')}
          </label>
          <select
            id="dah-filter-material"
            className={inputClass}
            value={material ?? ''}
            onChange={(e) => setFilter('material', e.target.value)}
          >
            <option value="">{t('daHist.filter.all')}</option>
            {materialOptions.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="dah-filter-from" className={labelClass}>
            {t('daHist.filter.from')}
          </label>
          <input
            id="dah-filter-from"
            type="date"
            className={inputClass}
            value={from}
            onChange={(e) => setFilter('from', e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="dah-filter-to" className={labelClass}>
            {t('daHist.filter.to')}
          </label>
          <input
            id="dah-filter-to"
            type="date"
            className={inputClass}
            value={to}
            onChange={(e) => setFilter('to', e.target.value)}
          />
        </div>
        {filtered ? (
          <Button
            variant="secondary"
            onClick={() => setParams(new URLSearchParams(), { replace: true })}
            data-testid="dah-filters-clear"
          >
            {t('daHist.filter.clear')}
          </Button>
        ) : null}
        {/* Nothing to export when no publication matches: the button says so by being off. */}
        <Button
          variant="secondary"
          onClick={exportCsv}
          disabled={shown.length === 0}
          data-testid="dah-export"
        >
          {t('daHist.export')}
        </Button>
      </div>
      <p className="text-xs text-text-tertiary mb-4" data-testid="dah-range">
        {shownWeeks.length === 1
          ? t('daHist.filter.rangeOnly', {
              week: weekLabel(shownWeeks[0]),
              weeks: DA_HISTORY_RULES.historyWeeksBack
            })
          : t('daHist.filter.range', {
              from: weekLabel(from),
              to: weekLabel(to),
              weeks: DA_HISTORY_RULES.historyWeeksBack
            })}{' '}
        <span data-testid="dah-count">{t('daHist.count', { count: shown.length })}</span>
      </p>

      <ComparePanel rows={rows} picked={picked} onClear={() => setPicked([])} />

      <div className="space-y-3">
        {shown.map((r) => (
          <HistoryCard
            key={keyOf(r)}
            row={r}
            nowIso={nowIso}
            picked={picked.includes(keyOf(r))}
            canPick={picked.length < 2 || picked.includes(keyOf(r))}
            onPick={() =>
              setPicked((p) => {
                if (p.includes(keyOf(r))) return p.filter((k) => k !== keyOf(r));
                // Two versions compare only within one supplier × material.
                const same = p.filter((k) => {
                  const o = rows.find((x) => keyOf(x) === k);
                  return o && o.supplierId === r.supplierId && o.materialCode === r.materialCode;
                });
                return [...same, keyOf(r)].slice(-2);
              })
            }
          />
        ))}
        {shown.length === 0 ? (
          <div
            className="bg-bg-surface border border-border-subtle rounded-lg py-10 px-6 text-center"
            data-testid="dah-empty"
          >
            <p className="text-base font-semibold text-text-primary mb-1">
              {t('daHist.empty.title')}
            </p>
            <p className="text-sm text-text-tertiary">
              {rows.length > 0 ? t('daHist.empty.filtered') : t('daHist.empty.body')}
            </p>
          </div>
        ) : null}
      </div>
    </AppShellV2>
  );
};

/**
 * BL-268 (PEX-6 BR-04) — two versions of one supplier × material side by side:
 * the DA of each per week and the difference, and the causes of the later one.
 * @type {React.FC<{ rows: readonly DaHistoryRow[]; picked: readonly string[]; onClear: () => void }>}
 */
const ComparePanel = ({ rows, picked, onClear }) => {
  const { t } = useTranslation();
  const chosen = picked.map((k) => rows.find((r) => keyOf(r) === k)).filter((r) => r !== undefined);
  if (chosen.length === 0) return null;
  if (chosen.length === 1)
    return (
      <p className="text-xs text-text-tertiary mb-3" data-testid="dah-compare-hint">
        {t('daHist.compare.pickSecond', { version: chosen[0].version })}
      </p>
    );
  // Oldest first: the first column is the earlier version.
  const [a, b] = [...chosen].sort(
    (x, y) =>
      x.publishedAt.localeCompare(y.publishedAt) || x.publicationId.localeCompare(y.publicationId)
  );
  const lines = compareVersions(a.weeks, b.weeks);
  return (
    <section
      className="bg-bg-surface border border-border-subtle rounded-lg p-4 mb-4"
      data-testid="dah-compare"
    >
      <div className="flex flex-wrap items-baseline gap-3 mb-2">
        <h2 className="text-base font-semibold text-text-primary">{t('daHist.compare.title')}</h2>
        <span className="text-sm text-text-secondary">
          {a.supplierName} · <Data>{a.materialCode}</Data>
        </span>
        <Button variant="secondary" onClick={onClear} data-testid="dah-compare-clear">
          {t('daHist.compare.clear')}
        </Button>
      </div>
      <table className="w-full text-sm" data-testid="dah-compare-table">
        <thead>
          <tr className="text-left text-text-tertiary">
            <th scope="col" className="py-1 pr-3">
              {t('daHist.col.week')}
            </th>
            <th scope="col" className="py-1 pr-3" data-testid="dah-compare-head-a">
              {t('daHist.compare.version', { version: a.version, week: weekLabel(a.planningWeek) })}
            </th>
            <th scope="col" className="py-1 pr-3" data-testid="dah-compare-head-b">
              {t('daHist.compare.version', { version: b.version, week: weekLabel(b.planningWeek) })}
            </th>
            <th scope="col" className="py-1">
              {t('daHist.compare.difference')}
            </th>
          </tr>
        </thead>
        <tbody>
          {lines.map((l) => (
            <tr
              key={l.week}
              className="border-t border-border-subtle"
              data-testid={`dah-compare-row-${l.week}`}
            >
              <td className="py-1 pr-3">
                <Data>{weekLabel(l.week)}</Data>
              </td>
              <td className="py-1 pr-3">
                {l.a ? (
                  <Data>{formatNumber(l.a.da)}</Data>
                ) : (
                  <span className="text-text-tertiary">—</span>
                )}
              </td>
              <td className="py-1 pr-3">
                {l.b ? (
                  <Data>{formatNumber(l.b.da)}</Data>
                ) : (
                  <span className="text-text-tertiary">—</span>
                )}
              </td>
              <td className="py-1" data-testid={`dah-compare-delta-${l.week}`}>
                {l.delta === null ? (
                  <span className="text-text-tertiary">—</span>
                ) : l.delta === 0 ? (
                  t('daHist.compare.same')
                ) : (
                  <Data>{`${l.delta > 0 ? '+' : ''}${formatNumber(l.delta)}`}</Data>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-xs text-text-secondary mt-2" data-testid="dah-compare-causes">
        {b.causes.length > 0
          ? `${t('daHist.compare.causesOf', { version: b.version })} ${causeLines(b.causes, t).join(' · ')}`
          : t('daHist.compare.noCause', { version: b.version })}
      </p>
    </section>
  );
};

/** @type {React.FC<{ row: DaHistoryRow; nowIso: string; picked: boolean; canPick: boolean; onPick: () => void }>} */
const HistoryCard = ({ row: r, nowIso, picked, canPick, onPick }) => {
  const { t } = useTranslation();
  const key = keyOf(r);
  /** @param {string} week */
  const weekOf = (week) =>
    /** @type {DaHistoryRow['weeks'][number]} */ (r.weeks.find((w) => w.week === week));
  const dash = <span className="text-text-tertiary">—</span>;
  /** @param {number} n */
  const num = (n) => <Data>{formatNumber(n)}</Data>;

  /** @type {WeekGridRow[]} */
  const gridRows = [
    {
      id: 'ltp',
      label: <TermLabel term="ltp" />,
      unit: r.uom,
      combine: 'sum',
      value: (week) => weekOf(week).ltp,
      cell: (week) => num(weekOf(week).ltp)
    },
    {
      id: 'safety',
      label: <TermLabel term="safetyOrder" />,
      unit: r.uom,
      combine: 'sum',
      value: (week) => weekOf(week).safety,
      cell: (week) => (weekOf(week).safety === 0 ? dash : num(weekOf(week).safety))
    },
    {
      id: 'carriedIn',
      label: <TermLabel term="carryOver" />,
      unit: r.uom,
      combine: 'sum',
      value: (week) => weekOf(week).carriedIn.reduce((n, c) => n + c.qty, 0),
      cell: (week) => {
        const parts = weekOf(week).carriedIn;
        return parts.length === 0 ? (
          dash
        ) : (
          <span data-testid={`dah-carried-${key}-${week}`}>
            {parts.map((c) => (
              <span key={c.fromWeek} className="block">
                {t('daHist.carriedFrom', {
                  qty: formatNumber(c.qty),
                  week: weekLabel(c.fromWeek)
                })}
              </span>
            ))}
          </span>
        );
      }
    },
    {
      id: 'da',
      label: <TermLabel term="demandAnticipation" />,
      unit: r.uom,
      emphasis: true,
      combine: 'sum',
      value: (week) => weekOf(week).da,
      cell: (week) => (
        <Data data-testid={`dah-da-${key}-${week}`}>{formatNumber(weekOf(week).da)}</Data>
      )
    },
    // BL-268 (PEX-6 BR-04) — the previous version's DA of the same planning week, when there is one.
    ...(r.weeks.some((w) => w.daBefore !== null)
      ? [
          {
            id: 'daBefore',
            label: <span>{t('daHist.row.before')}</span>,
            unit: r.uom,
            combine: /** @type {const} */ ('sum'),
            value: (/** @type {string} */ week) => weekOf(week).daBefore ?? 0,
            cell: (/** @type {string} */ week) =>
              weekOf(week).daBefore === null ? (
                dash
              ) : (
                <Data data-testid={`dah-before-${key}-${week}`}>
                  {formatNumber(weekOf(week).daBefore ?? 0)}
                </Data>
              )
          }
        ]
      : []),
    {
      id: 'daInForce',
      label: <TermLabel term="daAfterCheck" />,
      unit: r.uom,
      combine: 'sum',
      value: (week) => weekOf(week).daInForce,
      cell: (week) => num(weekOf(week).daInForce)
    }
  ];

  return (
    <section
      data-testid={`dah-card-${key}`}
      className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm"
    >
      <header className="px-4 py-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="text-sm text-text-secondary">{t('daHist.planningWeek')}</span>
        <Data className="text-sm">{weekLabel(r.planningWeek)}</Data>
        <span className="text-xs text-text-tertiary">({weekDates([r.planningWeek])})</span>
        <span className="text-sm font-semibold text-text-primary">{r.supplierName}</span>
        <Data className="text-sm">{r.materialCode}</Data>
        <span className="text-sm text-text-secondary">{r.materialLabel}</span>
        <span className="text-xs text-text-secondary" data-testid={`dah-version-${key}`}>
          {t('daHist.version', { version: r.version })}
        </span>
        <span className="ml-auto" data-testid={`dah-status-${key}`}>
          {r.inForce ? (
            <StatusPill variant="info">{t('daHist.status.inForce')}</StatusPill>
          ) : (
            <StatusPill variant="neutral">
              {t('daHist.status.superseded', { id: r.supersededBy })}
            </StatusPill>
          )}
        </span>
      </header>
      {/* BL-268 (PEX-6 BR-02) — what changed since the previous publication and moved DA. */}
      {r.causes.length > 0 ? (
        <p className="px-4 pb-2 text-xs text-text-secondary" data-testid={`dah-causes-${key}`}>
          {t('daHist.causes')} {causeLines(r.causes, t).join(' · ')}
        </p>
      ) : null}
      <label className="px-4 pb-2 flex items-center gap-2 text-xs text-text-secondary">
        <input
          type="checkbox"
          checked={picked}
          disabled={!canPick}
          onChange={onPick}
          data-testid={`dah-pick-${key}`}
        />
        {t('daHist.compare.pick')}
      </label>
      <p className="px-4 pb-2 text-xs text-text-tertiary" data-testid={`dah-published-${key}`}>
        <Data>{r.publicationId}</Data> ·{' '}
        {t('daHist.publishedAt', { date: formatDateTime(r.publishedAt) })} {t('daHist.by')}{' '}
        {actorText(r.actor, t)}
        {r.source === 'sampleSeed' ? ` · ${t('daHist.sampleSeed')}` : ''} ·{' '}
        {t('daHist.rulesVersion')} <Data data-testid={`dah-rules-${key}`}>{r.rulesVersion}</Data>
      </p>
      <dl
        className="px-4 pb-3 grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-1 text-sm"
        data-testid={`dah-facts-${key}`}
      >
        {/* BL-233 TL-D10 (question 7) — the facts list carries the (i); its CSV headers keep the same words. */}
        <dt className="text-text-tertiary">
          <TermLabel term="safetyOrder" />
        </dt>
        <dd>{num(r.safetyOrder)}</dd>
        <dt className="text-text-tertiary">
          <TermLabel term="ospo" />
        </dt>
        <dd data-testid={`dah-ospo-${key}`}>{num(r.ospo)}</dd>
        <dt className="text-text-tertiary">
          <TermLabel term="additionalPo" />
        </dt>
        <dd data-testid={`dah-addpo-${key}`}>{num(r.additionalPo)}</dd>
        <dt className="text-text-tertiary">
          <TermLabel term="callOffsThisWeek" />
        </dt>
        <dd data-testid={`dah-calloff-${key}`}>{num(r.callOff)}</dd>
        <dt className="text-text-tertiary">
          <TermLabel term="remainder" />
        </dt>
        <dd data-testid={`dah-carry-${key}`}>
          {num(r.remainder)}{' '}
          <span className="text-xs text-text-tertiary">
            {r.carry
              ? t('daHist.fact.carriedTo', { week: weekLabel(r.carry.week) })
              : t('daHist.fact.notCarried')}
          </span>
        </dd>
        {r.uncarried > 0 ? (
          <>
            <dt className="text-text-tertiary">
              <TermLabel term="notCarried" />
            </dt>
            <dd>{num(r.uncarried)}</dd>
          </>
        ) : null}
        <dt className="text-text-tertiary">
          <TermLabel term="supplierAgreedOutside" />
        </dt>
        <dd data-testid={`dah-agreed-${key}`}>
          {r.agreedFirstOutside ? t('daHist.fact.agreed.yes') : t('daHist.fact.agreed.no')}
        </dd>
      </dl>
      {r.adjustments.length > 0 ? (
        <div className="px-4 pb-3" data-testid={`dah-adjustments-${key}`}>
          <h3 className="text-label text-text-tertiary uppercase mb-1">
            {t('daHist.adjust.title')}
          </h3>
          <ul className="text-sm space-y-0.5">
            {r.adjustments.map((a) => (
              <li key={`${a.callOffId}-${a.approvedAt}`}>
                {t('daHist.adjust.row', {
                  number: a.callOffNumber,
                  qty: `${formatNumber(a.quantity)} ${r.uom}`,
                  from: weekLabel(a.fromWeek),
                  to: weekLabel(a.toWeek),
                  proposedAt: formatDateTime(a.proposedAt),
                  approvedAt: formatDateTime(a.approvedAt)
                })}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <div className="border-t border-border-subtle">
        <WeekGrid
          label={`${r.publicationId} · ${r.supplierName} · ${r.materialCode}`}
          corner={t('daHist.col.week')}
          currentWeek={nowIso.slice(0, 10)}
          testId={`dah-grid-${key}`}
          viewKey="buyerDemandAnticipationHistory"
          weeks={r.weeks.map((w) => ({ week: w.week }))}
          rows={gridRows}
        />
      </div>
    </section>
  );
};

export default BuyerDemandAnticipationHistory;
