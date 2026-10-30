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
import { cycleDaysOf, osipParamRefusal } from '@services/transitions/osipParams';

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
 *   onSave: (value: number | null) => Promise<void>;
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
   */
  const save = async (param, at, value) => {
    try {
      const res = await command.mutateAsync({ param, ...at, value });
      if (res.status === 'failed') {
        toast({
          variant: 'warning',
          title: t('sst.values.refused'),
          description: refusalText(res.reason) ?? res.reason ?? ''
        });
        return;
      }
      toast({ variant: 'success', title: t(`sst.values.saved.${param}`) });
    } catch {
      toast({ variant: 'error', title: t('sst.values.refused') });
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
