/** @import React from 'react' */
/** @import { OsipRules } from '@services/transitions/osipRules' */
/** @import { MaterialOsipInputs, OsipSupplierInput } from '@services/transitions/osipSafetyRules' */
/** @import { MaterialRopInputs, NpdRule, OsipRopFigures, RopFigure, SupplierRopKey } from '@services/transitions/osipRopRules' */
/** @import { Uom } from '@services/sdc/types' */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Button from '@components/ui-v2/Button';
import Data from '@components/ui-v2/Data';
import SelectField from '@components/ui-v2/SelectField';
import StatusPill from '@components/ui-v2/StatusPill';
import { HandoffNotice } from '@components/ui-v2/HandoffNotice';
import { useVerbAvailability } from '@hooks/useVerbAvailability';
import { useToast } from '@hooks/useToast';
import { useRefusalText } from '@hooks/useRefusalText';
import { formatDate, formatNumber } from '@lib/format';
import { useOsipLevelCommand } from '@services/query/commandHooks';
import { OSIP_RULES } from '@services/transitions/osipRules';
import {
  NPD_RULES,
  OSIP_LEVELS,
  OSIP_ROP_QUESTIONS,
  OSIP_ROP_READ,
  SUPPLIER_ROP_KEYS,
  osipLevelRefusal
} from '@services/transitions/osipRopRules';
import { qtyOf } from '../materialPlan/planDisplay';
import { ProvisionalNote } from './osipSafety';
import { LevelSuggestion } from './levelSuggestion';

// ─────────────────────────────────────────────────────────────────────────────
// BL-196 (DRC-10, DRC-D11) and BL-198 (DRC-12a) on the Safety stock targets page:
//   · the OSIP level per material, with its NPD tag beside it;
//   · ROP Order, ROP Fisik (by level) and Max per supplier, as table columns
//     next to the wave 2 OSIP safety columns;
//   · ROP Supplier, ROP FS and ROP to principal per supplier, and the level
//     control, in the material's detail panel (the table would be too wide);
//   · two read-only switches (Max rule B8, NPD rule D1) that recompute the view.
// Every figure is `osipRops`'s (osipRopRules.js) over `osipSafety`'s; none is
// computed here. Each column carries "Provisional: rule awaiting Material
// Planning" with its question IDs (design rule 5).
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The ROP switches: one OSIP_RULES key and the NPD rule.
 * @typedef {{ readonly maxRule: OsipRules['maxRule']; readonly npdRule: NpdRule }} RopSwitches
 */

/** @returns {RopSwitches} The defaults in force. */
export const defaultRopSwitches = () => ({
  maxRule: OSIP_RULES.maxRule,
  npdRule: OSIP_ROP_READ.npdRule
});

/**
 * The ROP column titles with their provisional notes.
 * @type {React.FC<{ column: 'level' | 'ropOrder' | 'ropFisik' | 'max' }>}
 */
export const RopColumnTitle = ({ column }) => {
  const { t } = useTranslation();
  const questions =
    column === 'level'
      ? [...OSIP_ROP_QUESTIONS.level, ...OSIP_ROP_QUESTIONS.npd]
      : OSIP_ROP_QUESTIONS[column];
  return (
    <>
      {t(`sst.rop.col.${column}`)}
      <ProvisionalNote questions={questions} testId={`sst-rop-prov-${column}`} />
    </>
  );
};

/**
 * The two ROP switches. Read only in effect: the page recomputes with them.
 * @type {React.FC<{ value: RopSwitches; onChange: (next: RopSwitches) => void }>}
 */
