/** @import React from 'react' */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import Button from '@components/ui-v2/Button';
import Data from '@components/ui-v2/Data';
import StatusPill from '@components/ui-v2/StatusPill';
import { HandoffNotice } from '@components/ui-v2/HandoffNotice';
import { useVerbAvailability } from '@hooks/useVerbAvailability';
import { useToast } from '@hooks/useToast';
import { useRefusalText } from '@hooks/useRefusalText';
import { formatDateTime, formatNumber } from '@lib/format';
import { isoWeek } from '@services/engine/dates';
/** @import { InventoryPosition, PurchaseOrder } from '@services/data/types' */
/** @import { SupplierDaRow } from '@services/data/mock/demandAnticipationReadModel' */
import { daConfirmationRefusal, daStockCutoffAt } from '@services/transitions/daConfirmationRules';
import { updateCycleSettings } from '@services/transitions/inventoryConfig';
import { hubWorkingCalendar } from '@services/transitions/workingCalendarStore';
import { planStatus } from '@services/transitions/capacityRules';
import { responseDeadline, isAwaitingResponse } from '@services/data/poResponseProjection';
import {
  useASNs,
  useCapacityPlans,
  useForecastCommitments,
  usePurchaseOrders
} from '@services/query/hooks';
import { useDaConfirmation } from '@services/query/commandHooks';

// ────────────────────────────────────────────────────────────────────────────
// PSC-1 (BL-336) — THE ONE-TIME WEEKLY CONFIRMATION, on the supplier's DA page.
//
// The page is the one-time confirmation surface (BR-04). It states the two
// deadlines side by side — the Wednesday 23:59 WIB confirmation (BR-02) and the
// Thursday 23:59 WIB new-stock cutoff the stock page already counts (BR-03) —
// and lists what the week's confirmation covers: every material with a
// published DA, the open POs with a due response, the capacity groups in the
// horizon, the Foresight periods published this week and the feedstock rows
// (BR-10). The shipping notices are read-only from the first ASN (BR-05,
// BL-356).
//
// SOH is ONE figure (BR-06): the confirmation PRE-FILLS the stock page and
// writes no stock record — the stock page stays the single entry point, and
// what it shows here is the stock record's own figure when one exists. A
// carried-forward week needs no submit (BR-05); the values in force stay those
// of the last confirmation. An API supplier's figures pre-fill and only the
// differences are recorded as its changes (BR-08, derived by the target).
// ────────────────────────────────────────────────────────────────────────────

const INPUT_CLASS =
  'w-28 px-2 py-1 text-sm text-right font-mono text-text-primary bg-white border border-border-input rounded-md focus:outline-none focus:border-action';

/**
 * The planning week label of a Monday: `W36`.
 * @param {string} week
 */
const weekLabel = (week) => `W${isoWeek(week)}`;

/**
 * The Foresight periods PUBLISHED IN THE WEEK of `weekStart` (BR-09): a line
 * counts when its version was published from that week's Monday on, and its
 * period (a week for packaging, a month for raw material) covers that week.
 * A raw material's monthly period therefore shows only in its publication
 * week, and a material with no publication this week shows nothing.
 * @param {readonly { materialCode: string; periodBucket: string; publishedAt: string }[]} lines
 * @param {string} weekStart
 * @param {string} weekEnd  The Sunday after `weekStart` (exclusive bound: its next day).
 * @returns {string[]} material codes, unique, sorted
 */
export function foresightPublishedInWeek(lines, weekStart, weekEnd) {
  const month = weekStart.slice(0, 7);
  const codes = new Set(
    lines
      .filter((l) => {
        const published = l.publishedAt.slice(0, 10);
        if (published < weekStart || published >= weekEnd) return false;
        return l.periodBucket === weekStart || l.periodBucket === month;
      })
      .map((l) => l.materialCode)
  );
  return [...codes].sort();
}

/**
 * `weekEnd` for `foresightPublishedInWeek`: the day after the week's Sunday.
 * @param {string} weekStart
 * @returns {string}
 */
const weekEndOf = (weekStart) =>
  new Date(Date.parse(`${weekStart}T00:00:00.000Z`) + 7 * 24 * 3_600_000)
    .toISOString()
    .slice(0, 10);

/**
 * @typedef {object} DaConfirmationPanelProps
 * @property {readonly SupplierDaRow[]} rows  The supplier's published DA rows.
 * @property {readonly InventoryPosition[]} positions  The supplier's own stock rows.
 * @property {string} supplierId
 * @property {string} nowIso
 */

