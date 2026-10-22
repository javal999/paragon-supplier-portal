/** @import React from 'react' */
/** @import { CallOffType } from '@services/data/types' */
/** @import { CallOffForm } from '../utils' */
import { useTranslation } from 'react-i18next';
import { CALL_OFF_TYPES } from '@services/transitions/callOffRules';
import { inputClass, labelClass } from '../../callOffs/callOffDisplay';

/**
 * The edit fields of a draft or a change: quantity, need date, the type (a
 * draft only, `withType`) and the reason the verb requires. Reads and writes
 * the page's call-off form. Moved out of `BuyerCallOffs.jsx` by the Phase 5
 * page split (no behaviour change).
 * @type {React.FC<{ form: CallOffForm; setForm: (f: CallOffForm) => void; uom: string; today: string; withType?: boolean; }>}
 */
const DraftFields = ({ form, setForm, uom, today, withType }) => {
  const { t } = useTranslation();
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="co-edit-qty" className={labelClass}>
            {t('co.field.quantity', { uom })}
          </label>
          <input
            id="co-edit-qty"
            inputMode="numeric"
            className={inputClass}
            value={form.quantity}
            onChange={(e) => setForm({ ...form, quantity: e.target.value })}
          />
        </div>
        <div>
          <label htmlFor="co-edit-date" className={labelClass}>
            {t('co.field.needDate')}
          </label>
          <input
            id="co-edit-date"
            type="date"
            min={today}
            className={inputClass}
            value={form.needDate}
            onChange={(e) => setForm({ ...form, needDate: e.target.value })}
          />
        </div>
      </div>
      {withType && (
        <div>
          <label htmlFor="co-edit-type" className={labelClass}>
            {t('co.field.type')}
          </label>
          <select
            id="co-edit-type"
            className={inputClass}
            value={form.type}
            onChange={(e) =>
              setForm({ ...form, type: /** @type {CallOffType} */ (e.target.value) })
            }
          >
            {CALL_OFF_TYPES.map((ty) => (
              <option key={ty} value={ty}>
                {t(`co.type.${ty}`)}
              </option>
            ))}
          </select>
        </div>
      )}
      <div>
        <label htmlFor="co-edit-reason" className={labelClass}>
          {t('co.field.reason')}
        </label>
        <textarea
          id="co-edit-reason"
          rows={2}
          className={inputClass}
          value={form.reason}
          onChange={(e) => setForm({ ...form, reason: e.target.value })}
        />
      </div>
    </div>
  );
};

export default DraftFields;
