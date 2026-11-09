/** @import React from 'react' */
/** @import { MaterialOsipInputs, OsipSupplierInput } from '@services/transitions/osipSafetyRules' */
/** @import { OsipParam } from '@services/transitions/osipParams' */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import TermLabel from '@components/ui-v2/TermLabel';
import Button from '@components/ui-v2/Button';
import { HandoffNotice } from '@components/ui-v2/HandoffNotice';
import { useVerbAvailability } from '@hooks/useVerbAvailability';
import { useToast } from '@hooks/useToast';
import { useRefusalText } from '@hooks/useRefusalText';
import { formatNumber } from '@lib/format';
import { useOsipParamCommand } from '@services/query/commandHooks';
import { OSIP_RULES } from '@services/transitions/osipRules';
import {
  SWITCH_REASON_MIN_LENGTH,
  cycleDaysOf,
  osipParamRefusal,
  osipReasonRefusal
} from '@services/transitions/osipParams';

// ─────────────────────────────────────────────────────────────────────────────
// Team answers 2026-10-28 (B3, B6, B7, B10, E2), owner ruling 2026-10-28 — the
// OSIP values a planner sets, in the material's detail panel:
//   · per material: Z (service-level factor, default 1.65; SAP's service-level
//     master data should feed it later) and g (fixed safety days, default 1;
//     owners Logistics Operations for ROP Fisik, Supply Sustainability for
//     ROP Order);
//   · per supplier: f (the ROP Fisik replenishment cycle, default by supply
//     area) and the pull agreement (daily confirmation, default no);
//   · per supplier × material: the bottleneck production lead time, queueing
//     included, that ROP Supplier reads (no default).
// An empty field resets the value to its default. Every save fires
// `t_osipparam_set`; the page re-reads and every OSIP figure follows. The
// form is gated on the MODE (§84): a seat without `osipparam:set` reads the
// values and is told whose act it is.
// ─────────────────────────────────────────────────────────────────────────────

/** BL-233 — the glossary term each per-supplier value column is labelled by. */
const VALUE_COLUMN_TERM = /** @type {const} */ ({
  f: 'replenishmentCycle',
  pull: 'pullAgreement',
  bottleneck: 'bottleneckLeadTime'
});

const INPUT_CLASS = 'w-24 px-2 py-1 text-sm border border-border-subtle rounded-md bg-white';

/**
 * A field's text as the verb's value: empty → null (the default), else a number.
 * @param {string} text
 * @returns {number | null}
 */
const valueOf = (text) => (text.trim() === '' ? null : Number(text));

/** @param {number | null | undefined} v */
const textOf = (v) => (typeof v === 'number' ? String(v) : '');

/**
 * One editable number with its save button.
 * @type {React.FC<{
 *   id: string;
 *   label: string;
 *   param: OsipParam;
 *   current: number | null;
 *   placeholder: string;
 *   held: boolean;
 *   onSave: (value: number | null) => Promise<boolean>;
 *   busy: boolean;
 * }>}
 */
const NumberValue = ({ id, label, param, current, placeholder, held, onSave, busy }) => {
  const { t } = useTranslation();
  const [text, setText] = useState(textOf(current));
  const value = valueOf(text);
  const refusal =
    text.trim() !== '' && Number.isNaN(value) ? 'NaN' : osipParamRefusal(param, value);
  const changed = value !== (current ?? null);
  return (
    <div className="flex items-end gap-2">
      <div>
        <label htmlFor={id} className="block text-label text-text-tertiary uppercase mb-1">
          {label}
        </label>
        <input
          id={id}
          data-testid={id}
          type="number"
          step="any"
          className={INPUT_CLASS}
          value={text}
          placeholder={placeholder}
          disabled={!held}
          onChange={(e) => setText(e.target.value)}
        />
      </div>
      {held ? (
        <Button
          variant="outline"
          onClick={() => void onSave(value)}
          disabled={!changed || refusal !== null || busy}
          data-testid={`${id}-save`}
        >
          {t(value === null && current !== null ? 'sst.values.reset' : 'sst.values.save')}
        </Button>
      ) : null}
    </div>
  );
};

/**
 * PEX-13 (BL-275) — one per-material switch with its required reason.
 * @type {React.FC<{
 *   id: string;
 *   param: 'safetyStockOn' | 'protectionBufferOn';
 *   on: boolean;
 *   note?: { reason: string | null; setAt: string; on: boolean };
 *   held: boolean;
 *   busy: boolean;
 *   onSave: (on: boolean, reason: string) => Promise<boolean>;
 * }>}
 */
