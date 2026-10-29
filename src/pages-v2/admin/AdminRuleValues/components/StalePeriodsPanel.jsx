/** @import React from 'react' */
import { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Table from '@components/ui-v2/Table';
import TableHeader, { TableHeaderCell } from '@components/ui-v2/TableHeader';
import Button from '@components/ui-v2/Button';
import { useToast } from '@hooks/useToast';
import { useInventory } from '@services/query/hooks';
import { STALE_OVERRIDE_BOUNDS, staleOverrideKey } from '@services/transitions/hubSettings';
import { settingValue } from '@services/transitions/hubSettingsStore';
import { inventoryNow } from '../../../inventory/inventoryDisplay';
import { INPUT_CLASS } from '../const';
import { useValueText } from '../hooks/useRuleValueText';
import { toInput } from '../utils';
import StalePeriodRow from './StalePeriodRow';

// ── The stale period per supplier × material ─────────────────────────────────

/**
 * The stale period per supplier × material (alerts page only): a form to set
 * or remove a pair's own period, and a table of every inventory position with
 * the period that applies, its source, the last update and whether it is stale
 * now. Owns the pair form's state; recording goes through the page's `record`,
 * so a refusal is named on the page like any other.
 * @type {React.FC<{ held: boolean; version: number; record: (key: string, raw: string) => Promise<boolean>; }>}
 */
const StalePeriodsPanel = ({ held, version, record }) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const valueText = useValueText();
  const inventory = useInventory();
  const formRef = useRef(/** @type {HTMLElement | null} */ (null));
  const [pairKey, setPairKey] = useState('');
  const [days, setDays] = useState('');
  const busy = useRef(false);

  const now = inventoryNow();
  const rows = useMemo(() => {
    const items = inventory.data?.items ?? [];
    return items.map((p) => {
      const key = staleOverrideKey(p.supplierId, p.materialCode);
      const override = settingValue(key);
      return { p, key, override: typeof override === 'number' ? override : null };
    });
    // `version` re-derives the rows when a value changes on this page.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `version` is the store's change signal, so the memo re-reads the store
  }, [inventory.data, version]);
  /**
   * @param {string} key
   * @returns {string}
   */
  const pairName = (key) => {
    const r = rows.find((x) => x.key === key);
    return r
      ? t('adminSet.stale.pair', { supplier: r.p.supplierName, material: r.p.materialCode })
      : key;
  };
  const daysDef = { unit: /** @type {const} */ ('days') };

  /**
   * @param {string} key
   * @param {string} raw
   */
  const run = async (key, raw) => {
    if (busy.current) return;
    busy.current = true;
    try {
      const ok = await record(key, raw);
      if (!ok) return;
      const v = settingValue(key);
      toast({
        variant: 'success',
        title:
          v === null
            ? t('adminSet.stale.toast.removed', { pair: pairName(key) })
            : t('adminSet.stale.toast.set', { pair: pairName(key), value: valueText(daysDef, v) })
      });
      setPairKey('');
      setDays('');
    } finally {
      busy.current = false;
    }
  };

  return (
    <section className="mb-5" data-testid="admin-set-stale">
      <h2 className="text-section text-text-primary">{t('adminSet.stale.title')}</h2>
      <p className="text-xs text-text-secondary mt-1 mb-3">{t('adminSet.stale.intro')}</p>

      {held && (
        <section
          ref={formRef}
          className="mb-3 rounded-lg border border-border-subtle bg-white p-4 shadow-sm"
          data-testid="admin-set-stale-form"
        >
          <h3 className="text-sm font-medium text-text-primary mb-2">
            {t('adminSet.stale.form.title')}
          </h3>
          <form
            className="grid grid-cols-1 sm:grid-cols-[minmax(0,2fr)_160px_auto] gap-3 items-end"
            onSubmit={(e) => {
              e.preventDefault();
              if (pairKey) void run(pairKey, days);
            }}
          >
            <label className="block">
              <span className="text-label text-text-tertiary uppercase">
                {t('adminSet.stale.form.pair')}
              </span>
              <select
                className={INPUT_CLASS}
                data-testid="admin-set-stale-pair"
                value={pairKey}
                onChange={(e) => {
                  setPairKey(e.target.value);
                  setDays(toInput(e.target.value ? settingValue(e.target.value) : undefined));
                }}
                required
              >
                <option value="">{t('adminSet.stale.form.pick')}</option>
                {rows.map((r) => (
                  <option key={r.key} value={r.key}>
                    {t('adminSet.stale.pair', {
                      supplier: r.p.supplierName,
                      material: r.p.materialCode
                    })}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-label text-text-tertiary uppercase">
                {t('adminSet.stale.form.days')}
              </span>
              <input
                className={`${INPUT_CLASS} font-mono`}
                data-testid="admin-set-stale-days"
                inputMode="numeric"
                min={STALE_OVERRIDE_BOUNDS.min}
                max={STALE_OVERRIDE_BOUNDS.max}
                value={days}
                onChange={(e) => setDays(e.target.value)}
              />
              <span className="block text-[length:var(--fs-label-3)] text-text-tertiary mt-0.5">
                {t('adminSet.stale.form.emptyHint')}
              </span>
            </label>
            <Button
              type="submit"
              variant="outline"
              disabled={pairKey === ''}
              data-testid="admin-set-stale-submit"
            >
              {t('adminSet.stale.form.submit')}
            </Button>
          </form>
        </section>
      )}

      <div className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm overflow-x-auto">
        <Table>
          <TableHeader>
            <TableHeaderCell>{t('adminSet.stale.col.supplier')}</TableHeaderCell>
            <TableHeaderCell>{t('adminSet.stale.col.material')}</TableHeaderCell>
            <TableHeaderCell>{t('adminSet.stale.col.period')}</TableHeaderCell>
            <TableHeaderCell>{t('adminSet.stale.col.source')}</TableHeaderCell>
            <TableHeaderCell>{t('adminSet.stale.col.lastUpdate')}</TableHeaderCell>
            <TableHeaderCell>{t('adminSet.stale.col.now')}</TableHeaderCell>
            {held && <TableHeaderCell>{t('adminSet.col.action')}</TableHeaderCell>}
          </TableHeader>
          <tbody>
            {rows.map(({ p, key, override }) => (
              <StalePeriodRow
                key={key}
                p={p}
                rowKey={key}
                override={override}
                now={now}
                held={held}
                daysDef={daysDef}
                valueText={valueText}
                formRef={formRef}
                setPairKey={setPairKey}
                setDays={setDays}
              />
            ))}
          </tbody>
        </Table>
      </div>
    </section>
  );
};

export default StalePeriodsPanel;
