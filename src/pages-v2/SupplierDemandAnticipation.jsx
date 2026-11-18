/** @import React from 'react' */
import { useTranslation } from 'react-i18next';
import AppShellV2 from '@components/layout-v2/AppShellV2';
import PageHeader from '@components/ui-v2/PageHeader';
import PageMetaLine from '@components/ui-v2/PageMetaLine';
import SampleDataBadge from '@components/ui-v2/SampleDataBadge';
import Data from '@components/ui-v2/Data';
import WeekGrid from '@components/ui-v2/WeekGrid';
import TermLabel from '@components/ui-v2/TermLabel';
import LoadingState from '@components/ui-v2/LoadingState';
import ErrorState from '@components/ui-v2/ErrorState';
/** @import { WeekGridRow } from '@components/ui-v2/WeekGrid' */
import { formatDate, formatNumber } from '@lib/format';
import { isoWeek } from '@services/engine/dates';
import { useSupplierDemandAnticipation, useInventory } from '@services/query/hooks';
/** @import { SupplierDaRow } from '@services/data/mock/demandAnticipationReadModel' */
/** @import { SupplierDaWeek } from '@services/transitions/supplierDaView' */
import { SUPPLIER_DA_VIEW_ENABLED } from '@services/transitions/supplierDaView';
import { DA_PROVISIONAL_QUESTIONS } from '@services/transitions/demandAnticipationRules';
import { inventoryNow } from './inventory/inventoryDisplay';
import DaConfirmationPanel from './demandAnticipation/DaConfirmationPanel';

// ─────────────────────────────────────────────────────────────────────────────
// SUPPLIER · DEMAND ANTICIPATION — BL-204 (DRC-1), under Planning.
//
// BUILT AHEAD AND SWITCHED OFF (DRC-D10): while `SUPPLIER_DA_VIEW_ENABLED` is
// false the menu has no item for this page and the route says the view is not
// available yet; the read is not even fetched.
//
// With the flag on: one card per own supplier × material, the LATEST
// publication's figures per horizon week (LTP, safety order, carried in, and
// the demand anticipation itself), read only, in the CAP-1 WeekGrid. The read
// is scoped by persona in the service, never here. Every figure is built on
// [Default] rules, so the page carries the Provisional label with the
// questions (design rule 5, A1, A2, A8b, A9). On screen the figure is never
// "DA" (CAP-D10). No number is computed here; every number is the read's.
// ─────────────────────────────────────────────────────────────────────────────

const dash = <span className="text-text-tertiary">—</span>;

/** `W42` for a week's Monday. @param {string} week */
const weekLabel = (week) => `W${isoWeek(week)}`;

/** @param {SupplierDaRow} r */
const keyOf = (r) => `${r.supplierId}-${r.materialCode}`;

/** @type {React.FC<{ row: SupplierDaRow; currentWeek: string }>} */
const SupplierAnticipationGrid = ({ row, currentWeek }) => {
  const { t } = useTranslation();
  const rowKey = keyOf(row);
  /** @param {string} week */
  const weekOf = (week) => /** @type {SupplierDaWeek} */ (row.weeks.find((w) => w.week === week));
  /**
   * @param {string} id
   * @param {React.ReactNode} label
   * @param {(w: SupplierDaWeek) => number} pick
   * @param {boolean} [zeroAsDash]
   * @returns {WeekGridRow}
   */
  const numberRow = (id, label, pick, zeroAsDash = false) => ({
    id,
    label,
    unit: row.uom,
    combine: 'sum',
    emphasis: id === 'figure',
    value: (week) => pick(weekOf(week)),
    cell: (week) => {
      const v = pick(weekOf(week));
      if (zeroAsDash && v === 0) return dash;
      return <Data data-testid={`supda-${id}-${rowKey}-${week}`}>{formatNumber(v)}</Data>;
    }
  });

  return (
    <WeekGrid
      label={`${row.materialCode} · ${row.materialLabel}`}
      corner={t('demandAnt.grid.corner')}
      currentWeek={currentWeek}
      testId={`supda-grid-${rowKey}`}
      viewKey="supplierDemandAnticipation"
      weeks={row.weeks.map((w) => ({ week: w.week, testId: `supda-week-${rowKey}-${w.week}` }))}
      rows={[
        // BL-233 — each row label is a glossary term with its (i).
        numberRow('ltp', <TermLabel term="ltp" />, (w) => w.ltp),
        numberRow('safety', <TermLabel term="safetyOrder" />, (w) => w.safety, true),
        numberRow('carriedIn', <TermLabel term="carryOver" />, (w) => w.carriedIn, true),
        numberRow('figure', <TermLabel term="demandAnticipation" />, (w) => w.qty)
      ]}
    />
  );
};

