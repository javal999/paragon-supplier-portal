/** @import React from 'react' */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Button from '@components/ui-v2/Button';
import ModalOverlay from '@components/ui-v2/ModalOverlay';
import { HandoffNotice } from '@components/ui-v2/HandoffNotice';
import { useVerbAvailability } from '@hooks/useVerbAvailability';
import { useToast } from '@hooks/useToast';
import { useDemandAnticipationCommand } from '@services/query/commandHooks';
import { formatDate } from '@lib/format';
import { weekDates, weekRange } from '../display';

// ─────────────────────────────────────────────────────────────────────────────
// CAP-10 BR-01 — "Publish demand anticipation" for the hub weeks it would
// freeze. ONE verb, ONE notice in its slot (§76): a seat without
// `forecast:publish` sees the handoff notice instead of the button, and the
// confirm is a mode of this panel, so it is gated with it — a confirm left
// open while the seat narrows renders the notice, not the commit (§84).
// CAP-D17: it freezes the fixed horizon holding the current hub week, once.
// Once that horizon is frozen the button is off and names the next horizon
// and the date it can be published from.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @type {React.FC<{
 *   horizon: readonly string[];
 *   next: readonly string[];
 *   frozen: boolean;
 *   toFreeze: number;
 * }>}
 */
const PublishPanel = ({ horizon, next, frozen, toFreeze }) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const availability = useVerbAvailability('forecast:publish');
  const publish = useDemandAnticipationCommand();
  const [confirming, setConfirming] = useState(false);
  const range = weekRange(horizon);

  if (availability.kind !== 'held')
    return (
      <HandoffNotice availability={availability} testId="handoff-demand-anticipation-publish" />
    );

  const submit = async () => {
    const res = await publish.mutateAsync({ horizonStart: horizon[0] });
    setConfirming(false);
    if (res.status === 'failed')
      toast({ variant: 'error', title: t('demandAnt.publish.failed'), description: res.reason });
    else toast({ variant: 'success', title: t('demandAnt.publish.done', { range }) });
  };

  return (
    <div data-testid="dant-publish">
      <Button
        variant="outline"
        onClick={() => setConfirming(true)}
        disabled={frozen || toFreeze === 0 || publish.isPending}
        data-testid="dant-publish-button"
      >
        {t('demandAnt.publish.button', { range })}
      </Button>
      {frozen ? (
        <p className="mt-2 text-xs text-text-secondary" data-testid="dant-publish-horizon-frozen">
          {t('demandAnt.publish.horizonFrozen', {
            current: range,
            next: weekRange(next),
            date: formatDate(next[0])
          })}
        </p>
      ) : null}
      {confirming && !frozen ? (
        <ModalOverlay
          label={t('demandAnt.publish.confirmTitle')}
          onClose={() => setConfirming(false)}
          testId="dant-publish-confirm"
        >
          <div className="w-full max-w-md bg-bg-surface border border-border-subtle rounded-lg shadow-lg p-5">
            <h2 className="text-section text-text-primary mb-2">
              {t('demandAnt.publish.confirmTitle')}
            </h2>
            <p className="text-sm text-text-primary mb-2" data-testid="dant-publish-confirm-body">
              {t('demandAnt.publish.confirmBody', { range, dates: weekDates(horizon) })}
            </p>
            <p className="text-sm text-text-secondary mb-2">
              {t('demandAnt.publish.confirmNew', { count: toFreeze })}
            </p>
            <p className="text-xs text-text-tertiary mb-4">{t('demandAnt.publish.confirmKept')}</p>
            <div className="flex justify-end gap-2">
              <Button
                variant="secondary"
                onClick={() => setConfirming(false)}
                data-testid="dant-publish-cancel"
              >
                {t('demandAnt.publish.cancel')}
              </Button>
              <Button
                variant="outline"
                onClick={() => void submit()}
                disabled={publish.isPending || toFreeze === 0}
                data-testid="dant-publish-commit"
              >
                {t('demandAnt.publish.confirm')}
              </Button>
            </div>
          </div>
        </ModalOverlay>
      ) : null}
    </div>
  );
};

export default PublishPanel;
