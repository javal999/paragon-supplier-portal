/** @import React from 'react' */
/** @import { TFunction } from 'i18next' */
/** @import { Contract } from '@data/mockContracts' */
/** @import { Supplier } from '@services/data/types' */
/** @import { ContractDisplayStatus } from '@services/data/contractExpiry' */
import { CalendarDays, RefreshCw } from 'lucide-react';
import Data from '@components/ui-v2/Data';
import { CONTRACT_EXPIRY_CHIP } from '@services/data/contractExpiry';
import { typeLabel } from '../utils';

/**
 * @typedef {object} RenewalPipelineProps
 * @property {[string, Contract[]][]} renewalPipeline Contracts inside the renewal horizon,
 *   grouped by end month, earliest month first.
 * @property {Map<string, Supplier>} supplierById Supplier lookup for the card's name line.
 * @property {(c: Contract) => ContractDisplayStatus} displayOf The row's computed display status.
 * @property {(c: Contract) => number} expiryDays Days to expiry at the workspace's one clock read.
 * @property {(c: Contract) => void} openContract Opens the contract's detail page.
 * @property {TFunction} t
 */

/**
 * The renewal pipeline section under the list: one group per end month, one
 * card per contract (days-to-expiry chip, supplier, number, type, auto-renew
 * icon), or the empty line. Moved out of `BuyerContracts.jsx` by the Phase 5
 * page split (no behaviour change).
 * @type {React.FC<RenewalPipelineProps>}
 */
const RenewalPipeline = ({
  renewalPipeline,
  supplierById,
  displayOf,
  expiryDays,
  openContract,
  t
}) => (
  <section className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm overflow-hidden">
    <div className="px-6 py-4 border-b border-border-subtle">
      <div className="text-label text-text-tertiary uppercase">
        {t('contracts.pipeline.eyebrow')}
      </div>
      <h2 className="text-section text-text-primary mt-1">{t('contracts.pipeline.title')}</h2>
      <p className="text-meta text-text-tertiary">{t('contracts.pipeline.subtitle')}</p>
    </div>
    {renewalPipeline.length === 0 ? (
      <div className="px-6 py-10 text-center text-sm text-text-tertiary">
        {t('contracts.pipeline.empty')}
      </div>
    ) : (
      <ul className="divide-y divide-border-subtle">
        {renewalPipeline.map(([month, items]) => (
          <li key={month} className="px-6 py-4">
            <div className="flex items-center gap-2 mb-3">
              <CalendarDays size={14} className="text-teal" />
              <h3 className="text-section text-text-primary">{month}</h3>
              <span className="text-xs text-text-tertiary">
                {t(
                  items.length === 1
                    ? 'contracts.pipeline.count.one'
                    : 'contracts.pipeline.count.other',
                  { count: items.length }
                )}
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {items.map((c) => {
                const supplier = supplierById.get(c.supplierId);
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => openContract(c)}
                    className="text-left flex items-start gap-3 p-3 rounded-md border border-border-subtle hover:border-teal hover:shadow-sm transition-all"
                  >
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                        CONTRACT_EXPIRY_CHIP[displayOf(c)]
                      }`}
                    >
                      {expiryDays(c)}d
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-text-primary truncate">
                        {supplier?.name ?? c.supplierId}
                      </div>
                      <div className="text-xs text-text-tertiary mt-0.5">
                        <Data>{c.contractNumber}</Data> · {typeLabel(t, c.type)}
                      </div>
                    </div>
                    {c.autoRenewal && <RefreshCw size={14} className="text-info shrink-0 mt-0.5" />}
                  </button>
                );
              })}
            </div>
          </li>
        ))}
      </ul>
    )}
  </section>
);

export default RenewalPipeline;
