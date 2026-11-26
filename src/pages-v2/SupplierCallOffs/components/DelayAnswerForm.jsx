/** @import React from 'react' */
import { useTranslation } from 'react-i18next';
import Button from '@components/ui-v2/Button';
import { formatDate } from '@lib/format';
/** @import { CallOffView } from '@services/transitions/callOffRules' */
import { pendingDelay } from '@services/transitions/callOffRules';
import { inputClass, labelClass } from '../../callOffs/callOffDisplay';

/**
 * DRC-5 (BL-191) — the answer to a delay PTI proposed because the LTP dropped:
 * approve (the need date moves) or reject (the call-off stays on its date).
 * Both are the confirm verb with `delayAnswer`, so the call-off is confirmed
 * either way. Moved out of `SupplierCallOffs.jsx` by the Phase 5 page split
 * (no behaviour change).
 * @type {React.FC<{ view: CallOffView; comment: string; setComment: (c: string) => void; busy: boolean; onAnswer: (a: 'approve' | 'reject') => void }>}
 */
const DelayAnswerForm = ({ view, comment, setComment, busy, onAnswer }) => {
  const { t } = useTranslation();
  const d = pendingDelay(view.callOff);
  if (!d) return null;
  const from = formatDate(d.fromNeedDate);
  return (
    <div className="space-y-3" data-testid="supplier-calloff-delay-answer">
      <p className="text-sm text-text-primary">
        {t('co.delay.sup.intro', { from, to: formatDate(d.toNeedDate) })}
      </p>
      {/* UCX-P9 (BL-370) — LTP explained where the supplier meets it, as a
          sentence (a drawer is a form; UCX-D30 keeps the (i) off it). */}
      <p className="text-xs text-text-tertiary" data-testid="supplier-calloff-delay-ltp">
        {t('co.delay.sup.ltp')}
      </p>
      {d.reason ? (
        <p className="text-sm text-text-secondary">
          <span className="text-text-tertiary">{t('co.delay.sup.reason')}: </span>“{d.reason}”
        </p>
      ) : null}
      <div>
        <label htmlFor="co-delay-comment" className={labelClass}>
          {t('co.respond.comment')}
        </label>
        <textarea
          id="co-delay-comment"
          rows={2}
          className={inputClass}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
      </div>
      <div className="flex flex-wrap justify-end gap-2">
        <Button
          variant="secondary"
          disabled={busy}
          onClick={() => onAnswer('reject')}
          data-testid="supplier-calloff-delay-reject"
        >
          {t('co.delay.sup.reject', { from })}
        </Button>
        <Button
          variant="outline"
          disabled={busy}
          onClick={() => onAnswer('approve')}
          data-testid="supplier-calloff-delay-approve"
        >
          {t('co.delay.sup.approve')}
        </Button>
      </div>
    </div>
  );
};

export default DelayAnswerForm;