/** @type {React.FC<DaConfirmationPanelProps>} */
const DaConfirmationPanel = ({ rows, positions, supplierId, nowIso }) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const refusalText = useRefusalText();
  const confirm = useDaConfirmation();
  const availability = useVerbAvailability('da:confirm');
  const held = availability.kind === 'held';
  const [edited, setEdited] = useState(/** @type {Record<string, string>} */ ({}));
  const pos = usePurchaseOrders();
  const capacity = useCapacityPlans();
  const asns = useASNs();
  const commitments = useForecastCommitments();

  if (rows.length === 0) return null;

  // One publication drives every row of the week (BR-01): the first row's.
  const first = rows[0];
  const week = first.planningWeek;
  const confirmation = first.confirmation;
  const stockCutoff = daStockCutoffAt(nowIso, hubWorkingCalendar(), updateCycleSettings());
  const own = positions.filter((p) => p.supplierId === supplierId);
  /** @param {string} code */
  const positionOf = (code) => own.find((p) => p.materialCode === code);

  /** The figure the row SHOWS: the stock record when one exists (BR-06), else the confirmed one. */
  const shownSoh = (/** @type {SupplierDaRow} */ r) => {
    const stock = positionOf(r.materialCode)?.supplierSoh;
    if (typeof stock === 'number') return { value: stock, from: 'stock' };
    const confirmed = confirmation.soh[r.materialCode];
    if (typeof confirmed === 'number') return { value: confirmed, from: 'confirmation' };
    return { value: null, from: 'none' };
  };

  /** The SOH input's value: what the supplier typed, else the pre-fill. */
  const inputOf = (/** @type {SupplierDaRow} */ r) => {
    const typed = edited[r.materialCode];
    if (typed !== undefined) return typed;
    const shown = shownSoh(r);
    return shown.value === null ? '' : String(shown.value);
  };

  const submitted = rows
    .map((r) => ({ materialCode: r.materialCode, soh: inputOf(r) }))
    .filter((s) => s.soh.trim() !== '')
    .map((s) => ({ materialCode: s.materialCode, soh: Number(s.soh) }));
  const refusal = daConfirmationRefusal({
    supplierKnown: true,
    week,
    publicationHolds: true,
    materials: submitted.map((s) => ({
      materialCode: s.materialCode,
      soh: s.soh,
      assigned: true
    }))
  });

  // ── What the week's confirmation covers (BR-10) ──────────────────────────
  const duePos = (pos.data?.items ?? []).filter(
    (po) => po.supplierId === supplierId && isAwaitingResponse(po)
  );
  const groups = (capacity.data?.items ?? []).filter((g) => g.supplierId === supplierId);
  const groupsDue = groups.filter(
    (g) => planStatus(g) === 'notStarted' || planStatus(g) === 'outdated'
  );
  /** @param {PurchaseOrder} po */
  const poDue = (po) => formatDateTime(responseDeadline(po));
  const foresight = foresightPublishedInWeek(
    (commitments.data?.items ?? []).map((l) => ({
      materialCode: l.materialCode,
      periodBucket: l.periodBucket,
      publishedAt: l.publishedAt
    })),
    week,
    weekEndOf(week)
  );
  // Feedstock is the packaging material's entry (PSC-2 BR-06): shown when the
  // supplier has packaging materials at all.
  const feedstockRows = own.filter((p) => p.materialType === 'VERP');
  // BL-356 — the shipping notice, READ-ONLY, from the first ASN on: the POs of
  // this supplier that carry a notice, listed only once the supplier has an ASN.
  const hasAsn = (asns.data?.items ?? []).some((a) => a.supplierId === supplierId);
  const notices = hasAsn
    ? (pos.data?.items ?? []).filter(
        (po) => po.supplierId === supplierId && po.shippingNotice?.expectedCompletionDate
      )
    : [];

  /** @param {React.FormEvent} e */
  const submit = async (e) => {
    e.preventDefault();
    if (refusal !== null) return;
    const result = await confirm.mutateAsync({
      supplierId,
      week,
      publicationId: first.publicationId,
      soh: submitted
    });
    if (result.status === 'failed') {
      const known = refusalText(result.reason);
      toast({
        variant: 'error',
        title: t('supDa.confirm.refused'),
        description: known ?? t('inv.refusal.generic')
      });
      return;
    }
    toast({ variant: 'success', title: t('supDa.confirm.done', { week: weekLabel(week) }) });
    setEdited({});
  };

  const statusKey = `supDa.confirm.status.${confirmation.status}`;
  return (
    <section
      className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm mb-4"
      data-testid="da-confirm"
    >
      <header className="px-4 py-3 border-b border-border-subtle">
        <h2 className="text-section text-text-primary">{t('supDa.confirm.title')}</h2>
        <p className="text-sm text-text-secondary mt-1" data-testid="da-confirm-publication">
          {t('supDa.confirm.published', {
            week: weekLabel(week),
            date: formatDateTime(confirmation.publishedAt)
          })}
        </p>
        {/* BR-01 — Zone Liability and the DA read the same Friday publication. */}
        <p className="text-xs text-text-tertiary mt-1" data-testid="da-confirm-zones">
          {t('supDa.confirm.zones')}
        </p>
      </header>

      {/* BR-02 / BR-03 / AC-01 — BOTH deadlines, side by side. */}
      <dl
        className="px-4 py-3 grid gap-3 sm:grid-cols-2 border-b border-border-subtle"
        data-testid="da-confirm-deadlines"
      >
        <div>
          <dt className="text-label text-text-tertiary uppercase">
            {t('supDa.confirm.deadline.confirmation')}
          </dt>
          <dd className="text-sm text-text-primary">
            <Data data-testid="da-confirm-due">{formatDateTime(confirmation.dueAt)}</Data>
          </dd>
        </div>
        <div>
          <dt className="text-label text-text-tertiary uppercase">
            {t('supDa.confirm.deadline.stock')}
          </dt>
          <dd className="text-sm text-text-primary">
            <Data data-testid="da-confirm-stock-cutoff">{formatDateTime(stockCutoff)}</Data>
          </dd>
        </div>
      </dl>

      <div className="px-4 py-3 space-y-3">
        {/* BR-04 / AC-03 / AC-05 — first explicit, then carried forward. */}
        <p className="text-sm text-text-primary" data-testid="da-confirm-status">
          <StatusPill
            variant={
              confirmation.status === 'notConfirmed'
                ? 'warning'
                : confirmation.status === 'carriedForward'
                  ? 'neutral'
                  : 'success'
            }
          >
            {t(`supDa.confirm.badge.${confirmation.status}`)}
          </StatusPill>{' '}
          <span className="ml-2">
            {t(statusKey, {
              week: confirmation.carriedFromWeek
                ? weekLabel(confirmation.carriedFromWeek)
                : weekLabel(week),
              date: confirmation.confirmedAt ? formatDateTime(confirmation.confirmedAt) : ''
            })}
          </span>
        </p>

        {!held && <HandoffNotice availability={availability} testId="handoff-da-confirm" />}

        {held ? (
          <form onSubmit={submit} className="space-y-2" data-testid="da-confirm-form">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-label text-text-tertiary uppercase">
                    <th className="text-left py-1">{t('supDa.confirm.col.material')}</th>
                    <th className="text-right py-1">{t('supDa.confirm.col.published')}</th>
                    <th className="text-right py-1">{t('supDa.confirm.col.soh')}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => {
                    const shown = shownSoh(r);
                    return (
                      <tr
                        key={r.materialCode}
                        className="border-t border-border-subtle"
                        data-testid={`da-confirm-row-${r.materialCode}`}
                      >
                        <td className="py-1.5">
                          <Data className="text-xs font-bold text-text-primary">
                            {r.materialCode}
                          </Data>
                          <span className="ml-2 text-text-primary">{r.materialLabel}</span>
                        </td>
                        <td className="py-1.5 text-right whitespace-nowrap">
                          <Data>{`${formatNumber(r.totalDa)} ${r.uom}`}</Data>
                        </td>
                        <td className="py-1.5 text-right whitespace-nowrap">
                          <input
                            type="number"
                            min={0}
                            step="any"
                            inputMode="decimal"
                            className={INPUT_CLASS}
                            aria-label={t('supDa.confirm.sohFor', { material: r.materialCode })}
                            data-testid={`da-confirm-soh-${r.materialCode}`}
                            value={inputOf(r)}
                            onChange={(e) =>
                              setEdited((d) => ({ ...d, [r.materialCode]: e.target.value }))
                            }
                          />
                          <div className="text-xs text-text-tertiary mt-0.5">
                            {shown.from === 'stock'
                              ? t('supDa.confirm.fromStock')
                              : shown.from === 'confirmation'
                                ? t('supDa.confirm.fromConfirmation')
                                : t('supDa.confirm.noSoh')}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-text-tertiary">{t('supDa.confirm.sohHint')}</p>
            {refusal !== null && (
              <p className="text-xs text-danger" data-testid="da-confirm-refusal">
                {t(`supDa.confirm.refusal.${refusal}`)}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="submit"
                variant="outline"
                disabled={refusal !== null || confirm.isPending}
                data-testid="da-confirm-submit"
              >
                {confirmation.status === 'notConfirmed'
                  ? t('supDa.confirm.submitFirst')
                  : t('supDa.confirm.submitChange')}
              </Button>
              {/* BR-06 — the stock page is the single stock entry point. */}
              <Link
                to="/supplier/inventory"
                className="text-sm text-action-hover hover:underline"
                data-testid="da-confirm-stock-link"
              >
                {t('supDa.confirm.openStock')}
              </Link>
            </div>
          </form>
        ) : null}

        {/* BR-10 — what the week's confirmation covers. */}
        <div className="grid gap-3 md:grid-cols-2" data-testid="da-confirm-covers">
          <section data-testid="da-confirm-pos">
            <h3 className="text-label text-text-tertiary uppercase">
              {t('supDa.confirm.covers.pos')}
            </h3>
            <p className="text-sm text-text-primary">
              {t('supDa.confirm.covers.count', { count: duePos.length })}
            </p>
            {duePos.length > 0 && (
              <ul className="mt-1 space-y-0.5">
                {duePos.slice(0, 5).map((po) => (
                  <li key={po.id} className="text-xs text-text-secondary">
                    <Data>{po.poNumber}</Data> · {t('supDa.confirm.covers.due')}{' '}
                    <Data>{poDue(po)}</Data>
                  </li>
                ))}
              </ul>
            )}
            <Link to="/supplier/orders" className="text-xs text-action-hover hover:underline">
              {t('supDa.confirm.covers.openOrders')}
            </Link>
          </section>

          <section data-testid="da-confirm-capacity">
            <h3 className="text-label text-text-tertiary uppercase">
              {t('supDa.confirm.covers.capacity')}
            </h3>
            <p className="text-sm text-text-primary">
              {t('supDa.confirm.covers.capacityCount', {
                count: groupsDue.length,
                total: groups.length
              })}
            </p>
            <Link to="/supplier/capacity" className="text-xs text-action-hover hover:underline">
              {t('supDa.confirm.covers.openCapacity')}
            </Link>
          </section>

          <section data-testid="da-confirm-foresight">
            <h3 className="text-label text-text-tertiary uppercase">
              {t('supDa.confirm.covers.foresight')}
            </h3>
            <p className="text-sm text-text-primary">
              {foresight.length === 0
                ? t('supDa.confirm.covers.foresightNone')
                : t('supDa.confirm.covers.foresightCount', { count: foresight.length })}
            </p>
            <Link to="/supplier/forecasts" className="text-xs text-action-hover hover:underline">
              {t('supDa.confirm.covers.openForesight')}
            </Link>
          </section>

          {feedstockRows.length > 0 && (
            <section data-testid="da-confirm-feedstock">
              <h3 className="text-label text-text-tertiary uppercase">
                {t('supDa.confirm.covers.feedstock')}
              </h3>
              <ul className="space-y-0.5">
                {feedstockRows.map((p) => (
                  <li key={p.materialCode} className="text-xs text-text-secondary">
                    <Data>{p.materialCode}</Data> ·{' '}
                    {p.feedstock
                      ? `${formatNumber(p.feedstock.feedstockQty)} ${p.feedstock.uom}`
                      : t('supDa.confirm.covers.feedstockNone')}
                  </li>
                ))}
              </ul>
              {/* BR-07 — feedstock is typed in the stock table, never here. */}
              <Link to="/supplier/inventory" className="text-xs text-action-hover hover:underline">
                {t('supDa.confirm.covers.openFeedstock')}
              </Link>
            </section>
          )}
        </div>

        {/* BL-356 — the shipping notice, read-only, from the first ASN. */}
        {notices.length > 0 && (
          <section data-testid="da-confirm-notices">
            <h3 className="text-label text-text-tertiary uppercase">
              {t('supDa.confirm.notices.title')}
            </h3>
            <ul className="space-y-0.5">
              {notices.map((po) => (
                <li key={po.id} className="text-xs text-text-secondary">
                  <Data>{po.poNumber}</Data> · {t('supDa.confirm.notices.expected')}{' '}
                  <Data>{formatDateTime(po.shippingNotice?.expectedCompletionDate)}</Data>
                </li>
              ))}
            </ul>
            <p className="text-xs text-text-tertiary">{t('supDa.confirm.notices.readOnly')}</p>
          </section>
        )}
      </div>
    </section>
  );
};

export default DaConfirmationPanel;
