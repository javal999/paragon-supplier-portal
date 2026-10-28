/** @import React from 'react' */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Table from '@components/ui-v2/Table';
import TableHeader, { TableHeaderCell } from '@components/ui-v2/TableHeader';
import TableRow from '@components/ui-v2/TableRow';
import TableCell from '@components/ui-v2/TableCell';
import Button from '@components/ui-v2/Button';
import Data from '@components/ui-v2/Data';
import StatusPill from '@components/ui-v2/StatusPill';
import { HandoffNotice } from '@components/ui-v2/HandoffNotice';
import { useVerbAvailability } from '@hooks/useVerbAvailability';
import { useToast } from '@hooks/useToast';
import { formatDate, formatDateTime } from '@lib/format';
import { useFeedstockConfirm } from '@services/query/commandHooks';
import { useSupplierDemandAnticipation } from '@services/query/hooks';
import { SUPPLIER_DA_VIEW_ENABLED } from '@services/transitions/supplierDaView';
import { isoWeek } from '@services/engine/dates';
/** @import { InventoryPosition } from '@services/data/types' */
import { updateCycleSettings } from '@services/transitions/inventoryConfig';
import { dayOf } from '@services/transitions/inventoryRules';
import { hubWorkingCalendar } from '@services/transitions/workingCalendarStore';
/** @import { FeedstockRefusal } from '@services/transitions/feedstockRules' */
import {
  FEEDSTOCK_PROVISIONAL_QUESTIONS,
  FEEDSTOCK_RULES,
  feedstockCycleStatus,
  feedstockEntryRefusal,
  feedstockRefusalOf
} from '@services/transitions/feedstockRules';
import { qty } from './inventoryDisplay';

// ─────────────────────────────────────────────────────────────────────────────
// SUPPLIER · CURRENT FEEDSTOCK — BL-194, DRC-8 (feedstock part only; DRC-D17).
//
// On the supplier Stock page, under the weekly stock update. Per assigned
// material: the latest confirmation (quantity in the material's unit, the date
// it is confirmed as of), and whether this cycle's confirmation is still due
// (BR-b [Team E2, owner 2026-10-28]: DAILY for a supplier on a pull agreement,
// else weekly with the Thursday stock update cycle — the weekly due list is
// MR-1's own `weeklyUpdateStatus` over the latest confirmation, so it counts
// the same weeks). It does NOT feed the MR-2 update-compliance score.
//
// No DA figure is shown here while `SUPPLIER_DA_VIEW_ENABLED` is off (DRC-D10).
// BL-204 builds the deferred half of DRC-8 behind that flag: with it on, a
// material with a published DA offers an optional "Incoming DA confirmed"
// box, stored with the confirmation (the target records which publication).
// Feedstock is NOT stock (MoM 2B): this panel never touches the stock figures
// above it.
//
// The form is the only entrance to `t_feedstock_confirm`, gated on the MODE
// (§84): a seat without the atom reads the list and is told whose act it is.
// The submit is disabled by the same rule the verb's hook calls.
// ─────────────────────────────────────────────────────────────────────────────

const INPUT_CLASS = 'w-full mt-1 px-3 py-2 text-sm border border-border-subtle rounded-md bg-white';

/**
 * @typedef {object} Draft
 * @property {string} materialCode
 * @property {string} materialLabel
 * @property {string} uom
 * @property {string} qty
 * @property {string} confirmedOn
 * @property {string} note
 * @property {boolean} incomingDa BL-204 — "Incoming DA confirmed" ticked.
 */

/**
 * The form's quantity as the rule reads it: a number, or the raw text (refused).
 * @param {string} v
 * @returns {unknown}
 */
const qtyOf = (v) => (v.trim() === '' ? undefined : Number(v));

/**
 * The i18n key and values for a refusal, or null.
 * @param {FeedstockRefusal | null} r
 * @returns {[string, Record<string, unknown>] | null}
 */
const refusalText = (r) =>
  r === null ? null : [`fsConfirm.refusal.${r}`, { max: FEEDSTOCK_RULES.noteMaxLength }];

