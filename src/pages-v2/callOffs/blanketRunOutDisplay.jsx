/** @import React from 'react' */
import { useTranslation } from 'react-i18next';
import Data from '@components/ui-v2/Data';
import SampleDataBadge from '@components/ui-v2/SampleDataBadge';
import StatusPill from '@components/ui-v2/StatusPill';
import Table from '@components/ui-v2/Table';
import TableHeader, { TableHeaderCell } from '@components/ui-v2/TableHeader';
import TableRow from '@components/ui-v2/TableRow';
import TableCell from '@components/ui-v2/TableCell';
import { formatDate, formatIDR } from '@lib/format';
import { isLive } from '@services/liveness';
import { isoWeek } from '@services/engine/dates';
/** @import { BlanketPoRunOut, ProjectionWeek, RunOutProjection } from '@services/transitions/blanketPoRules' */
import { BLANKET_PO_HORIZON_WEEKS, isNewPoDue } from '@services/transitions/blanketPoRules';
import { qty } from './callOffDisplay';

// ─────────────────────────────────────────────────────────────────────────────
// CAP-9 (BL-178) — the blanket PO run-out on the PTI Call-offs page: both
// weeks on each blanket PO panel (BR-04), the "Blanket POs running out" list
// sorted by "new PO needed by" (BR-04), "Covers the forecast horizon" when it
// never runs out (BR-06). The page computes nothing: every figure is the read
// model's projection (`blanketPoRules`), derived at read on the hub clock.
// The LTP it draws down is the forecast publication; while that is not live the
// list carries the Sample data marker, like every capacity surface.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A projected week: `W40 · 28 Sep 2026`.
 * @type {React.FC<{ week: ProjectionWeek; testId?: string }>}
 */
const WeekLabel = ({ week, testId }) => (
  <Data data-testid={testId}>{`W${isoWeek(week.week)} · ${formatDate(week.week)}`}</Data>
);

/**
 * How far the needed-by week is from the current hub week.
 * @type {React.FC<{ week: ProjectionWeek }>}
 */
const Distance = ({ week }) => {
  const { t } = useTranslation();
  const away = week.index - 1;
  return (
    <span className="text-text-secondary">
      {' ('}
      {away === 0
        ? t('co.runOut.thisWeek')
        : away > 0
          ? t('co.runOut.weeksAway', { count: away })
          : t('co.runOut.passed', { count: -away })}
      {')'}
    </span>
  );
};

/**
 * What remains, in the line's own basis.
 * @param {RunOutProjection} p
 * @param {string} uom
 * @returns {string}
 */
const remainingText = (p, uom) =>
  p.basis === 'quantity' ? `${qty(p.start)} ${uom}` : formatIDR(p.start);

/**
 * BR-04 / BR-06 — the run-out facts on one blanket PO panel.
 * @type {React.FC<{ row: BlanketPoRunOut | undefined }>}
 */
export const RunOutFacts = ({ row }) => {
  const { t } = useTranslation();
  if (!row) return null;
  const p = row.projection;
  const id = row.lineId;
  if (p.runOut === null || p.newPoBy === null)
    return (
      <p className="mt-1 text-xs text-text-secondary" data-testid={`calloff-runout-covers-${id}`}>
        {t('co.runOut.covers', { weeks: BLANKET_PO_HORIZON_WEEKS })}
        {p.hasLtp ? '' : ` · ${t('co.runOut.noLtp')}`}
      </p>
    );
  return (
    <div className="mt-1 text-xs" data-testid={`calloff-runout-${id}`}>
      <dl className="flex flex-wrap items-center gap-x-6 gap-y-1">
        <div>
          <dt className="inline text-text-tertiary">{t('co.runOut.runOut')} </dt>
          <dd className="inline">
            <WeekLabel week={p.runOut} testId={`calloff-runout-week-${id}`} />
          </dd>
        </div>
        <div>
          <dt className="inline text-text-tertiary">{t('co.runOut.newPoBy')} </dt>
          <dd className="inline">
            <WeekLabel week={p.newPoBy} testId={`calloff-newpo-week-${id}`} />
            <Distance week={p.newPoBy} />
          </dd>
        </div>
        {isNewPoDue(p) && (
          <span data-testid={`calloff-newpo-due-${id}`}>
            <StatusPill variant="warning">{t('co.runOut.due')}</StatusPill>
          </span>
        )}
      </dl>
      <p className="mt-0.5 text-[11px] text-text-tertiary">
        {t(p.leadTime.onRecord ? 'co.runOut.leadTime' : 'co.runOut.leadTimeFallback', {
          weeks: p.leadTime.weeks
        })}
        {p.basis === 'value' ? ` · ${t('co.runOut.valueBasis')}` : ''}
      </p>
    </div>
  );
};

