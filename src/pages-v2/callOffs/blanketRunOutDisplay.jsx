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
/** @import { BlanketPoRef, BlanketPoRunOut, ProjectionWeek, RunOutProjection, RunningOutGroup } from '@services/transitions/blanketPoRules' */
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
 * Owner ruling 2026-10-13 — an older line of a supplier × material group names
 * the line drawn after it instead of "new PO needed by".
 * @type {React.FC<{ next: BlanketPoRef; testId?: string }>}
 */
const NextInLine = ({ next, testId }) => {
  const { t } = useTranslation();
  return (
    <span className="text-text-secondary" data-testid={testId}>
      {t('co.runOut.nextInLine')} <Data>{next.poNumber}</Data>
    </span>
  );
};

/**
 * BR-04 / BR-06 — the run-out facts on one blanket PO panel.
 * @type {React.FC<{ row: BlanketPoRunOut | undefined }>}
 */
export const RunOutFacts = ({ row }) => {
  const { t } = useTranslation();
  if (!row) return null;
  const p = row.projection;
  const id = row.lineId;
  if (p.runOut === null)
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
        {p.newPoBy !== null ? (
          <div>
            <dt className="inline text-text-tertiary">{t('co.runOut.newPoBy')} </dt>
            <dd className="inline">
              <WeekLabel week={p.newPoBy} testId={`calloff-newpo-week-${id}`} />
              <Distance week={p.newPoBy} />
            </dd>
          </div>
        ) : row.nextInLine !== null ? (
          <NextInLine next={row.nextInLine} testId={`calloff-next-in-line-${id}`} />
        ) : null}
        {isNewPoDue(p) ? (
          <span data-testid={`calloff-newpo-due-${id}`}>
            <StatusPill variant="warning">{t('co.runOut.due')}</StatusPill>
          </span>
        ) : null}
      </dl>
      <p className="mt-0.5 text-[11px] text-text-tertiary">
        {p.lastInLine
          ? t(p.leadTime.onRecord ? 'co.runOut.leadTime' : 'co.runOut.leadTimeFallback', {
              weeks: p.leadTime.weeks
            })
          : t('co.runOut.drawnFirst')}
        {p.basis === 'value' ? ` · ${t('co.runOut.valueBasis')}` : ''}
      </p>
    </div>
  );
};

/**
 * One line's row in the list: the last line of a group carries "new PO needed
 * by" and the lead time; an older line its run-out and the line next in line.
 * @type {React.FC<{ row: BlanketPoRunOut }>}
 */
const ListRow = ({ row: r }) => {
  const { t } = useTranslation();
  const p = r.projection;
  const earlier = !p.lastInLine;
  return (
    <TableRow data-testid={`calloff-runout-row-${r.lineId}`}>
      <TableCell className={earlier ? 'pl-8' : undefined}>
        <Data
          className={`text-xs ${earlier ? 'text-text-secondary' : 'font-bold text-text-primary'}`}
        >
          {r.poNumber}
        </Data>
        {earlier ? null : <div className="text-xs text-text-primary">{r.supplierName}</div>}
      </TableCell>
      <TableCell className="text-xs text-text-secondary">
        {earlier ? null : (
          <>
            <Data className="text-text-tertiary">{r.materialCode}</Data> · {r.description}
          </>
        )}
      </TableCell>
      <TableCell className="text-right">
        <Data className={earlier ? 'text-text-secondary' : undefined}>
          {remainingText(p, r.uom)}
        </Data>
      </TableCell>
      <TableCell className="whitespace-nowrap text-xs">
        {p.runOut === null ? null : <WeekLabel week={p.runOut} />}
      </TableCell>
      <TableCell className="whitespace-nowrap text-xs">
        {p.newPoBy !== null ? (
          <>
            <WeekLabel week={p.newPoBy} />
            <Distance week={p.newPoBy} />
            {isNewPoDue(p) ? (
              <div className="mt-1" data-testid={`calloff-runout-due-${r.lineId}`}>
                <StatusPill variant="warning">{t('co.runOut.due')}</StatusPill>
              </div>
            ) : null}
          </>
        ) : r.nextInLine !== null ? (
          <NextInLine next={r.nextInLine} />
        ) : null}
      </TableCell>
      <TableCell className="whitespace-nowrap text-xs text-text-secondary">
        {earlier
          ? null
          : t(p.leadTime.onRecord ? 'co.runOut.weeks' : 'co.runOut.weeksFallback', {
              weeks: p.leadTime.weeks
            })}
      </TableCell>
    </TableRow>
  );
};

/**
 * BR-04 — "Blanket POs running out", one block per supplier × material group,
 * already sorted by "new PO needed by". Each block is the group's last line
 * (the one a new PO replaces) with the older lines drawn before it under it.
 * @type {React.FC<{ groups: readonly RunningOutGroup[] }>}
 */
export const RunningOutList = ({ groups }) => {
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
          {isLive('forecastPublications') ? null : (
            <SampleDataBadge className="ml-3 align-middle" />
          )}
        </h2>
        <p className="text-xs text-text-secondary mt-0.5">{t('co.runOut.subtitle')}</p>
      </header>
      {groups.length === 0 ? (
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
            {groups.map((g) => (
              <tbody
                key={g.last.lineId}
                data-testid={`calloff-runout-group-${g.last.lineId}`}
                className="border-t-2 border-border-subtle"
              >
                <ListRow row={g.last} />
                {g.earlier.map((r) => (
                  <ListRow key={r.lineId} row={r} />
                ))}
              </tbody>
            ))}
          </Table>
        </div>
      )}
    </section>
  );
};