/**
 * @typedef {object} FeedstockConfirmPanelProps
 * @property {string} supplierId
 * @property {readonly InventoryPosition[]} positions
 * @property {string} nowIso
 */

/** @type {React.FC<FeedstockConfirmPanelProps>} */
const FeedstockConfirmPanel = ({ supplierId, positions, nowIso }) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const confirm = useFeedstockConfirm();
  const availability = useVerbAvailability('feedstock:confirm');
  const held = availability.kind === 'held';
  const [draft, setDraft] = useState(/** @type {Draft | null} */ (null));
  // BL-204 — the supplier's own published DA; not even fetched while the flag is off.
  const daQuery = useSupplierDemandAnticipation(SUPPLIER_DA_VIEW_ENABLED);
  const daByCode = new Map(
    SUPPLIER_DA_VIEW_ENABLED
      ? (daQuery.data?.items ?? [])
          .filter((r) => r.supplierId === supplierId)
          .map((r) => [r.materialCode, r])
      : []
  );

  const own = positions.filter((p) => p.supplierId === supplierId);
  if (own.length === 0) return null;

  const today = dayOf(nowIso);
  const status = feedstockCycleStatus(
    supplierId,
    own.map((p) => ({
      supplierId: p.supplierId,
      materialCode: p.materialCode,
      feedstockRecordedAt: p.feedstock?.recordedAt ?? null
    })),
    nowIso,
    hubWorkingCalendar(),
    updateCycleSettings(),
    // [Team E2] the flag is the supplier's, so every row of it carries the same.
    own.some((p) => p.pullAgreement === true)
  );
  const daily = own.some((p) => p.pullAgreement === true);
  /** @param {string} key */
  const cadenceKey = (key) => (daily ? `fsConfirm.daily.${key}` : `fsConfirm.${key}`);
  const provisional =
    FEEDSTOCK_PROVISIONAL_QUESTIONS.length > 0
      ? t('fsConfirm.provisional', { question: FEEDSTOCK_PROVISIONAL_QUESTIONS.join(', ') })
      : null;

  // Every row here is an assigned material (the stock read lists nothing else).
  const refusal = draft
    ? feedstockEntryRefusal({
        assigned: true,
        feedstockQty: qtyOf(draft.qty),
        confirmedOn: draft.confirmedOn,
        note: draft.note,
        today,
        incomingDaConfirmed: draft.incomingDa,
        incomingDaAvailable: daByCode.has(draft.materialCode)
      })
    : null;
  const refusalMsg = refusalText(refusal);

  /** @param {InventoryPosition} p */
  const open = (p) =>
    setDraft({
      materialCode: p.materialCode,
      materialLabel: p.materialLabel,
      uom: p.uom,
      qty: p.feedstock ? String(p.feedstock.feedstockQty) : '',
      confirmedOn: today,
      note: '',
      incomingDa: false
    });

  /** @param {React.FormEvent} e */
  const send = async (e) => {
    e.preventDefault();
    if (!draft || refusal) return;
    const result = await confirm.mutateAsync({
      supplierId,
      materialCode: draft.materialCode,
      feedstockQty: Number(draft.qty),
      confirmedOn: draft.confirmedOn,
      note: draft.note,
      ...(draft.incomingDa ? { incomingDaConfirmed: true } : {})
    });
    if (result.status === 'failed') {
      const known = refusalText(feedstockRefusalOf(result.reason));
      toast({
        variant: 'error',
        title: known
          ? t(known[0], known[1])
          : t('fsConfirm.toast.refused', { reason: result.reason ?? '' })
      });
      return;
    }
    toast({ variant: 'success', title: t('fsConfirm.toast.done', { code: draft.materialCode }) });
    setDraft(null);
  };

  // "Missed" (MR-1's missed-last-cycle) only for a material confirmed at least
  // once: a material never confirmed reads "Due", so the first week of this
  // feature does not open with every material marked missed.
  const confirmedEver = new Set(own.filter((p) => p.feedstock).map((p) => p.materialCode));
  const missed = status.missed.filter((code) => confirmedEver.has(code));
  const draftDa = draft ? daByCode.get(draft.materialCode) : undefined;
  /** @param {string} code */
  const stateOf = (code) =>
    status.updated.includes(code)
      ? 'confirmed'
      : missed.includes(code)
        ? 'missed'
        : status.missing.includes(code)
          ? 'due'
          : null;

  return (
    <section
      className="bg-bg-surface border border-border-subtle rounded-lg p-4 mb-6 space-y-3"
      data-testid="feedstock-confirm"
    >
      <h2 className="text-section text-text-primary">{t('fsConfirm.title')}</h2>
      <p className="text-sm text-text-secondary" data-testid="feedstock-intro">
        {t(cadenceKey('intro'))}
      </p>
      {/* Design rule 5 — a [Default] says so, with its questions; none is left (E1, E2 answered). */}
      {provisional !== null && (
        <p className="text-xs text-text-tertiary" data-testid="feedstock-provisional">
          {provisional}
        </p>
      )}
      <p className="text-sm text-text-primary" data-testid="feedstock-due">
        {t(cadenceKey('due'))} <Data>{formatDateTime(status.cycle.cutoff)}</Data>
        <span className="text-text-tertiary">
          {' '}
          · {t('fsConfirm.count', { confirmed: status.updated.length, total: status.total })}
        </span>
      </p>
      {missed.length > 0 && (
        <p className="text-sm text-danger" role="status" data-testid="feedstock-missed">
          {t(cadenceKey('missed'), { count: missed.length })}
        </p>
      )}
      {status.missing.length === 0 && (
        <p className="text-sm text-success" data-testid="feedstock-all-done">
          {t(cadenceKey('allDone'))}
        </p>
      )}

      {!held && (
        <div data-testid="feedstock-gate">
          <HandoffNotice availability={availability} testId="handoff-feedstock-confirm" />
        </div>
      )}

      {held && draft !== null ? (
        <form
          className="rounded-lg border border-border-subtle bg-white p-4 flex flex-col gap-3"
          data-testid="feedstock-form"
          onSubmit={send}
        >
          <h3 className="text-sm font-semibold text-text-primary">
            {t('fsConfirm.form.title')} <Data>{draft.materialCode}</Data>{' '}
            <span className="font-normal text-text-secondary">{draft.materialLabel}</span>
          </h3>
          <label className="block">
            <span className="text-label text-text-tertiary uppercase">
              {t('fsConfirm.form.qty', { uom: draft.uom })}
            </span>
            <input
              type="number"
              min={0}
              step="any"
              className={`${INPUT_CLASS} font-mono`}
              data-testid="feedstock-qty"
              aria-label={t('fsConfirm.form.qty', { uom: draft.uom })}
              value={draft.qty}
              onChange={(e) => setDraft((d) => (d ? { ...d, qty: e.target.value } : d))}
            />
          </label>
          <label className="block">
            <span className="text-label text-text-tertiary uppercase">
              {t('fsConfirm.form.date')}
            </span>
            <input
              type="date"
              max={today}
              className={`${INPUT_CLASS} font-mono`}
              data-testid="feedstock-date"
              aria-label={t('fsConfirm.form.date')}
              value={draft.confirmedOn}
              onChange={(e) => setDraft((d) => (d ? { ...d, confirmedOn: e.target.value } : d))}
            />
          </label>
          <label className="block">
            <span className="text-label text-text-tertiary uppercase">
              {t('fsConfirm.form.note')}
            </span>
            <textarea
              className={INPUT_CLASS}
              rows={2}
              data-testid="feedstock-note"
              aria-label={t('fsConfirm.form.note')}
              value={draft.note}
              onChange={(e) => setDraft((d) => (d ? { ...d, note: e.target.value } : d))}
            />
          </label>
          {/* BL-204 (DRC-8) — only with the supplier view on and a published DA. */}
          {draftDa ? (
            <label className="flex items-start gap-2" data-testid="feedstock-incoming-da">
              <input
                type="checkbox"
                className="mt-1"
                data-testid="feedstock-incoming-da-box"
                checked={draft.incomingDa}
                onChange={(e) => setDraft((d) => (d ? { ...d, incomingDa: e.target.checked } : d))}
              />
              <span className="text-sm text-text-primary">
                {t('fsConfirm.incomingDa.label')}
                <span className="block text-xs text-text-tertiary">
                  {t('fsConfirm.incomingDa.hint', {
                    week: `W${isoWeek(draftDa.planningWeek)}`
                  })}{' '}
                  <Data>
                    {qty(draftDa.totalDa)} {draft.uom}
                  </Data>
                </span>
              </span>
            </label>
          ) : null}
          {refusalMsg !== null && (
            <p className="text-xs text-danger" data-testid="feedstock-refusal">
              {t(refusalMsg[0], refusalMsg[1])}
            </p>
          )}
          <div className="flex gap-2">
            <Button
              type="submit"
              variant="outline"
              disabled={refusal !== null || confirm.isPending}
              data-testid="feedstock-submit"
            >
              {t('fsConfirm.form.submit')}
            </Button>
            <Button type="button" variant="secondary" onClick={() => setDraft(null)}>
              {t('fsConfirm.form.cancel')}
            </Button>
          </div>
        </form>
      ) : null}

      <Table>
        <TableHeader>
          <TableHeaderCell>{t('fsConfirm.col.material')}</TableHeaderCell>
          <TableHeaderCell className="text-right">{t('fsConfirm.col.latest')}</TableHeaderCell>
          <TableHeaderCell>{t('fsConfirm.col.status')}</TableHeaderCell>
          {held ? <TableHeaderCell>{t('fsConfirm.col.action')}</TableHeaderCell> : null}
        </TableHeader>
        <tbody>
          {own.map((p) => {
            const state = stateOf(p.materialCode);
            return (
              <TableRow key={p.materialCode} data-testid={`feedstock-row-${p.materialCode}`}>
                <TableCell>
                  <Data className="text-xs font-bold text-text-primary">{p.materialCode}</Data>
                  <div className="text-sm text-text-primary">{p.materialLabel}</div>
                </TableCell>
                <TableCell
                  className="text-right whitespace-nowrap"
                  data-testid={`feedstock-latest-${p.materialCode}`}
                >
                  {p.feedstock ? (
                    <>
                      <Data>
                        {qty(p.feedstock.feedstockQty)} {p.feedstock.uom}
                      </Data>
                      <div className="text-xs text-text-tertiary">
                        {t('fsConfirm.asOf')} <Data>{formatDate(p.feedstock.confirmedOn)}</Data>
                      </div>
                      {SUPPLIER_DA_VIEW_ENABLED && p.feedstock.incomingDa ? (
                        <div
                          className="text-xs text-text-tertiary"
                          data-testid={`feedstock-incoming-da-${p.materialCode}`}
                        >
                          {t('fsConfirm.incomingDa.confirmed', {
                            week: `W${isoWeek(p.feedstock.incomingDa.planningWeek)}`
                          })}
                        </div>
                      ) : null}
                    </>
                  ) : (
                    <span className="text-xs text-text-tertiary">{t('fsConfirm.none')}</span>
                  )}
                </TableCell>
                <TableCell data-testid={`feedstock-status-${p.materialCode}`}>
                  {state === 'confirmed' && (
                    <StatusPill variant="success">{t('fsConfirm.status.confirmed')}</StatusPill>
                  )}
                  {state === 'due' && (
                    <StatusPill variant="warning">{t('fsConfirm.status.due')}</StatusPill>
                  )}
                  {state === 'missed' && (
                    <StatusPill variant="danger">{t('fsConfirm.status.missed')}</StatusPill>
                  )}
                </TableCell>
                {held ? (
                  <TableCell>
                    <Button
                      variant="outline"
                      onClick={() => open(p)}
                      aria-label={t('fsConfirm.confirmFor', { material: p.materialCode })}
                      data-testid={`feedstock-open-${p.materialCode}`}
                    >
                      {t('fsConfirm.confirm')}
                    </Button>
                  </TableCell>
                ) : null}
              </TableRow>
            );
          })}
        </tbody>
      </Table>
    </section>
  );
};

export default FeedstockConfirmPanel;
