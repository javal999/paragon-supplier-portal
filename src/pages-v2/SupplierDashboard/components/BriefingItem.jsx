/** @import React from 'react' */
/** @import { TFunction } from 'i18next' */
/** @import { useToast } from '@hooks/useToast' */
/** @import { ActionItem } from '../const' */
import { Clock } from 'lucide-react';

// Ledger register (DP2-FLAG-01) for the briefing rows: severity reads as a 3px
// left edge + a small dot, not a colored chip — consistent with the widget cards.
/** @type {Record<ActionItem['badgeVariant'], string>} */
const BRIEF_EDGE = {
  danger: 'border-l-danger',
  warning: 'border-l-warning',
  info: 'border-l-text-tertiary',
  success: 'border-l-success',
  neutral: 'border-l-border-subtle'
};
/** @type {Record<ActionItem['badgeVariant'], string>} */
const BRIEF_DOT = {
  danger: 'bg-danger',
  warning: 'bg-warning',
  info: 'bg-text-tertiary',
  success: 'bg-success',
  neutral: 'bg-text-tertiary'
};

/**
 * @typedef {object} BriefingItemProps
 * @property {ActionItem} action  The briefing card to render.
 * @property {boolean} hasDivider  Whether a card follows this one (draws the bottom border).
 * @property {ReturnType<typeof useToast>['toast']} toast
 * @property {(id: string) => void} dismiss  Hides the card for this session (page state).
 * @property {TFunction} t
 */

/**
 * One briefing card: severity edge and dot, title, description, and the CTA
 * that toasts and dismisses the card. Moved out of `SupplierDashboard.jsx` by
 * the Phase 5 page split (no behaviour change).
 * @type {React.FC<BriefingItemProps>}
 */
const BriefingItem = ({ action, hasDivider, toast, dismiss, t }) => {
  const Icon = action.Icon;
  return (
    <div
      className={`px-5 py-4 flex gap-4 items-start border-l-[3px] ${
        BRIEF_EDGE[action.badgeVariant]
      } ${hasDivider ? 'border-b border-border-subtle' : ''}`}
    >
      <div className="w-9 h-9 rounded-md flex items-center justify-center shrink-0 bg-bg-hover">
        <Icon size={16} className="text-text-tertiary" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2.5 mb-1 flex-wrap">
          <span className="text-sm font-semibold text-text-primary">{action.title}</span>
          <span className="inline-flex items-center gap-1.5 text-xs text-text-tertiary">
            <span
              aria-hidden="true"
              className={`h-1.5 w-1.5 rounded-full ${BRIEF_DOT[action.badgeVariant]}`}
            />
            {action.badge}
          </span>
        </div>
        <div className="text-xs text-text-secondary mb-2">{action.desc}</div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              // R1 — the description was a hardcoded template
              // literal asserting "<label> workflow initiated."
              // It was EN-only (both locales bypassed) and it was
              // FALSE: this handler dismisses the card and does
              // nothing else. `action.title` stays verbatim —
              // it is sample-briefing DATA, not a claim.
              toast({
                variant: 'info',
                title: action.title,
                description: t('supplierDashboard.brief.toast.desc')
              });
              dismiss(action.id);
            }}
            className="inline-flex items-center gap-1 text-sm font-medium text-action hover:underline"
          >
            {action.btnLabel}
            <span aria-hidden="true">→</span>
          </button>
          <span className="text-xs text-text-tertiary inline-flex items-center gap-1">
            <Clock size={11} /> {action.time}
          </span>
        </div>
      </div>
    </div>
  );
};

export default BriefingItem;