export const RopRuleSwitches = ({ value, onChange }) => {
  const { t } = useTranslation();
  const labelClass = 'block text-label text-text-tertiary uppercase mb-1';
  const changed = value.maxRule !== OSIP_RULES.maxRule || value.npdRule !== OSIP_ROP_READ.npdRule;
  return (
    <section
      className="bg-bg-surface border border-border-subtle rounded-lg p-4 mb-6"
      data-testid="sst-rop-switches"
    >
      <h2 className="text-section text-text-primary mb-1">{t('sst.rop.rules.title')}</h2>
      <p className="text-xs text-text-tertiary mb-1">{t('sst.rop.rules.note')}</p>
      {/* Owner, 2026-10-19 — the default NPD rule on partial sample history. */}
      <p className="text-xs text-text-secondary mb-3" data-testid="sst-npd-sample-note">
        {t('sst.rop.npdSampleNote')}
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelClass} htmlFor="sst-rop-maxRule">
            {t('sst.rop.rules.maxRule')}
          </label>
          <SelectField
            id="sst-rop-maxRule"
            testId="sst-rop-switch-maxRule"
            options={[
              { value: 'deck', label: t('sst.rop.rules.maxRule.deck') },
              { value: 'sheetGuidance', label: t('sst.rop.rules.maxRule.sheetGuidance') }
            ]}
            value={value.maxRule}
            onChange={(v) => {
              if (v !== null)
                onChange({ ...value, maxRule: /** @type {RopSwitches['maxRule']} */ (v) });
            }}
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="sst-rop-npdRule">
            {t('sst.rop.rules.npdRule')}
          </label>
          <SelectField
            id="sst-rop-npdRule"
            testId="sst-rop-switch-npdRule"
            options={NPD_RULES.map((r) => ({ value: r, label: t(`sst.rop.rules.npdRule.${r}`) }))}
            value={value.npdRule}
            onChange={(v) => {
              if (v !== null) onChange({ ...value, npdRule: /** @type {NpdRule} */ (v) });
            }}
          />
        </div>
      </div>
      {changed ? (
        <p className="text-xs text-warning-hover mt-3" data-testid="sst-rop-variant">
          {t('sst.osip.rules.changed')}
        </p>
      ) : null}
    </section>
  );
};

/**
 * BL-196 / BL-198 — the material's level in force, and its NPD tag under the rule shown.
 * @type {React.FC<{ materialCode: string; rop: MaterialRopInputs; npdRule: NpdRule }>}
 */
export const LevelCell = ({ materialCode, rop, npdRule }) => {
  const { t } = useTranslation();
  const tag = rop.npd[npdRule];
  return (
    <div>
      <Data data-testid={`sst-level-${materialCode}`}>
        {t('sst.rop.level', { level: rop.level.level })}
      </Data>
      <div className="text-xs text-text-tertiary" data-testid={`sst-level-source-${materialCode}`}>
        {t(`sst.rop.levelSource.${rop.level.source}`)}
      </div>
      {tag.npd ? (
        <span
          className="inline-block mt-1"
          data-testid={`sst-npd-${materialCode}`}
          title={t(`sst.rop.npdBasis.${tag.basis}`)}
        >
          <StatusPill>{t('sst.rop.npd')}</StatusPill>
        </span>
      ) : null}
    </div>
  );
};

/**
 * One supplier line inside a cell.
 * @type {React.FC<{ s: OsipSupplierInput; testId: string; children: React.ReactNode }>}
 */
const SupplierLine = ({ s, testId, children }) => (
  <div className="mb-1 last:mb-0" data-testid={testId}>
    <div className="text-xs text-text-tertiary">{s.supplierName}</div>
    {children}
  </div>
);

/**
 * A figure, or "Not available" naming the missing input.
 * @type {React.FC<{ fig: RopFigure; uom: Uom; testId: string; title?: string }>}
 */
const FigureText = ({ fig, uom, testId, title }) => {
  const { t } = useTranslation();
  if (fig.value === null)
    return (
      <span className="text-xs text-text-tertiary" data-testid={testId}>
        {fig.unavailable === 'NOT_ON_ROUTE'
          ? t('sst.rop.unavailable.NOT_ON_ROUTE', {
              steps: (fig.missing ?? []).map((s) => t(`sst.rop.step.${s}`)).join(', ')
            })
          : t(`sst.rop.unavailable.${fig.unavailable}`)}
      </span>
    );
  return (
    <Data data-testid={testId} title={title}>
      {`${qtyOf(fig.value, uom)} ${uom}`}
    </Data>
  );
};

/**
 * BL-196 — one of the table's ROP columns, per supplier.
 * @type {React.FC<{ column: 'ropOrder' | 'ropFisik' | 'max'; materialCode: string; uom: Uom; osip: MaterialOsipInputs; figures: readonly OsipRopFigures[] }>}
 */
