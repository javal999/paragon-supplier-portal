/** @import React from 'react' */
import { useTranslation } from 'react-i18next';
import Data from '@components/ui-v2/Data';
import { formatIDR } from '@lib/format';
/** @import { RescheduleView } from '@services/data/types' */
/** @import { PlanChangeBaseline, SelectionEffect } from '@services/engine/reschedule' */
import { pctShare, pw } from '../utils';

/**
 * @typedef {object} PlanChangeGuardProps
 * @property {RescheduleView} run the reschedule read
 * @property {number} selectedCount how many selected proposals belong to the warehouse shown
 * @property {SelectionEffect} effect what the selection frees, saves and costs
 * @property {PlanChangeBaseline | null} guardAfter the plan-change share if the selection were sent
 */

/**
 * BR-09, the plan-change guard: how many proposals are selected (and how many
 * sit inside the lead time), how PTI's share of schedules changed inside the
 * lead time would move if they were sent, and what the selection frees and
 * saves against its penalty.
 * @type {React.FC<PlanChangeGuardProps>}
 */
const PlanChangeGuard = ({ run, selectedCount, effect, guardAfter }) => {
  const { t } = useTranslation();
  return (
    <section
      className="bg-bg-surface border border-border-subtle rounded-lg p-4 mb-6"
      data-testid="rs-guard"
    >
      <h2 className="text-section text-text-primary mb-1">{t('rs.guard.title')}</h2>
      <p className="text-xs text-text-tertiary mb-3">
        {t('rs.guard.intro', {
          weeks: run.planChangeWindowWeeks
        })}
      </p>
      <dl className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
        <div>
          <dt className="text-text-secondary">{t('rs.guard.selected')}</dt>
          <dd>
            <Data data-testid="rs-guard-selected">{selectedCount}</Data>{' '}
            <span className="text-xs text-text-tertiary">
              {t('rs.guard.inside', { count: effect.insideLeadTime })}
            </span>
          </dd>
        </div>
        <div>
          <dt className="text-text-secondary">{t('rs.guard.share')}</dt>
          <dd>
            <Data data-testid="rs-guard-before">{pctShare(run.planChange.share)}</Data> →{' '}
            <Data data-testid="rs-guard-after">{pctShare(guardAfter?.share ?? null)}</Data>
          </dd>
        </div>
        <div>
          <dt className="text-text-secondary">{t('rs.guard.effect')}</dt>
          <dd>
            <Data data-testid="rs-selection-freed">
              {t('rs.palletWeeks', { value: pw(effect.freedOverPalletWeeks) })}
            </Data>{' '}
            ·{' '}
            <Data data-testid="rs-selection-saving">
              {formatIDR(Math.round(effect.rentSavedIdr))}
            </Data>
            <div className="text-xs text-text-tertiary">
              {t('rs.guard.penalty')} <Data>{formatIDR(Math.round(effect.changePenaltyIdr))}</Data>
            </div>
          </dd>
        </div>
      </dl>
      <p className="text-xs text-text-tertiary mt-2">{t('rs.guard.callOffs')}</p>
    </section>
  );
};

export default PlanChangeGuard;