const SwitchValue = ({ id, param, on, note, held, busy, onSave }) => {
  const { t } = useTranslation();
  const [next, setNext] = useState(on);
  const [reason, setReason] = useState('');
  const changed = next !== on;
  const refusal = osipReasonRefusal(param, reason);
  return (
    <fieldset className="border border-border-subtle rounded-md p-3 min-w-64">
      <legend className="px-1 text-sm font-medium text-text-primary">
        {t(`pex.switch.${param}`)}
      </legend>
      <label className="inline-flex items-center gap-2">
        <input
          type="checkbox"
          data-testid={`${id}-toggle`}
          checked={next}
          disabled={!held || busy}
          onChange={(e) => setNext(e.target.checked)}
        />
        <span className="text-sm" data-testid={`${id}-state`}>
          {t(on ? 'pex.switch.on' : 'pex.switch.off')}
        </span>
      </label>
      {held && changed ? (
        <div className="mt-2">
          <label
            htmlFor={`${id}-reason`}
            className="block text-label text-text-tertiary uppercase mb-1"
          >
            {t('pex.switch.reason')}
          </label>
          <textarea
            id={`${id}-reason`}
            data-testid={`${id}-reason`}
            className="w-full px-2 py-1 text-sm border border-border-subtle rounded-md bg-white"
            rows={2}
            value={reason}
            aria-describedby={`${id}-hint`}
            onChange={(e) => setReason(e.target.value)}
          />
          <p id={`${id}-hint`} className="text-xs text-text-tertiary mt-1">
            {t('pex.switch.reasonHint', { min: SWITCH_REASON_MIN_LENGTH })}
          </p>
          <Button
            variant="outline"
            className="mt-2"
            data-testid={`${id}-save`}
            disabled={refusal !== null || busy}
            onClick={() =>
              void onSave(next, reason.trim()).then((ok) => {
                if (ok) setReason('');
              })
            }
          >
            {t('pex.switch.save')}
          </Button>
        </div>
      ) : null}
      {note ? (
        <p className="text-xs text-text-tertiary mt-2" data-testid={`${id}-last`}>
          {t('pex.switch.last', {
            state: t(note.on ? 'pex.switch.on' : 'pex.switch.off'),
            when: note.setAt.slice(0, 10),
            reason: note.reason ?? ''
          })}
        </p>
      ) : null}
    </fieldset>
  );
};

/**
 * Team answers 2026-10-28 — the material's and its suppliers' OSIP values.
 * @type {React.FC<{ materialCode: string; osip: MaterialOsipInputs }>}
 */