export const RopCell = ({ column, materialCode, uom, osip, figures }) => {
  const { t } = useTranslation();
  return (
    <>
      {osip.suppliers.map((s, i) => {
        const f = figures[i];
        const id = `sst-rop-${column}-${materialCode}-${s.supplierId}`;
        const title =
          column === 'ropOrder' && f.ropOrder.cycleStock !== null
            ? t('sst.rop.ropOrderTitle', { cycle: qtyOf(f.ropOrder.cycleStock, uom) })
            : column === 'ropFisik' && f.ropFisik.cycle !== null
              ? t('sst.rop.ropFisikTitle', {
                  level: f.ropFisik.level,
                  cycle: qtyOf(f.ropFisik.cycle, uom)
                })
              : undefined;
        return (
          <SupplierLine key={s.supplierId} s={s} testId={`${id}-line`}>
            <FigureText fig={f[column]} uom={uom} testId={id} title={title} />
            {column === 'ropFisik' &&
              f.flags
                .filter((flag) => flag !== 'NO_MAX_ROUNDING')
                .map((flag) => (
                  <div
                    key={flag}
                    className="text-xs text-text-tertiary"
                    data-testid={`${id}-flag-${flag}`}
                  >
                    {t(`sst.rop.flag.${flag}`)}
                  </div>
                ))}
            {column === 'max' && f.flags.includes('NO_MAX_ROUNDING') && (
              <div
                className="text-xs text-text-tertiary"
                data-testid={`${id}-flag-NO_MAX_ROUNDING`}
              >
                {t('sst.rop.flag.NO_MAX_ROUNDING')}
              </div>
            )}
          </SupplierLine>
        );
      })}
    </>
  );
};

/**
 * DRC-D11 — the governed level control. Rendered only for a seat holding the atom.
 * @type {React.FC<{ materialCode: string; current: number }>}
 */
const LevelControl = ({ materialCode, current }) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const refusalText = useRefusalText();
  const command = useOsipLevelCommand();
  const [picked, setPicked] = useState(current);
  const refusal = osipLevelRefusal(picked);
  const save = async () => {
    if (refusal !== null) return;
    try {
      const res = await command.mutateAsync({ materialCode, level: picked });
      if (res.status === 'failed') {
        toast({
          variant: 'warning',
          title: t('sst.rop.levelForm.refused'),
          description: refusalText(res.reason) ?? res.reason ?? ''
        });
        return;
      }
      toast({
        variant: 'success',
        title: t('sst.rop.levelForm.saved'),
        description: t('sst.rop.levelForm.savedDesc', { level: picked, material: materialCode })
      });
    } catch {
      toast({ variant: 'error', title: t('sst.rop.levelForm.refused') });
    }
  };
  return (
    <div className="flex flex-col sm:flex-row sm:items-end gap-3">
      <div className="w-40">
        <label
          htmlFor="sst-level-select"
          className="block text-label text-text-tertiary uppercase mb-1"
        >
          {t('sst.rop.levelForm.label')}
        </label>
        <SelectField
          id="sst-level-select"
          testId="sst-level-select"
          options={OSIP_LEVELS.map((l) => ({
            value: String(l),
            label: t('sst.rop.level', { level: l })
          }))}
          value={String(picked)}
          onChange={(v) => {
            if (v !== null) setPicked(Number(v));
          }}
        />
      </div>
      <Button
        variant="outline"
        onClick={() => void save()}
        disabled={refusal !== null || command.isPending}
        data-testid="sst-level-save"
      >
        {t(picked === current ? 'sst.rop.levelForm.confirm' : 'sst.rop.levelForm.save')}
      </Button>
    </div>
  );
};

/**
 * BL-196 / BL-198 — the material's level, NPD tag and every ROP per supplier,
 * in the detail panel.
 * @type {React.FC<{ materialCode: string; uom: Uom; osip: MaterialOsipInputs; rop: MaterialRopInputs; figures: readonly OsipRopFigures[]; npdRule: NpdRule }>}
 */