/** @type {React.FC} */
const SupplierDemandAnticipation = () => {
  const { t } = useTranslation();
  const query = useSupplierDemandAnticipation(SUPPLIER_DA_VIEW_ENABLED);
  // PSC-1 (BL-336) — SOH is ONE figure: the confirmation pre-fills the stock
  // page, and what the page reads back is the stock record's own figure.
  const inventory = useInventory();
  const nowIso = inventoryNow();
  const crumb = [t('hub.nav.section.planning'), t('hub.nav.sup.demandAnticipation')];

  // DRC-D10 — the route exists, the view does not, until the flag is on.
  if (!SUPPLIER_DA_VIEW_ENABLED)
    return (
      <AppShellV2>
        <PageHeader breadcrumb={crumb} title={t('hub.nav.sup.demandAnticipation')} />
        <div
          className="bg-bg-surface border border-border-subtle rounded-lg py-10 px-6 text-center"
          role="status"
          data-testid="supda-not-available"
        >
          <p className="text-base font-semibold text-text-primary mb-1">{t('supDa.off.title')}</p>
          <p className="text-sm text-text-tertiary">{t('supDa.off.body')}</p>
        </div>
      </AppShellV2>
    );

  if (query.isPending) return <LoadingState breadcrumb={crumb} />;
  if (query.isError)
    return <ErrorState breadcrumb={crumb} error={query.error} onRetry={() => query.refetch()} />;
  const rows = query.data.items;

  return (
    <AppShellV2>
      <PageHeader
        breadcrumb={crumb}
        title={t('hub.nav.sup.demandAnticipation')}
        subtitle={t('supDa.subtitle')}
      />
      <PageMetaLine className="-mt-6 mb-4">
        {t('supDa.asOf')} <Data>{formatDate(nowIso)}</Data>
        <SampleDataBadge className="ml-3 align-middle" />
      </PageMetaLine>
      {/* Design rule 5 — every figure here is built on [Default] rules. */}
      <p className="text-xs text-text-tertiary mb-4" data-testid="supda-provisional">
        {t('ltpFg.provisional', { question: DA_PROVISIONAL_QUESTIONS.join(', ') })}
      </p>
      {/* PSC-1 (BL-336) — the one-time weekly confirmation, above the figures. */}
      <DaConfirmationPanel
        rows={rows}
        positions={inventory.data?.items ?? []}
        supplierId={rows[0]?.supplierId ?? ''}
        nowIso={nowIso}
      />
      <div className="space-y-3">
        {rows.map((r) => (
          <section
            key={keyOf(r)}
            data-testid={`supda-card-${keyOf(r)}`}
            className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm"
          >
            <header className="px-4 py-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <Data className="text-sm">{r.materialCode}</Data>
              <span className="text-sm text-text-secondary">{r.materialLabel}</span>
              <span
                className="ml-auto text-xs text-text-tertiary"
                data-testid={`supda-publication-${keyOf(r)}`}
              >
                {t('supDa.card.published', {
                  week: weekLabel(r.planningWeek),
                  date: formatDate(r.publishedAt)
                })}
                {' · '}
                {t('supDa.card.total')}{' '}
                <Data data-testid={`supda-total-${keyOf(r)}`}>
                  {formatNumber(r.totalDa)} {r.uom}
                </Data>
              </span>
            </header>
            <div className="border-t border-border-subtle">
              <SupplierAnticipationGrid row={r} currentWeek={nowIso.slice(0, 10)} />
            </div>
          </section>
        ))}
        {rows.length === 0 ? (
          <div
            className="bg-bg-surface border border-border-subtle rounded-lg py-10 px-6 text-center"
            data-testid="supda-empty"
          >
            <p className="text-base font-semibold text-text-primary mb-1">
              {t('supDa.empty.title')}
            </p>
            <p className="text-sm text-text-tertiary">{t('supDa.empty.body')}</p>
          </div>
        ) : null}
      </div>
    </AppShellV2>
  );
};

export default SupplierDemandAnticipation;
