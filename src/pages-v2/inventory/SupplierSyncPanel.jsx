/** @import React from 'react' */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshCw } from 'lucide-react';
import Button from '@components/ui-v2/Button';
import Data from '@components/ui-v2/Data';
import SampleDataBadge from '@components/ui-v2/SampleDataBadge';
import { HandoffNotice } from '@components/ui-v2/HandoffNotice';
import { useVerbAvailability } from '@hooks/useVerbAvailability';
import { formatDateTime } from '@lib/format';
/** @import { InventoryPosition, StockAccessGrant } from '@services/data/types' */
import { inventoryNow, qty, useInventoryRunner } from './inventoryDisplay';

// ─────────────────────────────────────────────────────────────────────────────
// SUPPLIER-TRIGGERED SYNC — REQ-E08-02 BR-03, BR-11, AC-02, AC-06 (BL-59).
//
// Two independent actions on the supplier's own Stock page:
//
//   · Sync — ONLY for an API-connected supplier. Pulls the supplier's own ERP
//     stock through `t_stocksync_pull` (the supplier's fulfilment atom). The
//     connection is SIMULATED (sample answers from `API_CONNECTIONS`) and the
//     section says so. It shows the last attempt's time; a failure shows the
//     error and time, and the previous figures stay, marked out of date (the
//     stock rows already read `stale` from the failed attempt).
//
//   · Refresh PTI stock — ONLY for a supplier holding an active PTI stock
//     access grant (REQ-E08-03). A READ, not a governed act: it re-reads the
//     inventory, whose PTI figures are already masked to the granted materials
//     server-side (`maskForSupplier`), and lists exactly those. Without a
//     grant the action is not offered at all — not disabled, absent.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @typedef {object} SupplierSyncPanelProps
 * @property {string} supplierId
 * @property {readonly InventoryPosition[]} positions
 * @property {StockAccessGrant | undefined} grant
 * @property {() => Promise<unknown>} refetch -  Re-read the inventory (the PTI refresh).
 */

/** @type {React.FC<SupplierSyncPanelProps>} */
const SupplierSyncPanel = ({ supplierId, positions, grant, refetch }) => {
  const { t } = useTranslation();
  const { run, pending } = useInventoryRunner();
  const pull = useVerbAvailability('stocksync:pull');
  const [refreshedAt, setRefreshedAt] = useState(/** @type {string | null} */ (null));
  const [refreshing, setRefreshing] = useState(false);

  const apiConnected = positions.some((p) => p.apiConnected);
  const hasGrant = grant?.active === true;
  if (!apiConnected && !hasGrant) return null;

  // Every row of one supplier carries the same latest attempt.
  const lastSync = positions.find((p) => p.lastSync !== null)?.lastSync ?? null;
  const granted = positions.filter((p) => p.ptiStockShared);

  const refreshPti = async () => {
    setRefreshing(true);
    try {
      await refetch();
      setRefreshedAt(inventoryNow());
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <section
      className="bg-bg-surface border border-border-subtle rounded-lg p-4 mb-6 space-y-4"
      data-testid="sup-sync"
    >
      {apiConnected ? (
        <div data-testid="sup-sync-erp">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-section text-text-primary">
                {t('inv.supSync.title')}
                <SampleDataBadge className="ml-3 align-middle" />
              </h2>
              <p className="text-sm text-text-secondary">{t('inv.supSync.subtitle')}</p>
              <p className="text-xs text-text-tertiary mt-1">{t('inv.supSync.simulated')}</p>
            </div>
            {pull.kind === 'held' ? (
              <Button
                variant="outline"
                icon={RefreshCw}
                disabled={pending}
                onClick={() => void run({ verb: 'pull', supplierId }, t('inv.supSync.done'))}
                data-testid="sup-sync-button"
              >
                {t('inv.sync.action')}
              </Button>
            ) : (
              <HandoffNotice availability={pull} testId="handoff-stock-pull" />
            )}
          </div>
          <p className="mt-2 text-sm" data-testid="sup-sync-status">
            {lastSync === null ? (
              <span className="text-text-tertiary">{t('inv.sync.never')}</span>
            ) : lastSync.outcome === 'success' ? (
              <span className="text-text-secondary">
                {t('inv.sync.lastSuccess')} <Data>{formatDateTime(lastSync.at)}</Data>
              </span>
            ) : (
              <span className="text-danger" data-testid="sup-sync-error">
                {t('inv.sync.lastFailed', {
                  error: t(`inv.sync.error.${lastSync.errorKey ?? 'timeout'}`)
                })}{' '}
                <Data>{formatDateTime(lastSync.at)}</Data> · {t('inv.sync.keptStale')}
              </span>
            )}
          </p>
        </div>
      ) : null}

      {hasGrant ? (
        <div
          data-testid="sup-pti-refresh"
          className={apiConnected ? 'pt-4 border-t border-border-subtle' : ''}
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-section text-text-primary">
                {t('inv.supSync.pti.title')}
                <SampleDataBadge className="ml-3 align-middle" />
              </h2>
              <p className="text-sm text-text-secondary">{t('inv.supSync.pti.subtitle')}</p>
            </div>
            <Button
              variant="secondary"
              icon={RefreshCw}
              disabled={refreshing}
              onClick={() => void refreshPti()}
              data-testid="sup-pti-refresh-button"
            >
              {t('inv.supSync.pti.action')}
            </Button>
          </div>
          {refreshedAt ? (
            <div className="mt-3" data-testid="sup-pti-refresh-result">
              <p className="text-xs text-text-tertiary mb-2">
                {t('inv.supSync.pti.refreshedAt')} <Data>{formatDateTime(refreshedAt)}</Data> ·{' '}
                {t('inv.supSync.pti.count', { count: granted.length })}
              </p>
              <ul className="divide-y divide-border-subtle text-sm">
                {granted.map((p) => (
                  <li
                    key={p.materialCode}
                    className="py-1.5 flex justify-between gap-3"
                    data-testid={`sup-pti-refresh-${p.materialCode}`}
                  >
                    <Data className="text-xs font-bold text-text-primary">{p.materialCode}</Data>
                    <span className="text-text-secondary">
                      {t('inv.col.ptiSoh')}{' '}
                      <Data>{p.ptiSoh === null ? '—' : `${qty(p.ptiSoh)} ${p.uom}`}</Data>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
};

export default SupplierSyncPanel;
