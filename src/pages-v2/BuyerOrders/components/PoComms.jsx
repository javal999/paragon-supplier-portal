/** @import React from 'react' */
/** @import { TFunction } from 'i18next' */
/** @import { PurchaseOrder } from '@services/data/types' */
import { ChevronDown, ChevronUp } from 'lucide-react';
import { CHANNEL_ICON } from '../const';
import { buildComms } from '../utils';

/**
 * @typedef {object} PoCommsProps
 * @property {PurchaseOrder} selectedPO  The PO whose sample history is shown.
 * @property {boolean} commsOpen  Whether the history is expanded.
 * @property {(update: (v: boolean) => boolean) => void} setCommsOpen
 * @property {TFunction} t
 */

/**
 * The panel's communication history: a show/hide toggle with the message
 * count, and the sample messages when open. Moved out of `BuyerOrders.jsx` by
 * the Phase 5 page split (no behaviour change).
 * @type {React.FC<PoCommsProps>}
 */
const PoComms = ({ selectedPO, commsOpen, setCommsOpen, t }) => (
  <section>
    <button
      type="button"
      onClick={() => setCommsOpen((v) => !v)}
      className="flex items-center gap-2 text-sm font-medium text-teal-hover hover:text-teal-hover"
    >
      {commsOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      {commsOpen ? t('buyerOrders.comms.hide') : t('buyerOrders.comms.show')}{' '}
      {t(
        buildComms(selectedPO).length === 1
          ? 'buyerOrders.comms.history.one'
          : 'buyerOrders.comms.history.other',
        { count: buildComms(selectedPO).length }
      )}
    </button>
    {commsOpen && (
      <ul className="mt-3 space-y-3">
        {/* Key: the timestamp. buildComms emits a fixed three
            messages at 09:00, 10:18 and 14:32, so `ts` never repeats. */}
        {buildComms(selectedPO).map((m) => {
          const Icon = CHANNEL_ICON[m.channel];
          return (
            <li key={m.ts} className="flex gap-3 p-3 border border-border-subtle rounded-md">
              <Icon size={14} className="text-text-tertiary shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 text-xs text-text-tertiary">
                  <span className="font-medium text-text-secondary">{m.sender}</span>
                  <span>·</span>
                  <span>{m.ts}</span>
                </div>
                <p className="text-sm text-text-secondary mt-0.5">{m.preview}</p>
              </div>
            </li>
          );
        })}
      </ul>
    )}
  </section>
);

export default PoComms;
