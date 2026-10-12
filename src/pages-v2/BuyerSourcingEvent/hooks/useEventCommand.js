import { useTranslation } from 'react-i18next';
import { useToast } from '@hooks/useToast';
import { useRfxCommand } from '@services/query/commandHooks';

/**
 * Dispatch one RFx command and toast its outcome: the success key on a
 * recorded act, the refusal (with the verb's reason) on a failed one.
 * @typedef {(vars: Parameters<ReturnType<typeof useRfxCommand>['mutate']>[0], successKey: string) => void} RunCommand
 */

/**
 * The event page's one command path. Every act on the page (extend, open or
 * close a round, award, cancel an award, mark it raised in SAP) goes through
 * `run`, so the toast rule is written once. Moved out of
 * `BuyerSourcingEvent.jsx` by the Phase 5 page split (no behaviour change).
 * @returns {{ command: ReturnType<typeof useRfxCommand>; run: RunCommand }}
 */
export function useEventCommand() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const command = useRfxCommand();

  /**
   * @param {Parameters<typeof command.mutate>[0]} vars
   * @param {string} successKey
   */
  function run(vars, successKey) {
    return command.mutate(vars, {
      onSuccess: (res) =>
        toast(
          res.status === 'failed'
            ? { variant: 'error', title: t('rfx.toast.refused', { reason: res.reason ?? '' }) }
            : { variant: 'success', title: t(successKey) }
        ),
      onError: () => toast({ variant: 'error', title: t('rfx.toast.refused', { reason: '' }) })
    });
  }

  return { command, run };
}
