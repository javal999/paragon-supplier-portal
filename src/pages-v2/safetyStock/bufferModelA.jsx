/** @import React from 'react' */
/** @import { OsipSupplierInput } from '@services/transitions/osipSafetyRules' */
/** @import { OsipRopFigures } from '@services/transitions/osipRopRules' */
/** @import { OsipParam } from '@services/transitions/osipParams' */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Button from '@components/ui-v2/Button';
import Data from '@components/ui-v2/Data';
import StatusPill from '@components/ui-v2/StatusPill';
import { HandoffNotice } from '@components/ui-v2/HandoffNotice';
import { TermInfo } from '@components/ui-v2/TermLabel';
import { useVerbAvailability } from '@hooks/useVerbAvailability';
import { useToast } from '@hooks/useToast';
import { useRefusalText } from '@hooks/useRefusalText';
import { formatDate, formatNumber } from '@lib/format';
import { useOsipParamCommand } from '@services/query/commandHooks';
import { SWITCH_REASON_MIN_LENGTH, osipReasonRefusal } from '@services/transitions/osipParams';
import { COVER_WEEKS_MAX, COVER_WEEKS_MIN } from '@services/transitions/bufferModelA';
import { qtyOf } from '../materialPlan/planDisplay';

// ─────────────────────────────────────────────────────────────────────────────
// PSC-4 (BL-339) — MODEL A ON SAFETY STOCK TARGETS: the three buffers, the one
// cover setting P and the Material Buffer's event window.
//
//   · Protection Buffer (BR-03): max(0, AVG(LTP B) − AVG(LTP A)) × P over the
//     lead-time weeks.
//   · Strategic Buffer (BR-04, BR-05): the festive component (Σ max(0, LTP
//     Festive − LTP A)) plus the Material Buffer (its own coverage weeks × the
//     average weekly LTP A over them).
//   · Strategic total (BR-06), and ROP Order's components, each added once.
//   · TWO settings (owner ruling 2026-11-19): the Protection cover setting P
//     (default 4) and the Material Buffer's own coverage weeks (default 2).
//     Both, and the switch override (BR-07, reason required), are
//     `t_osipparam_set` writes; the window itself is ADM's event calendar.
// Every figure is the read's (`osipRops` → `bufferModelA`); none is computed
// here. A buffer whose input is missing reads "Not available" (BR-08).
// ─────────────────────────────────────────────────────────────────────────────

const INPUT_CLASS = 'w-24 px-2 py-1 text-sm border border-border-subtle rounded-md bg-white';

/** A quantity, or the "Not available" sentence for a buffer with no input. */
/**
 * @type {React.FC<{ value: number | null; uom: string; testId: string }>}
 */
const Qty = ({ value, uom, testId }) => {
  const { t } = useTranslation();
  return value === null ? (
    <span className="text-xs text-text-tertiary" data-testid={testId}>
      {t('sst.buffers.notAvailable')}
    </span>
  ) : (
    <Data data-testid={testId}>{`${qtyOf(value, /** @type {any} */ (uom))} ${uom}`}</Data>
  );
};

/**
 * PSC-4 (owner ruling 2026-11-19) — one of the two per-material week settings:
 * the Protection cover setting P, or the Material Buffer's own coverage weeks.
 * @type {React.FC<{
 *   id: 'cover' | 'coverage';
 *   value: number;
 *   held: boolean;
 *   busy: boolean;
 *   onSave: (value: number) => Promise<boolean>;
 * }>}
 */
