/** @import React from 'react' */
/** @import { TFunction } from 'i18next' */
import { inputClass, labelClass } from '../const';

/**
 * @typedef {object} DeliveryNotesSectionProps
 * @property {string} deliveryDate  The confirmed delivery date (ISO), seeded from the requested one.
 * @property {(v: string) => void} setDeliveryDate
 * @property {string} notes  The free-text note sent with the confirm.
 * @property {(v: string) => void} setNotes
 * @property {boolean} hasQtyChange  The confirmed total differs from the ordered total.
 * @property {boolean} hasDateChange  The confirmed date differs from the requested date.
 * @property {TFunction} t
 */

/**
 * The confirm form's delivery date and notes, with the warning shown when the
 * confirm changes the ordered quantity or date. Rendered in `editing` mode.
 * Moved out of `SupplierOrders.jsx` by the Phase 5 page split (no behaviour
 * change).
 * @type {React.FC<DeliveryNotesSectionProps>}
 */
const DeliveryNotesSection = ({
  deliveryDate,
  setDeliveryDate,
  notes,
  setNotes,
  hasQtyChange,
  hasDateChange,
  t
}) => (
  <section>
    <h3 className="text-label text-text-tertiary uppercase mb-3">
      {t('supplierOrders.panel.deliveryNotes')}
    </h3>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
      <div>
        <label className="block">
          <span className={labelClass}>{t('supplierOrders.panel.confirmedDeliveryDate')}</span>
          <input
            type="date"
            value={deliveryDate}
            onChange={(e) => setDeliveryDate(e.target.value)}
            className={inputClass}
          />
        </label>
      </div>
      <div>
        <label className="block">
          <span className={labelClass}>{t('supplierOrders.panel.notesLabel')}</span>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t('supplierOrders.panel.notesPlaceholder')}
            className={inputClass}
          />
        </label>
      </div>
    </div>
    {(hasQtyChange || hasDateChange) && (
      <div className="bg-warning-soft border-l-2 border-warning rounded px-3 py-2 text-xs text-warning-hover">
        {t('supplierOrders.panel.diffWarning')}
      </div>
    )}
  </section>
);

export default DeliveryNotesSection;
