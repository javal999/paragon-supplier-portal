/** @import React from 'react' */
/** @import { useChaseEntries, useSupplierRollups } from '@services/query/sdcBuyerHooks' */
import { MessageCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { formatDate } from '@lib/format';
import { CHIP_INFO, CHIP_NEUTRAL, CHIP_SUCCESS, CHIP_WARNING } from '../const';
import { supplierName } from '../utils';

/**
 * The chase list (the pre-scheduler manual WhatsApp interim): the supplier
 * response rollup counts, then one line per supplier to chase with its reason,
 * awaiting lines and due date, or an empty note.
 *
 * Moved out of `BuyerCollaboration.jsx` by the Phase 5 page split (no behaviour
 * change).
 * @type {React.FC<{
 *   chase: NonNullable<ReturnType<typeof useChaseEntries>['data']>;
 *   rollups: NonNullable<ReturnType<typeof useSupplierRollups>['data']>;
 * }>}
 */
const ChaseList = ({ chase, rollups }) => {
  const { t } = useTranslation();

  return (
    <section className="mb-8" data-testid="sdc-chase">
      <h2 className="mb-1 text-base font-semibold text-text-primary">{t('sdc.chase.title')}</h2>
      <p className="mb-3 text-sm text-text-secondary">{t('sdc.chase.subtitle')}</p>

      {/* Supplier response rollup — context for the chase */}
      <div className="mb-3 flex flex-wrap gap-2">
        <span className={CHIP_SUCCESS}>
          {t('sdc.rollup.responded')}: {rollups.filter((r) => r.rollup === 'responded').length}
        </span>
        <span className={CHIP_INFO}>
          {t('sdc.rollup.partial')}: {rollups.filter((r) => r.rollup === 'partial').length}
        </span>
        <span className={CHIP_NEUTRAL}>
          {t('sdc.rollup.silent')}: {rollups.filter((r) => r.rollup === 'silent').length}
        </span>
      </div>

      {chase.length === 0 ? (
        <p className="rounded-lg border border-border-subtle bg-bg-surface px-4 py-3 text-sm text-text-secondary">
          {t('sdc.chase.empty')}
        </p>
      ) : (
        <ul className="divide-y divide-border-subtle overflow-hidden rounded-lg border border-border-subtle bg-bg-surface">
          {chase.map((entry) => (
            <li
              key={entry.supplierId}
              className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 text-sm"
            >
              <MessageCircle size={14} className="shrink-0 text-text-tertiary" aria-hidden="true" />
              <span className="min-w-[10rem] font-medium text-text-primary">
                {supplierName(entry.supplierId)}
              </span>
              <span className={entry.reason === 'overdue' ? CHIP_WARNING : CHIP_INFO}>
                {t(
                  entry.reason === 'overdue'
                    ? 'sdc.chase.reason.overdue'
                    : 'sdc.chase.reason.partial'
                )}
              </span>
              <span className="text-text-secondary">
                {t('sdc.chase.awaitingLines', { n: entry.awaitingLines })}
              </span>
              <span className="ml-auto text-xs text-text-tertiary">
                {t('sdc.chase.due', { date: formatDate(entry.dueAt) })}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

export default ChaseList;