const WeeksSetting = ({ id, value, held, busy, onSave }) => {
  const { t } = useTranslation();
  const [text, setText] = useState(String(value));
  const parsed = text.trim() === '' ? Number.NaN : Number(text);
  const valid = Number.isInteger(parsed) && parsed >= COVER_WEEKS_MIN && parsed <= COVER_WEEKS_MAX;
  const changed = valid && parsed !== value;
  const inputId = `sst-${id}-weeks`;
  return (
    <div className="flex items-end gap-2" data-testid={`sst-${id}-setting`}>
      <div>
        <label htmlFor={inputId} className="block text-label text-text-tertiary uppercase mb-1">
          {t(`sst.buffers.${id}.label`)}
        </label>
        <input
          id={inputId}
          data-testid={inputId}
          type="number"
          min={COVER_WEEKS_MIN}
          max={COVER_WEEKS_MAX}
          step={1}
          className={INPUT_CLASS}
          value={text}
          disabled={!held || busy}
          onChange={(e) => setText(e.target.value)}
        />
      </div>
      {held ? (
        <Button
          variant="outline"
          data-testid={`sst-${id}-save`}
          disabled={!changed || busy}
          onClick={() => void onSave(parsed)}
        >
          {t('sst.buffers.weeks.save')}
        </Button>
      ) : null}
      <p className="text-xs text-text-tertiary max-w-sm">{t(`sst.buffers.${id}.hint`)}</p>
    </div>
  );
};

/**
 * PSC-4 BR-07 — the Material Buffer switch: what the calendar says this week,
 * and the planner's override (which persists until it is cleared).
 * @type {React.FC<{
 *   current: boolean;
 *   source: 'calendar' | 'override' | undefined;
 *   eventWindow: OsipSupplierInput['eventWindow'];
 *   held: boolean;
 *   busy: boolean;
 *   onSave: (value: boolean | null, reason: string) => Promise<boolean>;
 * }>}
 */
