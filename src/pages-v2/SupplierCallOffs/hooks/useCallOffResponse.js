import { useTranslation } from 'react-i18next';
import { useToast } from '@hooks/useToast';
import { useRefusalText } from '@hooks/useRefusalText';
/** @import { CallOffCommandVars } from '@services/query/commandHooks' */
import { useCallOffCommand } from '@services/query/commandHooks';
/** @import { CallOffView } from '@services/transitions/callOffRules' */
import { proposedDeliveries } from '@services/transitions/callOffRules';
import { numberOf } from '../../callOffs/callOffDisplay';
import { EMPTY } from '../const';

/**
 * The call-off command and the handlers that send it: `run` sends one command
 * and toasts its outcome (resetting the form on success), `proposal` reads the
 * chosen answer the way the verb reads it, and `sendAnswer` sends the respond
 * form's answer. Moved out of `SupplierCallOffs.jsx` by the Phase 5 page split
 * (no behaviour change); the form state stays owned by the page.
 * @param {typeof EMPTY} form  The page's response-and-dispatch form.
 * @param {(f: typeof EMPTY) => void} setForm  Its setter.
 */
export function useCallOffResponse(form, setForm) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const refusalText = useRefusalText();
  const command = useCallOffCommand();

  /**
   * @param {CallOffCommandVars} vars
   * @param {string} success
   */
  const run = async (vars, success) => {
    try {
      const res = await command.mutateAsync(vars);
      if (res.status === 'failed') {
        toast({
          variant: 'warning',
          title: t('co.toast.refused'),
          description: refusalText(res.reason) ?? res.reason ?? ''
        });
        return;
      }
      toast({ variant: 'success', title: success });
      setForm(EMPTY);
    } catch {
      toast({ variant: 'error', title: t('co.toast.refused') });
    }
  };

  /**
   * What the chosen answer proposes, read the way the verb reads it.
   * @param {CallOffView} v
   */
  const proposal = (v) => {
    if (form.answer === 'reject') return null;
    const input = {
      confirmedDate:
        form.answer === 'changes' ? (form.date === '' ? undefined : form.date) : form.date,
      confirmedQty: numberOf(form.quantity),
      deliveries: [
        { quantity: numberOf(form.qty1), date: form.date1 },
        { quantity: numberOf(form.qty2), date: form.date2 }
      ]
    };
    const p = proposedDeliveries(v.callOff, form.answer, input);
    return 'deliveries' in p ? { deliveries: p.deliveries, input } : null;
  };

  /** @param {CallOffView} v */
  const sendAnswer = (v) => {
    const id = v.callOff.id;
    const comment = form.comment.trim() || undefined;
    const success = t(`co.toast.answer.${form.answer}`, { number: v.callOff.callOffNumber });
    if (form.answer === 'reject') {
      void run({ verb: 'reject', id, reason: form.reason.trim() }, success);
      return;
    }
    const p = proposal(v);
    if (!p) return;
    /** @type {CallOffCommandVars} */
    const vars =
      form.answer === 'confirm'
        ? { verb: 'confirm', id, comment }
        : form.answer === 'newDate'
          ? { verb: 'confirmNewDate', id, confirmedDate: form.date, comment }
          : form.answer === 'changes'
            ? {
                verb: 'confirmChanges',
                id,
                confirmedQty: numberOf(form.quantity),
                ...(form.date ? { confirmedDate: form.date } : {}),
                comment
              }
            : { verb: 'confirmPartial', id, deliveries: [...p.deliveries], comment };
    void run(vars, success);
  };

  return { command, run, proposal, sendAnswer };
}