export const OsipValues = ({ materialCode, osip }) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const refusalText = useRefusalText();
  const command = useOsipParamCommand();
  const availability = useVerbAvailability('osipparam:set');
  const held = availability.kind === 'held';
  const first = osip.suppliers[0];
  if (!first) return null;

  /**
   * @param {OsipParam} param
   * @param {{ supplierId?: string; materialCode?: string }} at
   * @param {number | boolean | null} value
   * @param {string} [reason]  PEX-13: the switch change's reason.
   * @returns {Promise<boolean>}  Whether it was saved.
   */
  const save = async (param, at, value, reason) => {
    try {
      const res = await command.mutateAsync({ param, ...at, value, ...(reason ? { reason } : {}) });
      if (res.status === 'failed') {
        toast({
          variant: 'warning',
          title: t('sst.values.refused'),
          description: refusalText(res.reason) ?? res.reason ?? ''
        });
        return false;
      }
      toast({
        variant: 'success',
        title: t(
          param === 'safetyStockOn' || param === 'protectionBufferOn'
            ? `pex.switch.saved.${param}`
            : `sst.values.saved.${param}`
        )
      });
      return true;
    } catch {
      toast({ variant: 'error', title: t('sst.values.refused') });
      return false;
    }
  };

  /** @param {OsipSupplierInput} s */
  const areaF = (s) => cycleDaysOf(null, s.supplyArea);

  return (
    <div className="mt-4" data-testid="sst-values">
      <h3 className="text-sm font-semibold text-text-primary mb-1">{t('sst.values.title')}</h3>
      <p className="text-xs text-text-tertiary mb-3">{t('sst.values.note')}</p>
      {!held && <HandoffNotice availability={availability} testId="handoff-osip-values" />}
      <div className="flex flex-wrap gap-6 mb-1">
        <NumberValue
          key={`z-${textOf(first.z)}`}
          id="sst-values-z"
          label={t('sst.values.z')}
          param="z"
          current={first.z ?? null}
          placeholder={formatNumber(OSIP_RULES.z)}
          held={held}
          busy={command.isPending}
          onSave={(v) => save('z', { materialCode }, v)}
        />
        <NumberValue
          key={`g-${textOf(first.g)}`}
          id="sst-values-g"
          label={t('sst.values.g')}
          param="g"
          current={first.g ?? null}
          placeholder={formatNumber(OSIP_RULES.fixedSafetyDays)}
          held={held}
          busy={command.isPending}
          onSave={(v) => save('g', { materialCode }, v)}
        />
      </div>
      <p className="text-xs text-text-tertiary mb-3" data-testid="sst-values-owners">
        {t('sst.values.owners')}
      </p>
      <div className="mb-4" data-testid="pex-switches">
        <h4 className="text-sm font-semibold text-text-primary mb-1">{t('pex.switch.title')}</h4>
        <p className="text-xs text-text-tertiary mb-2">
          {t('pex.switch.note', { min: SWITCH_REASON_MIN_LENGTH })}
        </p>
        <div className="flex flex-wrap gap-4">
          {
            /** @type {const} */ (['safetyStockOn', 'protectionBufferOn']).map((param) => {
              const on =
                (param === 'safetyStockOn' ? first.safetyOn : first.protectionOn) !== false;
              return (
                <SwitchValue
                  key={`${param}-${on}`}
                  id={`pex-switch-${param}`}
                  param={param}
                  on={on}
                  note={first.switchNotes?.[param]}
                  held={held}
                  busy={command.isPending}
                  onSave={(next, reason) => save(param, { materialCode }, next, reason)}
                />
              );
            })
          }
        </div>
        <p className="text-xs text-text-tertiary mt-2">{t('pex.switch.rulesHold')}</p>
      </div>
      <div className="overflow-x-auto">
        <table className="text-sm" data-testid="sst-values-suppliers">
          <thead>
            <tr>
              {
                /** @type {const} */ (['supplier', 'f', 'pull', 'bottleneck']).map((k) => (
                  <th
                    key={k}
                    scope="col"
                    className="text-left text-xs font-medium text-text-tertiary uppercase py-1 pr-4"
                  >
                    {k === 'supplier' ? (
                      t('sst.values.col.supplier')
                    ) : (
                      <TermLabel term={VALUE_COLUMN_TERM[k]} />
                    )}
                  </th>
                ))
              }
            </tr>
          </thead>
          <tbody>
            {osip.suppliers.map((s) => {
              const id = `sst-values-${s.supplierId}`;
              const fDefault = areaF(s);
              return (
                <tr key={s.supplierId} className="border-t border-border-subtle align-top">
                  <td className="py-2 pr-4">{s.supplierName}</td>
                  <td className="py-2 pr-4">
                    <NumberValue
                      key={`f-${textOf(s.fDays)}`}
                      id={`${id}-f`}
                      label={t('sst.values.fDays')}
                      param="f"
                      current={s.fDays ?? null}
                      placeholder={fDefault === null ? '' : formatNumber(fDefault)}
                      held={held}
                      busy={command.isPending}
                      onSave={(v) => save('f', { supplierId: s.supplierId }, v)}
                    />
                  </td>
                  <td className="py-2 pr-4">
                    <label className="inline-flex items-center gap-2 mt-5">
                      <input
                        type="checkbox"
                        data-testid={`${id}-pull`}
                        checked={s.pullAgreement === true}
                        disabled={!held || command.isPending}
                        onChange={(e) =>
                          void save(
                            'pullAgreement',
                            { supplierId: s.supplierId },
                            e.target.checked ? true : null
                          )
                        }
                      />
                      <span className="text-xs text-text-secondary">
                        {t(s.pullAgreement ? 'sst.values.pullDaily' : 'sst.values.pullWeekly')}
                      </span>
                    </label>
                  </td>
                  <td className="py-2 pr-4">
                    <NumberValue
                      key={`b-${textOf(s.bottleneckLeadTimeDays)}`}
                      id={`${id}-bottleneck`}
                      label={t('sst.values.days')}
                      param="bottleneckLeadTimeDays"
                      current={s.bottleneckLeadTimeDays ?? null}
                      placeholder={t('sst.values.notSet')}
                      held={held}
                      busy={command.isPending}
                      onSave={(v) =>
                        save(
                          'bottleneckLeadTimeDays',
                          { supplierId: s.supplierId, materialCode },
                          v
                        )
                      }
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