const SwitchOverride = ({ current, source, eventWindow, held, busy, onSave }) => {
  const { t } = useTranslation();
  const [pick, setPick] = useState(current ? 'on' : 'off');
  const [reason, setReason] = useState('');
  const next = pick === 'calendar' ? null : pick === 'on';
  const changed = next !== (source === 'override' ? current : null);
  const refusal = osipReasonRefusal('materialBufferOn', reason);
  return (
    <div className="mt-2" data-testid="sst-material-switch">
      <p className="text-sm text-text-primary" data-testid="sst-material-switch-state">
        {t('sst.buffers.switch.title')}{' '}
        <StatusPill variant={current ? 'success' : 'neutral'}>
          {t(current ? 'sst.buffers.switch.on' : 'sst.buffers.switch.off')}
        </StatusPill>{' '}
        <span className="text-xs text-text-tertiary" data-testid="sst-material-switch-source">
          {t(
            source === 'override'
              ? 'sst.buffers.switch.fromOverride'
              : 'sst.buffers.switch.fromCalendar'
          )}
        </span>
      </p>
      <p className="text-xs text-text-secondary mt-1" data-testid="sst-event-window">
        {eventWindow
          ? t(`sst.buffers.window.${eventWindow.kind}`, {
              from: formatDate(eventWindow.startsOn),
              to: formatDate(eventWindow.endsOn)
            })
          : t('sst.buffers.window.none')}
      </p>
      {held ? (
        <div className="mt-2 flex flex-wrap items-end gap-3">
          <div>
            <label
              htmlFor="sst-material-pick"
              className="block text-label text-text-tertiary uppercase mb-1"
            >
              {t('sst.buffers.switch.override')}
            </label>
            <select
              id="sst-material-pick"
              data-testid="sst-material-pick"
              className="px-2 py-1 text-sm border border-border-subtle rounded-md bg-white"
              value={pick}
              disabled={busy}
              onChange={(e) => setPick(e.target.value)}
            >
              <option value="calendar">{t('sst.buffers.switch.followCalendar')}</option>
              <option value="on">{t('sst.buffers.switch.forceOn')}</option>
              <option value="off">{t('sst.buffers.switch.forceOff')}</option>
            </select>
          </div>
          {changed ? (
            <div className="flex-1 min-w-64">
              <label
                htmlFor="sst-material-reason"
                className="block text-label text-text-tertiary uppercase mb-1"
              >
                {t('sst.buffers.switch.reason')}
              </label>
              <textarea
                id="sst-material-reason"
                data-testid="sst-material-reason"
                rows={2}
                className="w-full px-2 py-1 text-sm border border-border-subtle rounded-md bg-white"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
              <p className="text-xs text-text-tertiary mt-1">
                {t('sst.buffers.switch.reasonHint', { min: SWITCH_REASON_MIN_LENGTH })}
              </p>
              <Button
                variant="outline"
                className="mt-2"
                data-testid="sst-material-save"
                disabled={refusal !== null || busy}
                onClick={() =>
                  void onSave(next, reason.trim()).then((ok) => {
                    if (ok) setReason('');
                  })
                }
              >
                {t('sst.buffers.switch.save')}
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
};

/**
 * @type {React.FC<{ materialCode: string; uom: string; suppliers: readonly OsipSupplierInput[]; figures: readonly OsipRopFigures[] }>}
 */
const BufferModelAPanel = ({ materialCode, uom, suppliers, figures }) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const refusalText = useRefusalText();
  const command = useOsipParamCommand();
  const availability = useVerbAvailability('osipparam:set');
  const held = availability.kind === 'held';
  const first = figures[0];
  if (!first) return null;

  /**
   * @param {OsipParam} param
   * @param {number | boolean | null} value
   * @param {string} [reason]
   * @returns {Promise<boolean>}
   */
  const save = async (param, value, reason) => {
    try {
      const res = await command.mutateAsync({
        param,
        materialCode,
        value,
        ...(reason ? { reason } : {})
      });
      if (res.status === 'failed') {
        toast({
          variant: 'warning',
          title: t('sst.buffers.refused'),
          description: refusalText(res.reason) ?? res.reason ?? ''
        });
        return false;
      }
      toast({ variant: 'success', title: t(`sst.buffers.saved.${param}`) });
      return true;
    } catch {
      toast({ variant: 'error', title: t('sst.buffers.refused') });
      return false;
    }
  };

  return (
    <div className="mt-4" data-testid="sst-buffers">
      <h3 className="text-sm font-semibold text-text-primary mb-1">{t('sst.buffers.title')}</h3>
      <p className="text-xs text-text-tertiary mb-3">{t('sst.buffers.intro')}</p>
      {!held && <HandoffNotice availability={availability} testId="handoff-cover-setting" />}
      <div className="flex flex-wrap gap-6">
        <WeeksSetting
          key={`cover-${first.buffers.coverWeeks}`}
          id="cover"
          value={first.buffers.coverWeeks}
          held={held}
          busy={command.isPending}
          onSave={(v) => save('coverWeeks', v)}
        />
        <WeeksSetting
          key={`coverage-${first.buffers.coverageWeeks}`}
          id="coverage"
          value={first.buffers.coverageWeeks}
          held={held}
          busy={command.isPending}
          onSave={(v) => save('coverageWeeks', v)}
        />
      </div>
      <SwitchOverride
        current={first.buffers.materialOn}
        source={suppliers[0]?.materialBufferSource}
        eventWindow={suppliers[0]?.eventWindow}
        held={held}
        busy={command.isPending}
        onSave={(v, reason) => save('materialBufferOn', v, reason)}
      />
      <div className="overflow-x-auto mt-3">
        <table className="text-sm" data-testid="sst-buffers-table">
          <thead>
            <tr>
              <th
                scope="col"
                className="text-left text-xs font-medium text-text-tertiary uppercase py-1 pr-4"
              >
                {t('sst.buffers.col.supplier')}
              </th>
              <th
                scope="col"
                className="text-right text-xs font-medium text-text-tertiary uppercase py-1 pr-4"
              >
                {t('sst.buffers.col.protection')} <TermInfo term="protectionBuffer" />
              </th>
              <th
                scope="col"
                className="text-right text-xs font-medium text-text-tertiary uppercase py-1 pr-4"
              >
                {t('sst.buffers.col.festive')} <TermInfo term="strategicBuffer" />
              </th>
              <th
                scope="col"
                className="text-right text-xs font-medium text-text-tertiary uppercase py-1 pr-4"
              >
                {t('sst.buffers.col.material')} <TermInfo term="materialBuffer" />
              </th>
              <th
                scope="col"
                className="text-right text-xs font-medium text-text-tertiary uppercase py-1 pr-4"
              >
                {t('sst.buffers.col.strategic')}
              </th>
              <th
                scope="col"
                className="text-right text-xs font-medium text-text-tertiary uppercase py-1"
              >
                {t('sst.buffers.col.ropOrder')}
              </th>
            </tr>
          </thead>
          <tbody>
            {figures.map((f, i) => {
              const s = suppliers[i];
              const b = f.buffers;
              const id = `sst-buffers-${s.supplierId}`;
              return (
                <tr key={s.supplierId} className="border-t border-border-subtle align-top">
                  <td className="py-2 pr-4">
                    <div className="text-sm text-text-primary">{s.supplierName}</div>
                    <div className="text-xs text-text-tertiary">
                      {t('sst.buffers.leadTime', { weeks: s.leadTimeWeeks })}
                    </div>
                  </td>
                  <td className="py-2 pr-4 text-right">
                    <Qty value={b.protection.value} uom={uom} testId={`${id}-protection`} />
                    {b.protection.value !== null && b.protection.difference !== null ? (
                      <div
                        className="text-xs text-text-tertiary"
                        data-testid={`${id}-protection-basis`}
                      >
                        {t('sst.buffers.protectionBasis', {
                          b: formatNumber(Math.round(b.protection.avgB ?? 0)),
                          a: formatNumber(Math.round(b.protection.avgA ?? 0)),
                          p: b.coverWeeks
                        })}
                      </div>
                    ) : null}
                  </td>
                  <td className="py-2 pr-4 text-right">
                    <Qty value={b.festive.value} uom={uom} testId={`${id}-festive`} />
                  </td>
                  <td className="py-2 pr-4 text-right">
                    <Qty value={b.material.value} uom={uom} testId={`${id}-material`} />
                    {b.material.value !== null ? (
                      <div
                        className="text-xs text-text-tertiary"
                        data-testid={`${id}-material-basis`}
                      >
                        {t('sst.buffers.materialBasis', {
                          p: b.coverageWeeks,
                          avg: formatNumber(Math.round(b.material.average ?? 0))
                        })}
                      </div>
                    ) : null}
                    {!b.materialOn ? (
                      <div
                        className="text-xs text-text-tertiary"
                        data-testid={`${id}-material-off`}
                      >
                        {t('sst.buffers.materialOff')}
                      </div>
                    ) : null}
                  </td>
                  <td className="py-2 pr-4 text-right">
                    <Qty value={b.strategic.value} uom={uom} testId={`${id}-strategic`} />
                    {b.strategic.missing.length > 0 ? (
                      <div
                        className="text-xs text-text-tertiary"
                        data-testid={`${id}-strategic-missing`}
                      >
                        {t('sst.buffers.missing', {
                          parts: b.strategic.missing
                            .map((m) => t(`sst.buffers.col.${m}`))
                            .join(', ')
                        })}
                      </div>
                    ) : null}
                  </td>
                  <td className="py-2 text-right">
                    <Qty value={f.ropOrder.value} uom={uom} testId={`${id}-rop-order`} />
                    {f.ropOrder.value !== null ? (
                      <div className="text-xs text-text-tertiary" data-testid={`${id}-rop-parts`}>
                        {t('sst.buffers.ropParts', {
                          cycle: formatNumber(f.ropOrder.cycleStock ?? 0),
                          protection: formatNumber(f.ropOrder.protection ?? 0),
                          strategic: formatNumber(f.ropOrder.strategic ?? 0)
                        })}
                      </div>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-text-tertiary mt-2" data-testid="sst-buffers-definitions">
        {t('sst.buffers.definitions')}
      </p>
    </div>
  );
};

export default BufferModelAPanel;
