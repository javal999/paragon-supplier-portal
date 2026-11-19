/** @import React from 'react' */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Table from '@components/ui-v2/Table';
import TableHeader, { TableHeaderCell } from '@components/ui-v2/TableHeader';
import TableRow from '@components/ui-v2/TableRow';
import TableCell from '@components/ui-v2/TableCell';
import Button from '@components/ui-v2/Button';
import Data from '@components/ui-v2/Data';
import { HandoffNotice } from '@components/ui-v2/HandoffNotice';
import { FIELD_FOCUS_RING, TOUCH_TARGET } from '@components/forecast/focusRing';
import { useVerbAvailability } from '@hooks/useVerbAvailability';
import { useRefusalText } from '@hooks/useRefusalText';
import { useToast } from '@hooks/useToast';
import { formatDate, formatNumber } from '@lib/format';
import { usePoOnHold } from '@services/query/hooks';
import {
  useOsipParamCommand,
  usePoCancelAcknowledgeCommand,
  usePoCancelRequestCommand,
  usePoOnHoldChooseCommand,
  usePoOnHoldSuggestCommand
} from '@services/query/commandHooks';
import { PO_ON_HOLD_OPTIONS } from '@services/transitions/poOnHold';
import { planHasNoRoom } from '@services/transitions/poOnHoldExecution';
import { osipParamRefusal } from '@services/transitions/osipParams';
import { fulfilmentWindow } from '@services/transitions/fulfilmentWindow';
/** @import { PoOnHoldRow } from '@services/data/types' */
/** @import { PoOnHoldOption } from '@services/transitions/poOnHold' */
import { inputClass, labelClass } from '../inventory/inventoryDisplay';

// ─────────────────────────────────────────────────────────────────────────────
// PO ON HOLD — PEX-7 (BL-270, BL-272), PEX-8 (BL-271), PEX-10 BR-01 for the
// decision (BL-273). One panel on the feedstock reconcile page, for both seats:
//   · the planner sees every line, sets the grace and no-movement periods
//     (`t_osipparam_set`, keys grace|<supplier>|<material> and noMove|…) and
//     suggests an option (`t_poonhold_suggest`);
//   · the supplier sees its own lines and chooses the final option
//     (`t_poonhold_choose`); the service narrows the rows to the reader.
// PEX-12 [Proposed, owner review pending]: every line also shows a read-only
// "Recommended action" (auto absorb, auto carry-over or manual) from per
// material class thresholds that are EMPTY until a planner sets them; nothing
// runs by itself. The planner can ask to cancel a PO and the supplier
// acknowledges: a request only, never sent to SAP.
// What the hub does not hold (PIPO flag, Max PTI, a stock movement) is said on
// the line, never guessed.
// ─────────────────────────────────────────────────────────────────────────────

const fieldClass = `${inputClass} ${FIELD_FOCUS_RING}`;
const note = 'block text-xs text-text-tertiary';

/** @type {React.FC<{ value: number; uom: string; testId?: string }>} */
const Qty = ({ value, uom, testId }) => (
  <Data className="whitespace-nowrap" data-testid={testId}>{`${formatNumber(value)} ${uom}`}</Data>
);

