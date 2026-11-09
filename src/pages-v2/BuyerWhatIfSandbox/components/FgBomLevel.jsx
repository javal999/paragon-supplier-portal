// PEX-15 BR-01 level 2 (BL-277) — FG and BOM: one finished good, its effect on every material
// of its BOM, and the BOM constraint (BR-03). Read only: every quantity is the engine's own
// requirement run (the pegs), recalculated by `fgBomView`; nothing is written.

/** @import React from 'react' */
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Data from '@components/ui-v2/Data';
import LoadingState from '@components/ui-v2/LoadingState';
import ErrorState from '@components/ui-v2/ErrorState';
import { formatDate, formatNumber } from '@lib/format';
import { useMaterialRequirement } from '@services/query/hooks';
import { bomConstraintRefusal, fgBomView, fgOptions } from '@services/transitions/whatIfLevels';
import { inputClass, labelClass } from '../../inventory/inventoryDisplay';

/** @type {React.FC} */
const FgBomLevel = () => {
  const { t } = useTranslation();
  const query = useMaterialRequirement();
  const [sku, setSku] = useState('');
  const [unitsText, setUnitsText] = useState('');
  const [limiting, setLimiting] = useState('');
  const materials = useMemo(() => query.data?.materials ?? [], [query.data]);
  const options = useMemo(
    () => fgOptions(materials, query.data?.finishedGoodNames ?? {}),
    [materials, query.data]
  );
  const picked = options.some((o) => o.skuCode === sku) ? sku : (options[0]?.skuCode ?? '');
  const unitsValue = unitsText.trim() === '' ? null : Number(unitsText);
  const refusal = unitsValue === null ? null : bomConstraintRefusal(unitsValue);
  const view = useMemo(
    () =>
      picked
        ? fgBomView({
            materials,
            skuCode: picked,
            units: refusal === null ? unitsValue : null,
            limitingMaterial: limiting || null
          })
        : null,
    [materials, picked, unitsValue, refusal, limiting]
  );

  if (query.isPending) return <LoadingState breadcrumb={[]} />;
  if (query.isError || !query.data)
    return <ErrorState breadcrumb={[]} error={query.error} onRetry={() => query.refetch()} />;

  return (
    <div className="space-y-4" data-testid="wi-fg-level">
      <p className="text-sm text-text-secondary">{t('pex.sandbox.fg.note')}</p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label htmlFor="wi-fg-sku" className={labelClass}>
            {t('pex.sandbox.fg.pick')}
          </label>
          <select
            id="wi-fg-sku"
            data-testid="wi-fg-sku"
            className={inputClass}
            value={picked}
            onChange={(e) => {
              setSku(e.target.value);
              setLimiting('');
            }}
          >
            {options.map((o) => (
              <option key={o.skuCode} value={o.skuCode}>
                {o.skuCode} · {o.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="wi-fg-limiting" className={labelClass}>
            {t('pex.sandbox.fg.limiting')}
          </label>
          <select
            id="wi-fg-limiting"
            data-testid="wi-fg-limiting"
            className={inputClass}
            value={limiting}
            onChange={(e) => setLimiting(e.target.value)}
          >
            <option value="">{t('pex.sandbox.fg.noLimiting')}</option>
            {(view?.materials ?? []).map((m) => (
              <option key={m.materialCode} value={m.materialCode}>
                {m.materialCode} · {m.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="wi-fg-units" className={labelClass}>
            {t('pex.sandbox.fg.units')}
          </label>
          <input
            id="wi-fg-units"
            data-testid="wi-fg-units"
            type="number"
            min={0}
            step={1}
            className={inputClass}
            value={unitsText}
            placeholder={t('pex.sandbox.fg.unitsPlaceholder')}
            onChange={(e) => setUnitsText(e.target.value)}
            aria-invalid={refusal !== null}
          />
          {refusal ? (
            <p className="text-xs text-danger mt-1" role="alert" data-testid="wi-fg-units-error">
              {t('pex.sandbox.fg.unitsInvalid')}
            </p>
          ) : null}
        </div>
      </div>

      {!view || view.weeks.length === 0 ? (
        <p className="text-sm text-text-tertiary" data-testid="wi-fg-empty">
          {t('pex.sandbox.fg.empty')}
        </p>
      ) : (
        <>
          <p className="text-sm text-text-secondary" data-testid="wi-fg-summary">
            {view.constrained
              ? t('pex.sandbox.fg.constrained', {
                  demand: formatNumber(view.fgDemand.reduce((a, b) => a + b, 0)),
                  produced: formatNumber(view.fgProduced.reduce((a, b) => a + b, 0))
                })
              : t('pex.sandbox.fg.unconstrained', {
                  demand: formatNumber(view.fgDemand.reduce((a, b) => a + b, 0))
                })}
          </p>
          <div className="overflow-x-auto border border-border-subtle rounded-lg">
            <table className="w-full text-sm" data-testid="wi-fg-table">
              <thead>
                <tr className="text-label text-text-tertiary uppercase bg-bg-hover">
                  <th className="text-left px-3 py-2">{t('pex.sandbox.fg.col.item')}</th>
                  {view.weeks.map((w) => (
                    <th key={w} className="text-right px-3 py-2">
                      {formatDate(w)}
                    </th>
                  ))}
                  <th className="text-right px-3 py-2">{t('pex.sandbox.fg.col.total')}</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-border-subtle" data-testid="wi-fg-row-demand">
                  <td className="px-3 py-2">{t('pex.sandbox.fg.row.demand')}</td>
                  {view.fgDemand.map((q, i) => (
                    <td key={view.weeks[i]} className="px-3 py-2 text-right">
                      <Data>{formatNumber(q)}</Data>
                    </td>
                  ))}
                  <td className="px-3 py-2 text-right">
                    <Data>{formatNumber(view.fgDemand.reduce((a, b) => a + b, 0))}</Data>
                  </td>
                </tr>
                <tr className="border-t border-border-subtle" data-testid="wi-fg-row-produced">
                  <td className="px-3 py-2 font-medium">{t('pex.sandbox.fg.row.produced')}</td>
                  {view.fgProduced.map((q, i) => (
                    <td key={view.weeks[i]} className="px-3 py-2 text-right font-medium">
                      <Data>{formatNumber(q)}</Data>
                    </td>
                  ))}
                  <td className="px-3 py-2 text-right font-medium">
                    <Data>{formatNumber(view.fgProduced.reduce((a, b) => a + b, 0))}</Data>
                  </td>
                </tr>
                {view.materials.map((m) => (
                  <tr
                    key={m.materialCode}
                    className="border-t border-border-subtle"
                    data-testid={`wi-fg-row-${m.materialCode}`}
                  >
                    <td className="px-3 py-2">
                      <Data>{m.materialCode}</Data>
                      <span className="block text-xs text-text-tertiary">
                        {m.label} · {m.uom}
                        {m.limiting ? ` · ${t('pex.sandbox.fg.limitingTag')}` : ''}
                      </span>
                    </td>
                    {m.recalculated.map((q, i) => (
                      <td key={view.weeks[i]} className="px-3 py-2 text-right">
                        <Data>{formatNumber(Math.round(q))}</Data>
                        {Math.round(q) !== Math.round(m.base[i]) ? (
                          <span className="block text-xs text-text-tertiary">
                            {t('pex.sandbox.fg.was', { qty: formatNumber(Math.round(m.base[i])) })}
                          </span>
                        ) : null}
                      </td>
                    ))}
                    <td
                      className="px-3 py-2 text-right"
                      data-testid={`wi-fg-total-${m.materialCode}`}
                    >
                      <Data>{formatNumber(Math.round(m.recalculatedTotal))}</Data>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-text-tertiary" data-testid="wi-fg-scenario-note">
            {t('pex.sandbox.fg.scenarioNote')}
          </p>
        </>
      )}
    </div>
  );
};

export default FgBomLevel;
