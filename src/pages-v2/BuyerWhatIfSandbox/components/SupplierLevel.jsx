// PEX-15 BR-01 level 3 (BL-277) — Supplier: one supplier's total demand against the capacity it
// confirmed, per month, with the utilisation of PEX-4 BR-02 (demand ÷ confirmed capacity). Read
// only, over the capacity plans the Capacity page reads. A month with no confirmed capacity says
// so (PEX-4 BR-06), never 0%.

/** @import React from 'react' */
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Data from '@components/ui-v2/Data';
import LoadingState from '@components/ui-v2/LoadingState';
import ErrorState from '@components/ui-v2/ErrorState';
import { formatNumber } from '@lib/format';
import { useCapacityPlans } from '@services/query/hooks';
import { supplierMonths } from '@services/transitions/whatIfLevels';
import { inputClass, labelClass } from '../../inventory/inventoryDisplay';

/** @type {React.FC} */
const SupplierLevel = () => {
  const { t } = useTranslation();
  const query = useCapacityPlans();
  const [supplier, setSupplier] = useState('');
  const plans = useMemo(() => query.data?.items ?? [], [query.data]);
  const suppliers = useMemo(
    () => [...new Map(plans.map((p) => [p.supplierId, p.supplierName])).entries()],
    [plans]
  );
  const picked = suppliers.some(([id]) => id === supplier) ? supplier : (suppliers[0]?.[0] ?? '');
  const months = useMemo(() => (picked ? supplierMonths(plans, picked) : []), [plans, picked]);
  const uom = plans.find((p) => p.supplierId === picked)?.uom ?? '';

  if (query.isPending) return <LoadingState breadcrumb={[]} />;
  if (query.isError)
    return <ErrorState breadcrumb={[]} error={query.error} onRetry={() => query.refetch()} />;

  return (
    <div className="space-y-4" data-testid="wi-supplier-level">
      <p className="text-sm text-text-secondary">{t('pex.sandbox.supplier.note')}</p>
      <div className="max-w-sm">
        <label htmlFor="wi-supplier-pick" className={labelClass}>
          {t('pex.sandbox.supplier.pick')}
        </label>
        <select
          id="wi-supplier-pick"
          data-testid="wi-supplier-pick"
          className={inputClass}
          value={picked}
          onChange={(e) => setSupplier(e.target.value)}
        >
          {suppliers.map(([id, name]) => (
            <option key={id} value={id}>
              {name}
            </option>
          ))}
        </select>
      </div>
      {months.length === 0 ? (
        <p className="text-sm text-text-tertiary" data-testid="wi-supplier-empty">
          {t('pex.sandbox.supplier.empty')}
        </p>
      ) : (
        <div className="overflow-x-auto border border-border-subtle rounded-lg">
          <table className="w-full text-sm" data-testid="wi-supplier-table">
            <thead>
              <tr className="text-label text-text-tertiary uppercase bg-bg-hover">
                <th className="text-left px-3 py-2">{t('pex.sandbox.supplier.col.month')}</th>
                <th className="text-right px-3 py-2">
                  {t('pex.sandbox.supplier.col.demand', { uom })}
                </th>
                <th className="text-right px-3 py-2">
                  {t('pex.sandbox.supplier.col.capacity', { uom })}
                </th>
                <th className="text-right px-3 py-2">
                  {t('pex.sandbox.supplier.col.utilisation')}
                </th>
                <th className="text-left px-3 py-2">{t('pex.sandbox.supplier.col.weeks')}</th>
              </tr>
            </thead>
            <tbody>
              {months.map((m) => (
                <tr
                  key={m.month}
                  className="border-t border-border-subtle"
                  data-testid={`wi-supplier-month-${m.month}`}
                >
                  <td className="px-3 py-2">
                    <Data>{m.month}</Data>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <Data>{formatNumber(m.demand)}</Data>
                  </td>
                  <td className="px-3 py-2 text-right">
                    {m.capacity === null ? '—' : <Data>{formatNumber(m.capacity)}</Data>}
                  </td>
                  <td className="px-3 py-2 text-right" data-testid={`wi-supplier-util-${m.month}`}>
                    {m.utilisation === null ? (
                      <span className="text-text-tertiary">
                        {m.capacity === null
                          ? t('pex.sandbox.supplier.noCapacity')
                          : t('pex.sandbox.fg.notAvailable')}
                      </span>
                    ) : (
                      <Data>{`${formatNumber(m.utilisation)}%`}</Data>
                    )}
                  </td>
                  <td className="px-3 py-2 text-text-secondary">
                    {t('pex.sandbox.supplier.weeksConfirmed', {
                      confirmed: m.weeksConfirmed,
                      weeks: m.weeks
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-xs text-text-tertiary" data-testid="wi-supplier-scenario-note">
        {t('pex.sandbox.supplier.scenarioNote')}
      </p>
    </div>
  );
};

export default SupplierLevel;
