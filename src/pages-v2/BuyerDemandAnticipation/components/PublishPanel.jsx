/** @import React from 'react' */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Button from '@components/ui-v2/Button';
import Data from '@components/ui-v2/Data';
import ModalOverlay from '@components/ui-v2/ModalOverlay';
import { HandoffNotice } from '@components/ui-v2/HandoffNotice';
import { useVerbAvailability } from '@hooks/useVerbAvailability';
import { useToast } from '@hooks/useToast';
import { useDemandAnticipationCommand } from '@services/query/commandHooks';
import { pairKey } from '@services/transitions/demandAnticipationRules';
import { formatNumber } from '@lib/format';
/** @import { DemandAnticipationRow } from '@services/transitions/demandAnticipationRules' */
import { agreementCandidates, weekDates, weekLabel } from '../display';

// ─────────────────────────────────────────────────────────────────────────────
// DRC-2 (BL-188) — "Publish demand anticipation" for the current planning
// week. ONE verb, ONE notice in its slot (§76): a seat without
// `forecast:publish` sees the handoff notice instead of the button, and the
// confirm is a mode of this panel, so it is gated with it — a confirm left
// open while the seat narrows renders the notice, not the commit (§84).
//
// The confirm is also where the planner records a supplier's agreement to
// take a remainder in the first week outside the horizon [Owner A8]: one
// checkbox per supplier × material with a remainder today. Without it the
// remainder goes to the horizon's last week. Publishing records the week's
// figures; publishing again the same week supersedes them, and both stay on
// record. Commit is off when neither the figures nor the agreements changed.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @type {React.FC<{
 *   rows: readonly DemandAnticipationRow[];
 *   planningWeek: string;
 *   changed: number;
 * }>}
 */
const PublishPanel = ({ rows, planningWeek, changed }) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const availability = useVerbAvailability('forecast:publish');
  const publish = useDemandAnticipationCommand();
  const [confirming, setConfirming] = useState(false);
  const candidates = agreementCandidates(rows);
  const recorded = candidates
    .filter((r) => r.agreedFirstOutside)
    .map((r) => pairKey(r.supplierId, r.materialCode));
  const [agreed, setAgreed] = useState(/** @type {string[] | null} */ (null));
  const chosen = agreed ?? recorded;
  const agreementsChanged = [...chosen].sort().join(',') !== [...recorded].sort().join(',');
  const week = weekLabel(planningWeek);

  if (availability.kind !== 'held')
    return (
      <HandoffNotice availability={availability} testId="handoff-demand-anticipation-publish" />
    );

  const close = () => {
    setConfirming(false);
    setAgreed(null);
  };

  const submit = async () => {
    const res = await publish.mutateAsync({ planningWeek, agreedFirstOutside: chosen });
    close();
    if (res.status === 'failed')
      toast({ variant: 'error', title: t('demandAnt.publish.failed'), description: res.reason });
    else toast({ variant: 'success', title: t('demandAnt.publish.done', { week }) });
  };

  /** @param {string} key */
  const toggle = (key) =>
    setAgreed(chosen.includes(key) ? chosen.filter((k) => k !== key) : [...chosen, key]);

  return (
    <div data-testid="dant-publish">
      <Button
        variant="outline"
        onClick={() => setConfirming(true)}
        disabled={rows.length === 0 || publish.isPending}
        data-testid="dant-publish-button"
      >
        {t('demandAnt.publish.button', { week })}
      </Button>
      {confirming ? (
        <ModalOverlay
          label={t('demandAnt.publish.confirmTitle')}
          onClose={close}
          testId="dant-publish-confirm"
        >
          <div className="w-full max-w-lg bg-bg-surface border border-border-subtle rounded-lg shadow-lg p-5">
            <h2 className="text-section text-text-primary mb-2">
              {t('demandAnt.publish.confirmTitle')}
            </h2>
            <p className="text-sm text-text-primary mb-2" data-testid="dant-publish-confirm-body">
              {t('demandAnt.publish.confirmBody', { week, dates: weekDates([planningWeek]) })}
            </p>
            <p className="text-sm text-text-secondary mb-3" data-testid="dant-publish-changed">
              {t('demandAnt.publish.confirmChanged', { count: changed })}
            </p>
            {candidates.length > 0 ? (
              <fieldset className="mb-3" data-testid="dant-publish-agreements">
                <legend className="text-sm font-semibold text-text-primary mb-1">
                  {t('demandAnt.agree.legend')}
                </legend>
                <p className="text-xs text-text-tertiary mb-2">{t('demandAnt.agree.help')}</p>
                <ul className="space-y-1">
                  {candidates.map((r) => {
                    const key = pairKey(r.supplierId, r.materialCode);
                    const id = `dant-agree-${r.supplierId}-${r.materialCode}`;
                    const last = r.today.horizonWeeks[r.today.horizonWeeks.length - 1];
                    return (
                      <li key={key} className="flex items-start gap-2 text-sm">
                        <input
                          id={id}
                          type="checkbox"
                          className="mt-1"
                          checked={chosen.includes(key)}
                          onChange={() => toggle(key)}
                          data-testid={id}
                        />
                        <label htmlFor={id} className="text-text-primary">
                          {r.supplierName} · <Data>{r.materialCode}</Data> —{' '}
                          {t('demandAnt.agree.option', {
                            qty: formatNumber(r.today.remainder),
                            outside: weekLabel(/** @type {string} */ (r.today.firstOutsideWeek)),
                            last: weekLabel(last)
                          })}
                        </label>
                      </li>
                    );
                  })}
                </ul>
              </fieldset>
            ) : null}
            <p className="text-xs text-text-tertiary mb-4">{t('demandAnt.publish.confirmKept')}</p>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={close} data-testid="dant-publish-cancel">
                {t('demandAnt.publish.cancel')}
              </Button>
              <Button
                variant="outline"
                onClick={() => void submit()}
                disabled={publish.isPending || (changed === 0 && !agreementsChanged)}
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