/** @type {React.FC<{ persona: 'buyer' | 'supplier' }>} */
const PoOnHoldPanel = ({ persona }) => {
  const { t } = useTranslation();
  const query = usePoOnHold();
  const isPti = persona === 'buyer';
  const refusalText = useRefusalText();
  const { toast } = useToast();
  const suggest = usePoOnHoldSuggestCommand();
  const choose = usePoOnHoldChooseCommand();
  const setParam = useOsipParamCommand();
  const suggestAvail = useVerbAvailability('poonhold:suggest');
  const chooseAvail = useVerbAvailability('poonhold:choose');
  const paramAvail = useVerbAvailability('osipparam:set');
  const [picked, setPicked] = useState(/** @type {Record<string, PoOnHoldOption>} */ ({}));
  const [editing, setEditing] = useState(/** @type {string | null} */ (null));
  const [graceDraft, setGraceDraft] = useState('');
  const [noMoveDraft, setNoMoveDraft] = useState('');
  const [pipoDraft, setPipoDraft] = useState('unset');
  const [maxPtiDraft, setMaxPtiDraft] = useState('');
  const [absorbDraft, setAbsorbDraft] = useState('');
  const [carryDraft, setCarryDraft] = useState('');
  const cancelRequest = usePoCancelRequestCommand();
  const cancelAck = usePoCancelAcknowledgeCommand();
  const cancelAvail = useVerbAvailability('pocancel:request');
  const ackAvail = useVerbAvailability('pocancel:acknowledge');
  const [cancelOpen, setCancelOpen] = useState(/** @type {string | null} */ (null));
  const [cancelReason, setCancelReason] = useState('');

  const rows = query.data?.items ?? [];
  /** @param {PoOnHoldOption} o */
  const optionName = (o) => t(`poh.opt.${o}`);

  /** @param {{ status: string; reason?: string }} result */
  const refused = (result) => {
    toast({
      variant: 'error',
      title: refusalText(result.reason) ?? t('poh.refused', { reason: result.reason ?? '' })
    });
  };

  /** @param {PoOnHoldRow} r */
  const send = async (r) => {
    const option = picked[r.key] ?? r.suggestion;
    if (!option) return;
    const result = await suggest.mutateAsync({
      supplierId: r.supplierId,
      materialCode: r.materialCode,
      option
    });
    if (result.status === 'failed') return refused(result);
    toast({ variant: 'success', title: t('poh.suggest.sent', { material: r.materialCode }) });
  };

  /** @param {PoOnHoldRow} r */
  const confirmChoice = async (r) => {
    const option = picked[r.key] ?? r.decision?.suggested;
    if (!r.decision || !option) return;
    const result = await choose.mutateAsync({ decisionId: r.decision.id, option });
    if (result.status === 'failed') return refused(result);
    toast({ variant: 'success', title: t('poh.choose.sent', { material: r.materialCode }) });
  };

  /** @param {PoOnHoldRow} r */
  const openSettings = (r) => {
    setGraceDraft(String(r.grace.graceDays));
    setNoMoveDraft(String(r.noMoveDays));
    setPipoDraft(r.pipoIsDefault ? 'unset' : r.pipo ? 'yes' : 'no');
    setMaxPtiDraft(r.maxPti === null ? '' : String(r.maxPti));
    setAbsorbDraft(r.thresholds.absorbMaxPct === null ? '' : String(r.thresholds.absorbMaxPct));
    setCarryDraft(r.thresholds.carryMaxPct === null ? '' : String(r.thresholds.carryMaxPct));
    setEditing(r.key);
  };

  const parsed = (/** @type {string} */ v) => (v.trim() === '' ? NaN : Number(v.trim()));
  const settingsInvalid =
    osipParamRefusal('grace', parsed(graceDraft)) !== null ||
    osipParamRefusal('noMove', parsed(noMoveDraft)) !== null ||
    (maxPtiDraft.trim() !== '' && osipParamRefusal('maxPti', parsed(maxPtiDraft)) !== null);
  const thresholdsInvalid =
    (absorbDraft.trim() !== '' &&
      osipParamRefusal('autoAbsorbMaxPct', parsed(absorbDraft)) !== null) ||
    (carryDraft.trim() !== '' && osipParamRefusal('autoCarryMaxPct', parsed(carryDraft)) !== null);

  /** @param {PoOnHoldRow} r */
  const saveSettings = async (r) => {
    for (const [param, draft] of /** @type {const} */ ([
      ['grace', graceDraft],
      ['noMove', noMoveDraft]
    ])) {
      const value = parsed(draft);
      const current = param === 'grace' ? r.grace.graceDays : r.noMoveDays;
      if (value === current) continue;
      const result = await setParam.mutateAsync({
        param,
        supplierId: r.supplierId,
        materialCode: r.materialCode,
        value
      });
      if (result.status === 'failed') return refused(result);
    }
    // PEX-8 FG data [Proposed]: PIPO per material, Max PTI per supplier × material.
    const pipo = pipoDraft === 'yes' ? true : pipoDraft === 'no' ? false : null;
    if (!(pipo === null ? r.pipoIsDefault : !r.pipoIsDefault && pipo === r.pipo)) {
      const result = await setParam.mutateAsync({
        param: 'pipo',
        supplierId: r.supplierId,
        materialCode: r.materialCode,
        value: pipo
      });
      if (result.status === 'failed') return refused(result);
    }
    const maxPti = maxPtiDraft.trim() === '' ? null : parsed(maxPtiDraft);
    if (maxPti !== r.maxPti) {
      const result = await setParam.mutateAsync({
        param: 'maxPti',
        supplierId: r.supplierId,
        materialCode: r.materialCode,
        value: maxPti
      });
      if (result.status === 'failed') return refused(result);
    }
    // PEX-12 [Proposed]: thresholds are per material class; empty = not set.
    if (r.materialClass) {
      for (const [param, draft, current] of /** @type {const} */ ([
        ['autoAbsorbMaxPct', absorbDraft, r.thresholds.absorbMaxPct],
        ['autoCarryMaxPct', carryDraft, r.thresholds.carryMaxPct]
      ])) {
        const value = draft.trim() === '' ? null : parsed(draft);
        if (value === current) continue;
        const result = await setParam.mutateAsync({
          param,
          materialClass: r.materialClass,
          value
        });
        if (result.status === 'failed') return refused(result);
      }
    }
    toast({ variant: 'success', title: t('poh.settings.saved', { material: r.materialCode }) });
    setEditing(null);
  };

  /** @param {PoOnHoldRow} r */
  const graceCell = (r) => (
    <>
      <span className="block text-sm" data-testid={`poh-due-${r.key}`}>
        {r.grace.ended ? (
          t('poh.graceEnded')
        ) : (
          <>
            {t('poh.dueBy')} <Data className="whitespace-nowrap">{formatDate(r.grace.dueDay)}</Data>
          </>
        )}
      </span>
      {!r.grace.ended && (
        <span className={note} data-testid={`poh-left-${r.key}`}>
          {t('poh.daysLeft', { count: r.grace.daysLeft })}
        </span>
      )}
      <span className={note}>
        {t('poh.graceStarted')} <Data>{formatDate(r.grace.firstDay)}</Data> ·{' '}
        {t('poh.settings.grace')}: <Data>{r.grace.graceDays}</Data>
        {r.graceIsDefault ? ` (${t('poh.settings.default')})` : ''}
      </span>
      {isPti && (
        <span className={note}>
          {t('poh.settings.noMove')}: <Data>{r.noMoveDays}</Data>
          {r.noMoveIsDefault ? ` (${t('poh.settings.default')})` : ''}
        </span>
      )}
      {isPti &&
        (paramAvail.kind === 'held' ? (
          editing === r.key ? (
            <div className="mt-2 space-y-2" data-testid={`poh-settings-${r.key}`}>
              <label className="block">
                <span className={labelClass}>{t('poh.settings.grace')}</span>
                <input
                  className={fieldClass}
                  inputMode="numeric"
                  value={graceDraft}
                  onChange={(e) => setGraceDraft(e.target.value)}
                  data-testid={`poh-grace-input-${r.key}`}
                />
              </label>
              <label className="block">
                <span className={labelClass}>{t('poh.settings.noMove')}</span>
                <input
                  className={fieldClass}
                  inputMode="numeric"
                  value={noMoveDraft}
                  onChange={(e) => setNoMoveDraft(e.target.value)}
                  data-testid={`poh-nomove-input-${r.key}`}
                />
              </label>
              <label className="block">
                <span className={labelClass}>{t('poh.settings.pipo')}</span>
                <select
                  className={fieldClass}
                  value={pipoDraft}
                  onChange={(e) => setPipoDraft(e.target.value)}
                  data-testid={`poh-pipo-input-${r.key}`}
                >
                  <option value="unset">{t('poh.settings.pipo.unset')}</option>
                  <option value="yes">{t('poh.settings.pipo.yes')}</option>
                  <option value="no">{t('poh.settings.pipo.no')}</option>
                </select>
              </label>
              <label className="block">
                <span className={labelClass}>{t('poh.settings.maxPti')}</span>
                <input
                  className={fieldClass}
                  inputMode="numeric"
                  value={maxPtiDraft}
                  onChange={(e) => setMaxPtiDraft(e.target.value)}
                  data-testid={`poh-maxpti-input-${r.key}`}
                />
              </label>
              {r.materialClass && (
                <fieldset className="space-y-2" data-testid={`poh-thresholds-${r.key}`}>
                  <legend className={labelClass}>
                    {t('poh.rec.thresholds', { class: r.materialClass })}
                  </legend>
                  <label className="block">
                    <span className={labelClass}>{t('poh.rec.absorbMax')}</span>
                    <input
                      className={fieldClass}
                      inputMode="numeric"
                      value={absorbDraft}
                      placeholder={t('poh.rec.thresholdsEmpty')}
                      onChange={(e) => setAbsorbDraft(e.target.value)}
                      data-testid={`poh-absorbmax-input-${r.key}`}
                      // BL-84 — the thresholds refusal is tied to both inputs.
                      aria-invalid={thresholdsInvalid || undefined}
                      aria-describedby={thresholdsInvalid ? 'poh-rec-invalid' : undefined}
                    />
                  </label>
                  <label className="block">
                    <span className={labelClass}>{t('poh.rec.carryMax')}</span>
                    <input
                      className={fieldClass}
                      inputMode="numeric"
                      value={carryDraft}
                      placeholder={t('poh.rec.thresholdsEmpty')}
                      onChange={(e) => setCarryDraft(e.target.value)}
                      data-testid={`poh-carrymax-input-${r.key}`}
                      aria-invalid={thresholdsInvalid || undefined}
                      aria-describedby={thresholdsInvalid ? 'poh-rec-invalid' : undefined}
                    />
                  </label>
                </fieldset>
              )}
              {settingsInvalid && (
                <p className="text-sm text-danger" role="alert">
                  {t('poh.settings.invalid')}
                </p>
              )}
              {thresholdsInvalid && (
                <p id="poh-rec-invalid" className="text-sm text-danger" role="alert">
                  {t('poh.rec.invalid')}
                </p>
              )}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  disabled={settingsInvalid || thresholdsInvalid || setParam.isPending}
                  onClick={() => void saveSettings(r)}
                  data-testid={`poh-settings-save-${r.key}`}
                >
                  {t('poh.settings.save')}
                </Button>
                <Button variant="secondary" onClick={() => setEditing(null)}>
                  {t('poh.settings.cancel')}
                </Button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              className={`text-xs text-action-hover hover:underline ${TOUCH_TARGET}`}
              onClick={() => openSettings(r)}
              data-testid={`poh-settings-edit-${r.key}`}
            >
              {t('poh.settings.edit')}
            </button>
          )
        ) : (
          <HandoffNotice availability={paramAvail} testId={`handoff-poh-param-${r.key}`} />
        ))}
    </>
  );

  /** What the hub does not hold, said on the line (PTI view). @param {PoOnHoldRow} r */
  const missingFacts = (r) =>
    isPti ? (
      <>
        {(r.pipo === null || r.pipoIsDefault) && (
          <span className={note} data-testid={`poh-fact-pipo-${r.key}`}>
            {t(r.pipo === null ? 'poh.fact.pipo' : 'poh.fact.pipoDefault')}
          </span>
        )}
        {r.daysSinceMovement === null && (
          <span className={note} data-testid={`poh-fact-movement-${r.key}`}>
            {t('poh.fact.movement')}
          </span>
        )}
        {r.maxPti === null && (
          <span className={note} data-testid={`poh-fact-maxpti-${r.key}`}>
            {t('poh.fact.maxPti')}
          </span>
        )}
      </>
    ) : null;

  /** @type {React.FC<{ r: PoOnHoldRow; value: PoOnHoldOption | null; onPick: (o: PoOnHoldOption) => void; legend: string }>} */
  const OptionPicker = ({ r, value, onPick, legend }) => (
    <fieldset className="space-y-1" data-testid={`poh-options-${r.key}`}>
      <legend className={labelClass}>{legend}</legend>
      {PO_ON_HOLD_OPTIONS.map((o) => (
        <label key={o} className={`flex items-start gap-2 text-sm ${TOUCH_TARGET}`}>
          <input
            type="radio"
            name={`poh-${r.key}`}
            checked={value === o}
            onChange={() => onPick(o)}
            data-testid={`poh-option-${o}-${r.key}`}
          />
          <span>
            {optionName(o)}
            <span className={note}>{t(`poh.opt.${o}.does`)}</span>
          </span>
        </label>
      ))}
    </fieldset>
  );

  /** @param {PoOnHoldRow} r */
  const outcomeLines = (r) =>
    r.outcome ? (
      <div data-testid={`poh-outcome-${r.key}`}>
        {r.outcome.feedstockQty > 0 && (
          <span className={note}>
            {t('poh.outcome.fs')} <Qty value={r.outcome.feedstockQty} uom={r.uom} />
          </span>
        )}
        {/* The whole remainder "spread over the next weeks" is the rule, not what the
            plan places (a week takes at most the room it has left, earlier rounds
            counted): it shows only when there is no plan to contradict. */}
        {r.outcome.spreadQty > 0 && !r.execution.plan && !r.execution.record && (
          <span className={note}>
            {t('poh.outcome.spread')} <Qty value={r.outcome.spreadQty} uom={r.uom} />
          </span>
        )}
        {r.effective === 'fg' && (
          <>
            <span className={note}>
              {t('poh.outcome.fg')} <Qty value={r.outcome.fgQty} uom={r.uom} />
            </span>
            <span className={note}>
              {t('poh.outcome.stay')} <Qty value={r.outcome.stayOnHoldQty} uom={r.uom} />
            </span>
          </>
        )}
      </div>
    ) : null;

  /** The fulfil-by line on the decision (PEX-10 BR-01): from the supplier's choice. @param {PoOnHoldRow} r */
  const fulfilBy = (r) => {
    const chosen = r.decision?.history.find((h) => h.kind === 'chosen');
    if (!chosen) return null;
    const w = fulfilmentWindow(chosen.at, r.leadTimeDays);
    return (
      <span className={note} data-testid={`poh-fulfil-${r.key}`}>
        {w ? (
          <>
            {t('co.sla.fulfilBy')} <Data className="whitespace-nowrap">{formatDate(w.by)}</Data>{' '}
            {t(r.leadTimeIsDefault ? 'co.sla.leadTimeDefault' : 'co.sla.leadTime', {
              count: w.leadTimeDays
            })}
          </>
        ) : (
          t('co.sla.noLeadTime')
        )}
      </span>
    );
  };

  /**
   * PEX-8 BR-02/BR-05 — the end of the grace period: "scheduled for <date>"
   * before it, "executed" with what was created after it. The planner also
   * reads what it would do now (read only).
   * @param {PoOnHoldRow} r
   */
  const execView = (r) => {
    const ex = r.execution;
    if (!r.decision) return null;
    const plan = ex.plan;
    const planLines = plan ? (
      <>
        {plan.callOffs.map((c) => (
          <span
            key={`${c.lineId}-${c.week ?? 'fs'}`}
            className={note}
            data-testid={`poh-exec-calloff-${r.key}`}
          >
            {t('poh.exec.callOff')} <Qty value={c.qty} uom={r.uom} /> · {t('poh.exec.needBy')}{' '}
            <Data className="whitespace-nowrap">{formatDate(c.needDate)}</Data>
            {c.week ? (
              <>
                {' '}
                · {t('poh.exec.weekOf')} <Data>{formatDate(c.week)}</Data>
              </>
            ) : null}
          </span>
        ))}
        {plan.absorbed.map((a) => (
          <span key={a.lineId} className={note} data-testid={`poh-exec-absorbed-${r.key}`}>
            {t('poh.exec.absorbed')} <Data>{a.poNumber}</Data>: <Qty value={a.qty} uom={r.uom} />
          </span>
        ))}
        {plan.callOffs.length === 0 &&
          plan.absorbed.length === 0 &&
          (planHasNoRoom(plan) ? (
            // A round with no room left says so: earlier rounds already filled the
            // weeks (FS + spread) or the FG cap. It still runs and places 0.
            <span className={note} data-testid={`poh-exec-noroom-${r.key}`}>
              {t(`poh.exec.noRoom.${plan.option}`)}
            </span>
          ) : (
            <span className={note}>{t('poh.exec.nothing')}</span>
          ))}
        {plan.stayOnHoldQty > 0 && (
          <span className={note} data-testid={`poh-exec-stays-${r.key}`}>
            {t('poh.exec.stays')} <Qty value={plan.stayOnHoldQty} uom={r.uom} />
          </span>
        )}
      </>
    ) : null;
    if (ex.status === 'executed' && ex.record) {
      return (
        <div className="mt-1" data-testid={`poh-exec-${r.key}`} data-exec="executed">
          <span className="block text-sm">
            {t('poh.exec.executed')}{' '}
            <Data className="whitespace-nowrap">{formatDate(ex.record.at)}</Data>{' '}
            {t('poh.exec.bySystem')}
            {ex.record.standing === 'noSupplierResponse'
              ? ` (${t('poh.exec.noSupplierResponse')})`
              : ''}
            {ex.record.callOffIds.length > 0 ? (
              <>
                {' · '}
                {t('poh.exec.created')} <Data>{ex.record.callOffIds.length}</Data>{' '}
                {t('poh.exec.callOffs')}
              </>
            ) : null}
          </span>
          {planLines}
        </div>
      );
    }
    return (
      <div className="mt-1" data-testid={`poh-exec-${r.key}`} data-exec={ex.status}>
        {ex.status === 'blocked' && plan?.blocked ? (
          <span className="block text-sm">{t(`poh.exec.blocked.${plan.blocked}`)}</span>
        ) : (
          <span className="block text-sm">
            {t('poh.exec.scheduled')}{' '}
            <Data className="whitespace-nowrap">{formatDate(ex.runsOn)}</Data>
          </span>
        )}
        {isPti && plan && (
          <div data-testid={`poh-exec-preview-${r.key}`}>
            <span className={`${note} font-medium`}>{t('poh.exec.preview')}</span>
            {planLines}
          </div>
        )}
      </div>
    );
  };

  /**
   * PEX-12 [Proposed] — the read-only recommended action with its reason.
   * @param {PoOnHoldRow} r
   */
  const recView = (r) => {
    if (r.closed) return null;
    const rec = r.recommendation;
    const limit =
      rec.action === 'autoCarryOver' ? r.thresholds.carryMaxPct : r.thresholds.absorbMaxPct;
    return (
      <div className="mt-1" data-testid={`poh-rec-${r.key}`} data-action={rec.action}>
        <span className="block text-sm">
          <span className="font-medium">{t('poh.rec.title')}:</span>{' '}
          {t(`poh.rec.action.${rec.action}`)}
          {': '}
          {t(`poh.rec.reason.${rec.reason}`, {
            pct: rec.sharePct === null ? '' : Math.round(rec.sharePct * 10) / 10,
            limit: limit ?? ''
          })}
        </span>
        <span className={note}>{t('poh.rec.proposed')}</span>
      </div>
    );
  };

  /**
   * PEX-12 [Proposed] — PO cancellation: the planner requests, the supplier
   * acknowledges. A request only, not sent to SAP.
   * @param {PoOnHoldRow} r
   */
  const cancelView = (r) => {
    if (r.closed || r.cancellations.length === 0) return null;
    const items = r.cancellations.filter((c) => isPti || c.request);
    if (items.length === 0) return null;
    return (
      <div className="mt-2" data-testid={`poh-cancel-${r.key}`}>
        <span className={`${note} font-medium`}>{t('poh.cancel.title')}</span>
        <span className={note}>{t('poh.cancel.proposed')}</span>
        {items.map((c) => {
          const rq = c.request;
          const requestedAt = rq?.history[0]?.at;
          const ackAt = rq?.history.find((h) => h.kind === 'acknowledged')?.at;
          return (
            <div key={c.poId} className="mt-1" data-testid={`poh-cancel-po-${c.poId}`}>
              <Data className="text-sm">{c.poNumber}</Data>
              {rq && rq.state === 'Requested' && (
                <>
                  <span className="block text-sm">
                    {t('poh.cancel.requested', { date: formatDate(requestedAt ?? '') })}
                  </span>
                  <span className={note}>{rq.history[0]?.reason}</span>
                  {!isPti &&
                    (ackAvail.kind === 'held' ? (
                      <Button
                        variant="outline"
                        disabled={cancelAck.isPending}
                        onClick={async () => {
                          const result = await cancelAck.mutateAsync({ requestId: rq.id });
                          if (result.status === 'failed') return refused(result);
                          toast({
                            variant: 'success',
                            title: t('poh.cancel.acked', { po: c.poNumber })
                          });
                        }}
                        data-testid={`poh-cancel-ack-${c.poId}`}
                      >
                        {t('poh.cancel.ack')}
                      </Button>
                    ) : (
                      <HandoffNotice availability={ackAvail} testId={`handoff-poh-ack-${c.poId}`} />
                    ))}
                </>
              )}
              {rq && rq.state === 'Acknowledged' && (
                <span className="block text-sm" data-testid={`poh-cancel-acked-${c.poId}`}>
                  {t('poh.cancel.acknowledged', { date: formatDate(ackAt ?? '') })}
                </span>
              )}
              {isPti &&
                (!rq || rq.state === 'Acknowledged') &&
                (cancelAvail.kind === 'held' ? (
                  cancelOpen === c.poId ? (
                    <div className="mt-1 space-y-2">
                      <label className="block">
                        <span className={labelClass}>{t('poh.cancel.reason')}</span>
                        <input
                          className={fieldClass}
                          value={cancelReason}
                          onChange={(e) => setCancelReason(e.target.value)}
                          data-testid={`poh-cancel-reason-${c.poId}`}
                        />
                      </label>
                      <Button
                        variant="outline"
                        disabled={cancelRequest.isPending}
                        onClick={async () => {
                          const result = await cancelRequest.mutateAsync({
                            supplierId: r.supplierId,
                            poId: c.poId,
                            reason: cancelReason
                          });
                          if (result.status === 'failed') return refused(result);
                          toast({
                            variant: 'success',
                            title: t('poh.cancel.sent', { po: c.poNumber })
                          });
                          setCancelOpen(null);
                          setCancelReason('');
                        }}
                        data-testid={`poh-cancel-send-${c.poId}`}
                      >
                        {t('poh.cancel.send')}
                      </Button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className={`block text-xs text-action-hover hover:underline ${TOUCH_TARGET}`}
                      onClick={() => {
                        setCancelOpen(c.poId);
                        setCancelReason('');
                      }}
                      data-testid={`poh-cancel-open-${c.poId}`}
                    >
                      {t('poh.cancel.request')}
                    </button>
                  )
                ) : (
                  <HandoffNotice
                    availability={cancelAvail}
                    testId={`handoff-poh-cancel-${c.poId}`}
                  />
                ))}
            </div>
          );
        })}
      </div>
    );
  };

  /** @param {PoOnHoldRow} r */
  const decisionCell = (r) => {
    const status = (
      <span className="block text-sm" data-testid={`poh-status-${r.key}`} data-status={r.status}>
        {t(`poh.status.${r.status}`, {
          option: optionName(r.effective ?? r.decision?.suggested ?? 'fsOnly')
        })}
        {r.round > 1 ? ` · ${t('poh.round', { round: r.round })}` : ''}
      </span>
    );
    if (isPti) {
      // [Proposed] "Suggest again": an executed decision that left a remainder
      // on hold shows the picker again, with the hub's fresh suggestion.
      const again = r.decision !== null && r.execution.status === 'executed' && !r.closed;
      if (r.decision && !again) {
        return (
          <>
            {status}
            {execView(r)}
            {outcomeLines(r)}
            {fulfilBy(r)}
          </>
        );
      }
      const value = picked[r.key] ?? r.suggestion;
      return (
        <>
          {again ? execView(r) : status}
          {again ? (
            <span className={note} data-testid={`poh-again-${r.key}`}>
              {t('poh.again.note', { round: r.round + 1 })}
            </span>
          ) : null}
          {suggestAvail.kind === 'held' ? (
            <div className="mt-2 space-y-2">
              <OptionPicker
                r={r}
                value={value}
                onPick={(o) => setPicked((p) => ({ ...p, [r.key]: o }))}
                legend={t('poh.suggest.label')}
              />
              {/* BL-323 — the room the picked option has left, said before the
                  send: the same line the preview and the executed rows show, from
                  the read model's one `planHasNoRoom` judgement. It informs; it
                  does not block. */}
              {value && r.noRoomByOption[value] ? (
                <span className={note} data-testid={`poh-presend-noroom-${r.key}`}>
                  {t(`poh.exec.noRoom.${value}`)}
                </span>
              ) : null}
              <span className={note} data-testid={`poh-preselect-${r.key}`}>
                {t(r.suggestion ? 'poh.suggest.preselected' : 'poh.suggest.none')}
              </span>
              <Button
                variant="outline"
                disabled={!value || suggest.isPending}
                onClick={() => void send(r)}
                data-testid={`poh-suggest-send-${r.key}`}
              >
                {t(again ? 'poh.again.send' : 'poh.suggest.send')}
              </Button>
            </div>
          ) : (
            <HandoffNotice availability={suggestAvail} testId={`handoff-poh-suggest-${r.key}`} />
          )}
          {missingFacts(r)}
        </>
      );
    }
    // Supplier view.
    if (!r.decision) {
      return <span className="block text-sm">{t('poh.choose.waiting')}</span>;
    }
    if (r.status !== 'awaitingSupplier') {
      return (
        <>
          {status}
          {execView(r)}
          {outcomeLines(r)}
          {fulfilBy(r)}
        </>
      );
    }
    const value = picked[r.key] ?? r.decision.suggested;
    return (
      <>
        {status}
        {execView(r)}
        {chooseAvail.kind === 'held' ? (
          <div className="mt-2 space-y-2">
            <OptionPicker
              r={r}
              value={value}
              onPick={(o) => setPicked((p) => ({ ...p, [r.key]: o }))}
              legend={t('poh.choose.label')}
            />
            <span className={note}>{t('poh.choose.final')}</span>
            <Button
              variant="outline"
              disabled={choose.isPending}
              onClick={() => void confirmChoice(r)}
              data-testid={`poh-choose-send-${r.key}`}
            >
              {t('poh.choose.send')}
            </Button>
          </div>
        ) : (
          <HandoffNotice availability={chooseAvail} testId={`handoff-poh-choose-${r.key}`} />
        )}
      </>
    );
  };

  if (query.isPending || query.isError) return null;

  return (
    <section className="mb-6" data-testid="poh-panel">
      <h2 className="text-section text-text-primary mb-1">{t('poh.title')}</h2>
      <p className="text-sm text-text-secondary mb-3">
        {t(isPti ? 'poh.intro.pti' : 'poh.intro.sup')}
      </p>
      <div className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm overflow-x-auto">
        <Table>
          <TableHeader>
            {isPti ? <TableHeaderCell>{t('poh.col.supplier')}</TableHeaderCell> : null}
            <TableHeaderCell>{t('poh.col.material')}</TableHeaderCell>
            <TableHeaderCell>{t('poh.col.ospo')}</TableHeaderCell>
            <TableHeaderCell>{t('poh.col.da')}</TableHeaderCell>
            <TableHeaderCell>{t('poh.col.qty')}</TableHeaderCell>
            <TableHeaderCell>{t('poh.col.grace')}</TableHeaderCell>
            <TableHeaderCell>{t('poh.col.decision')}</TableHeaderCell>
          </TableHeader>
          <tbody>
            {rows.map((r) => (
              <TableRow
                key={r.key}
                id={`poh-row-${r.key}`}
                tabIndex={-1}
                data-testid={`poh-row-${r.key}`}
              >
                {isPti ? (
                  <TableCell className="align-top max-w-[11rem]">
                    <span className="block text-sm text-text-primary">{r.supplierName}</span>
                    <Data className="text-xs text-text-tertiary">{r.supplierId}</Data>
                  </TableCell>
                ) : null}
                <TableCell className="align-top max-w-[10rem]">
                  <Data className="whitespace-nowrap">{r.materialCode}</Data>
                  <span className={note}>{r.materialLabel}</span>
                </TableCell>
                <TableCell className="align-top">
                  <Qty value={r.ospo} uom={r.uom} testId={`poh-ospo-${r.key}`} />
                </TableCell>
                <TableCell className="align-top">
                  <Qty value={r.daNotCalledOff} uom={r.uom} testId={`poh-da-${r.key}`} />
                  {/* BL-324 (owner, 2026-11-19) — the cell keeps the decision-4
                      reading; the note says what it leaves out, so it does not
                      read as a contradiction of the week's room. */}
                  <span className={note} data-testid={`poh-da-note-${r.key}`}>
                    {t('poh.da.note')}
                  </span>
                </TableCell>
                <TableCell className="align-top">
                  <Qty value={r.qty} uom={r.uom} testId={`poh-qty-${r.key}`} />
                </TableCell>
                <TableCell className="align-top max-w-[16rem]">{graceCell(r)}</TableCell>
                <TableCell className="align-top max-w-[22rem]">
                  {decisionCell(r)}
                  {recView(r)}
                  {cancelView(r)}
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={isPti ? 7 : 6}
                  className="text-center text-sm text-text-tertiary py-8"
                  data-testid="poh-empty"
                >
                  {t('poh.empty')}
                </td>
              </tr>
            )}
          </tbody>
        </Table>
      </div>
    </section>
  );
};

export default PoOnHoldPanel;