/**
 * BR-04 — "Blanket POs running out", already sorted by "new PO needed by".
 * @type {React.FC<{ rows: readonly BlanketPoRunOut[] }>}
 */
export const RunningOutList = ({ rows }) => {
  const { t } = useTranslation();
  return (
    <section
      aria-labelledby="calloff-runout-title"
      data-testid="calloff-runout-list"
      className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm mb-6"
    >
      <header className="px-4 py-3 border-b border-border-subtle">
        <h2 id="calloff-runout-title" className="text-sm font-semibold text-text-primary">
          {t('co.runOut.title')}
          {!isLive('forecastPublications') && <SampleDataBadge className="ml-3 align-middle" />}
        </h2>
        <p className="text-xs text-text-secondary mt-0.5">{t('co.runOut.subtitle')}</p>
      </header>
      {rows.length === 0 ? (
        <p className="px-4 py-4 text-sm text-text-tertiary" data-testid="calloff-runout-empty">
          {t('co.runOut.empty', { weeks: BLANKET_PO_HORIZON_WEEKS })}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableHeaderCell>{t('co.runOut.col.po')}</TableHeaderCell>
              <TableHeaderCell>{t('co.runOut.col.material')}</TableHeaderCell>
              <TableHeaderCell className="text-right">
                {t('co.runOut.col.remaining')}
              </TableHeaderCell>
              <TableHeaderCell>{t('co.runOut.col.runOut')}</TableHeaderCell>
              <TableHeaderCell>{t('co.runOut.col.newPoBy')}</TableHeaderCell>
              <TableHeaderCell>{t('co.runOut.col.leadTime')}</TableHeaderCell>
            </TableHeader>
            <tbody>
              {rows.map((r) => {
                const p = r.projection;
                if (p.runOut === null || p.newPoBy === null) return null;
                return (
                  <TableRow key={r.lineId} data-testid={`calloff-runout-row-${r.lineId}`}>
                    <TableCell>
                      <Data className="text-xs font-bold text-text-primary">{r.poNumber}</Data>
                      <div className="text-xs text-text-primary">{r.supplierName}</div>
                    </TableCell>
                    <TableCell className="text-xs text-text-secondary">
                      <Data className="text-text-tertiary">{r.materialCode}</Data> · {r.description}
                    </TableCell>
                    <TableCell className="text-right">
                      <Data>{remainingText(p, r.uom)}</Data>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs">
                      <WeekLabel week={p.runOut} />
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs">
                      <WeekLabel week={p.newPoBy} />
                      <Distance week={p.newPoBy} />
                      {isNewPoDue(p) && (
                        <div className="mt-1" data-testid={`calloff-runout-due-${r.lineId}`}>
                          <StatusPill variant="warning">{t('co.runOut.due')}</StatusPill>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs text-text-secondary">
                      {t(p.leadTime.onRecord ? 'co.runOut.weeks' : 'co.runOut.weeksFallback', {
                        weeks: p.leadTime.weeks
                      })}
                    </TableCell>
                  </TableRow>
                );
              })}
            </tbody>
          </Table>
        </div>
      )}
    </section>
  );
};
