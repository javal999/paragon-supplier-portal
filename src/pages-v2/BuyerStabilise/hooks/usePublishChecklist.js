import { useTranslation } from 'react-i18next';
import { useDataHealth, useOrderPlan, useReschedule } from '@services/query/hooks';
/** @import { StabiliseRunView } from '@services/data/types' */
/** @import { ChecklistItem } from '../const' */
import { FORECAST_PAGES } from '@components/forecast/forecastPages';
import {
  STEP_HEALTH,
  failingChecks,
  recommendedOrders,
  weeksOverCapacity
} from '@components/forecast/cycleCounts';

/**
 * The four items of the publish checklist (F-01), derived at render from the
 * reads the linked pages use, by their own counting rules (`cycleCounts.js`);
 * nothing is stored (FUX2-R3). An item whose read has not answered says so
 * (`unknown`) rather than pass.
 * @param {StabiliseRunView | null} run the engine run, for the held Trade-off weeks
 * @returns {ChecklistItem[]}
 */
const usePublishChecklist = (run) => {
  const { t } = useTranslation();
  const health = useDataHealth();
  const orderPlan = useOrderPlan();
  const reschedule = useReschedule();
  const unknown = t('stb.check.unknown');

  // The page's own Data health chip count (the checks that reach this step).
  const failing = health.data ? failingChecks(health.data, STEP_HEALTH.publish) : null;
  const overCapacity = reschedule.data ? weeksOverCapacity(reschedule.data) : null;
  const orders = orderPlan.data ? recommendedOrders(orderPlan.data) : null;
  // Held Trade-off weeks are the weeks beyond the band with no reason
  // (`stabilise.ts`: an override is the same week WITH one), the weeks the
  // detail table marks "needs a reason".
  const heldNoReason = run ? run.totals.counts.bandHeld + run.totals.counts.cumulativeHeld : null;

  /** @type {ChecklistItem[]} */
  const items = [
    {
      id: 'inputs',
      state: failing === null ? 'unknown' : failing > 0 ? 'attention' : 'pass',
      text:
        failing === null
          ? unknown
          : failing > 0
            ? t('fux.steps.checks', { count: failing })
            : t('fux.steps.pass'),
      to: FORECAST_PAGES.dataHealth.path,
      linkText: t(FORECAST_PAGES.dataHealth.titleKey)
    },
    {
      id: 'orders',
      state: orders === null ? 'unknown' : 'count',
      text: orders === null ? unknown : t('fux.count.toOrder', { count: orders }),
      to: FORECAST_PAGES.whatToOrder.path,
      linkText: t(FORECAST_PAGES.whatToOrder.titleKey)
    },
    {
      id: 'warehouse',
      state: overCapacity === null ? 'unknown' : overCapacity > 0 ? 'attention' : 'pass',
      text: overCapacity === null ? unknown : t('fux.count.overCapacity', { count: overCapacity }),
      to: FORECAST_PAGES.makeRoom.path,
      linkText: t(FORECAST_PAGES.makeRoom.titleKey)
    },
    {
      id: 'held',
      state: heldNoReason === null ? 'unknown' : heldNoReason > 0 ? 'attention' : 'pass',
      text: heldNoReason === null ? unknown : t('stb.check.held.state', { count: heldNoReason }),
      to: FORECAST_PAGES.publish.path,
      linkText: t('stb.check.held.link')
    }
  ];
  return items;
};

export default usePublishChecklist;
