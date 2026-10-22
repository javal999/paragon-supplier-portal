/** @import React from 'react' */
import { useTranslation } from 'react-i18next';
import Button from '@components/ui-v2/Button';
/** @import { CallOffView, ToleranceCheck } from '@services/transitions/callOffRules' */
import { ToleranceFindings, inputClass, labelClass } from '../../callOffs/callOffDisplay';
/** @import { EMPTY } from '../const' */
import { ANSWERS } from '../const';

/**
 * The supplier's answer to a call-off awaiting confirmation: confirm, confirm
 * with a new date or with changes, partially confirm (2 deliveries) or reject
 * with a reason, plus the tolerance rule that will apply before it is sent.
 * Moved out of `SupplierCallOffs.jsx` by the Phase 5 page split (no behaviour
 * change).
 * `check`:  The tolerance rule read on the answer being typed — null while it is not yet readable.
 * @type {React.FC<{ view: CallOffView; form: typeof EMPTY; setForm: (f: typeof EMPTY) => void; busy: boolean; check: ToleranceCheck | null; onSend: () => void; }>}
 */
const RespondForm = ({ view, form, setForm, busy, check, onSend }) => {
  const { t } = useTranslation();
  const c = view.callOff;
  /** @param {Partial<typeof EMPTY>} patch */
  const set = (patch) => setForm({ ...form, ...patch });
  const ready = form.answer === 'reject' ? form.reason.trim() !== '' : check !== null;
  /**
   * @param {string} id
   * @param {string} label
   * @param {string} value
   * @param {keyof typeof EMPTY} key
   * @param {'date' | 'qty'} type
   */
  const field = (id, label, value, key, type) => (
    <div>
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      <input
        id={id}
        type={type === 'date' ? 'date' : 'text'}
        inputMode={type === 'qty' ? 'numeric' : undefined}
        className={inputClass}
        value={value}
        onChange={(e) => set(/** @type {Partial<typeof EMPTY>} */ ({ [key]: e.target.value }))}
      />
    </div>
  );

  return (
    <div className="space-y-3">
      <fieldset>
        <legend className={labelClass}>{t('co.respond.answer')}</legend>
        <div className="space-y-1">
          {ANSWERS.map((a) => (
            <label key={a} className="flex items-center gap-2 text-sm text-text-primary">
              <input
                type="radio"
                name="co-answer"
                value={a}
                checked={form.answer === a}
                onChange={() => set({ answer: a })}
              />
              {t(`co.respond.option.${a}`)}
            </label>
          ))}
        </div>
      </fieldset>

      {form.answer === 'newDate' &&
        field('co-new-date', t('co.respond.newDate'), form.date, 'date', 'date')}
      {form.answer === 'changes' && (
        <div className="grid grid-cols-2 gap-3">
          {field(
            'co-changes-qty',
            t('co.field.quantity', { uom: c.uom }),
            form.quantity,
            'quantity',
            'qty'
          )}
          {field('co-changes-date', t('co.respond.dateOptional'), form.date, 'date', 'date')}
        </div>
      )}
      {form.answer === 'partial' && (
        <div className="grid grid-cols-2 gap-3">
          {field('co-part1-qty', t('co.respond.deliveryQty', { n: 1 }), form.qty1, 'qty1', 'qty')}
          {field(
            'co-part1-date',
            t('co.respond.deliveryDate', { n: 1 }),
            form.date1,
            'date1',
            'date'
          )}
          {field('co-part2-qty', t('co.respond.deliveryQty', { n: 2 }), form.qty2, 'qty2', 'qty')}
          {field(
            'co-part2-date',
            t('co.respond.deliveryDate', { n: 2 }),
            form.date2,
            'date2',
            'date'
          )}
        </div>
      )}

      {form.answer === 'reject' ? (
        <div>
          <label htmlFor="co-reject-reason" className={labelClass}>
            {t('co.field.reason')}
          </label>
          <textarea
            id="co-reject-reason"
            rows={2}
            className={inputClass}
            value={form.reason}
            onChange={(e) => set({ reason: e.target.value })}
          />
        </div>
      ) : (
        <div>
          <label htmlFor="co-answer-comment" className={labelClass}>
            {t('co.respond.comment')}
          </label>
          <textarea
            id="co-answer-comment"
            rows={2}
            className={inputClass}
            value={form.comment}
            onChange={(e) => set({ comment: e.target.value })}
          />
        </div>
      )}

      {/* CR-05 — before the answer is sent: the rule that will apply to it, its
          reason, and what follows. The verb re-applies the same rule. */}
      {form.answer !== 'reject' && check !== null && (
        <div className="space-y-1">
          <p
            className={`text-xs ${check.within ? 'text-success' : 'text-warning-hover'}`}
            data-testid="supplier-calloff-tolerance"
          >
            {t(check.within ? 'co.respond.within' : 'co.respond.outside')}
          </p>
          <ToleranceFindings
            check={check}
            uom={c.uom}
            needDate={c.needDate}
            testId="supplier-calloff-tolerance-rule"
          />
        </div>
      )}

      <div className="flex justify-end">
        <Button variant="outline" disabled={busy || !ready} onClick={onSend}>
          {t(form.answer === 'reject' ? 'co.respond.sendReject' : 'co.respond.send')}
        </Button>
      </div>
    </div>
  );
};

export default RespondForm;
