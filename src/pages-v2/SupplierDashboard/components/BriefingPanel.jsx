/** @import React from 'react' */
/** @import { TFunction } from 'i18next' */
/** @import { useToast } from '@hooks/useToast' */
/** @import { ActionItem } from '../const' */
import { CheckCircle2 } from 'lucide-react';
import StatusPill from '@components/ui-v2/StatusPill';
import BriefingItem from './BriefingItem';

/**
 * @typedef {object} BriefingPanelProps
 * @property {string} today  The briefing date line, read from the hub clock by the page.
 * @property {ActionItem[]} activeActions  The cards not yet dismissed, in render order.
 * @property {number} remaining  `activeActions.length`, as the page counts it.
 * @property {ReturnType<typeof useToast>['toast']} toast
 * @property {(id: string) => void} dismiss  Hides a card; the state lives in the page.
 * @property {TFunction} t
 */

/**
 * "Today's briefing": the sample-data header with the remaining-count pill,
 * then either the all-done state or one `BriefingItem` per active card. Moved
 * out of `SupplierDashboard.jsx` by the Phase 5 page split (no behaviour
 * change); the dismissed-card state stays in the page.
 * @type {React.FC<BriefingPanelProps>}
 */
const BriefingPanel = ({ today, activeActions, remaining, toast, dismiss, t }) => (
  <section className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm overflow-hidden">
    <div className="px-5 py-4 border-b border-border-subtle flex items-center justify-between">
      <div>
        <div className="flex items-center gap-2">
          <div className="text-sm font-bold text-text-primary">
            {t('supplierDashboard.briefing.title')}
          </div>
          <StatusPill variant="neutral">{t('supplierDashboard.briefing.sampleData')}</StatusPill>
        </div>
        <div className="text-xs text-text-tertiary mt-0.5">{today}</div>
      </div>
      <StatusPill variant={remaining > 0 ? 'warning' : 'success'}>
        {remaining > 0
          ? remaining === 1
            ? t('supplierDashboard.briefing.actions.one', { count: remaining })
            : t('supplierDashboard.briefing.actions.other', { count: remaining })
          : t('supplierDashboard.briefing.allClear')}
      </StatusPill>
    </div>
    {remaining === 0 ? (
      <div className="py-10 px-6 text-center">
        <div className="inline-flex w-12 h-12 rounded-full bg-success-soft items-center justify-center mb-3">
          <CheckCircle2 size={24} className="text-success" />
        </div>
        <div className="text-base font-semibold text-success mb-1">
          {t('supplierDashboard.briefing.done.title')}
        </div>
        <div className="text-sm text-text-tertiary">
          {t('supplierDashboard.briefing.done.body')}
        </div>
      </div>
    ) : (
      <div className="flex flex-col">
        {activeActions.map((action, idx) => (
          <BriefingItem
            key={action.id}
            action={action}
            hasDivider={idx < activeActions.length - 1}
            toast={toast}
            dismiss={dismiss}
            t={t}
          />
        ))}
      </div>
    )}
  </section>
);

export default BriefingPanel;