export const RopDetail = ({ materialCode, uom, osip, rop, figures, npdRule }) => {
  const { t } = useTranslation();
  const availability = useVerbAvailability('osiplevel:set');
  const tag = rop.npd[npdRule];
  const fo = rop.firstOrder;
  /** @param {SupplierRopKey | 'ropOrder' | 'ropFisik' | 'max'} k */
  const head = (k) => (
    <th
      scope="col"
      className="text-left text-xs font-medium text-text-tertiary uppercase py-1 pr-4"
    >
      {t(`sst.rop.col.${k}`)}
    </th>
  );
  return (
    <div className="mt-4" data-testid="sst-rop-detail">
      <h3 className="text-sm font-semibold text-text-primary mb-1">{t('sst.rop.detail.title')}</h3>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-3">
        <div>
          <p className="text-sm" data-testid="sst-rop-detail-level">
            {t('sst.rop.detail.level', { level: rop.level.level })}{' '}
            <span className="text-xs text-text-tertiary">
              ({t(`sst.rop.levelSource.${rop.level.source}`)}
              {rop.level.setAt ? ` · ${formatDate(rop.level.setAt)}` : ''})
            </span>
          </p>
          <ProvisionalNote
            questions={OSIP_ROP_QUESTIONS.level}
            testId="sst-rop-detail-prov-level"
          />
          <div className="mt-2">
            {availability.kind === 'held' ? (
              <LevelControl
                key={`${materialCode}-${rop.level.level}`}
                materialCode={materialCode}
                current={rop.level.level}
              />
            ) : (
              <HandoffNotice availability={availability} testId="handoff-osip-level" />
            )}
          </div>
          {/* BL-208 (DRC-19) [Proposed] — a suggestion; only the planner sets the level. */}
          <LevelSuggestion
            materialCode={materialCode}
            osip={osip}
            current={rop.level.level}
            held={availability.kind === 'held'}
          />
        </div>
        <div data-testid="sst-rop-detail-npd">
          <p className="text-sm">
            {t(tag.npd ? 'sst.rop.detail.npdYes' : 'sst.rop.detail.npdNo')}{' '}
            <span className="text-xs text-text-tertiary">
              ({t(`sst.rop.rules.npdRule.${npdRule}`)})
            </span>
          </p>
          <p className="text-xs text-text-secondary" data-testid="sst-rop-detail-npd-basis">
            {t(`sst.rop.npdBasis.${tag.basis}`)}
            {tag.until ? ` · ${formatDate(tag.until)}` : ''}
          </p>
          {npdRule === 'firstOrderFulfilled' && fo.firstPo !== null && (
            <p className="text-xs text-text-tertiary" data-testid="sst-rop-detail-first-order">
              {t('sst.rop.detail.firstOrder', {
                po: fo.firstPo,
                received: qtyOf(fo.received, uom),
                ordered: qtyOf(fo.ordered, uom),
                uom
              })}
            </p>
          )}
          <ProvisionalNote questions={OSIP_ROP_QUESTIONS.npd} testId="sst-rop-detail-prov-npd" />
          <p className="text-xs text-text-tertiary mt-1">{t('sst.rop.detail.npdEffect')}</p>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="text-sm" data-testid="sst-rop-detail-table">
          <thead>
            <tr>
              <th
                scope="col"
                className="text-left text-xs font-medium text-text-tertiary uppercase py-1 pr-4"
              >
                {t('sst.rop.detail.supplier')}
              </th>
              {head('ropOrder')}
              {head('ropFisik')}
              {head('max')}
              {SUPPLIER_ROP_KEYS.map((k) => (
                <th
                  key={k}
                  scope="col"
                  className="text-left text-xs font-medium text-text-tertiary uppercase py-1 pr-4"
                >
                  {t(`sst.rop.col.${k}`)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {osip.suppliers.map((s, i) => {
              const f = figures[i];
              const id = `sst-rop-detail-${s.supplierId}`;
              return (
                <tr key={s.supplierId} className="border-t border-border-subtle align-top">
                  <td className="py-1 pr-4">{s.supplierName}</td>
                  <td className="py-1 pr-4">
                    <FigureText fig={f.ropOrder} uom={uom} testId={`${id}-ropOrder`} />
                  </td>
                  <td className="py-1 pr-4">
                    <FigureText fig={f.ropFisik} uom={uom} testId={`${id}-ropFisik`} />
                  </td>
                  <td className="py-1 pr-4">
                    <FigureText fig={f.max} uom={uom} testId={`${id}-max`} />
                  </td>
                  {SUPPLIER_ROP_KEYS.map((k) => (
                    <td key={k} className="py-1 pr-4">
                      <FigureText
                        fig={f.supplier[k]}
                        uom={uom}
                        testId={`${id}-${k}`}
                        title={
                          f.supplier[k].days === undefined
                            ? undefined
                            : t('sst.rop.legTitle', { days: formatNumber(f.supplier[k].days ?? 0) })
                        }
                      />
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <ProvisionalNote
        questions={OSIP_ROP_QUESTIONS.supplierRops}
        testId="sst-rop-detail-prov-supplierRops"
      />
      <p className="text-xs text-text-tertiary" data-testid="sst-rop-detail-supplier-reading">
        {t('sst.rop.detail.supplierReading')}
      </p>
    </div>
  );
};
