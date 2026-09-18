// ────────────────────────────────────────────────────────────────────────────
// The RFx event-type tabs — REQ-E03-02 / -03 / -04, hub navigation §3.7.
//
// The menu carries ONE sourcing item per persona ("RFI, RFQ, RFP" for PTI,
// "Invitations" for suppliers). Three event types behind one menu item means
// the switch belongs on the PAGE, not in the sidebar — NV-06's "features
// outside the MVP are hidden from the menu" read forwards: a menu that grows an
// item per document type stops being a map of the hub's sections.
//
// They are LINKS rather than local tab state so a task on Home can open one
// directly, and NV-03's "a menu item stays highlighted on its detail pages"
// keeps working — every tab lives under the same menu path.
// ────────────────────────────────────────────────────────────────────────────

import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export type RfxPersona = 'buyer' | 'supplier';

// i18n-defer: not copy — a tab id, a route path and an i18n KEY. The reader-visible
// words are `labelKey`, resolved through `t()` in the component body below; a
// literal here would be the key, not the sentence.
const PATHS: Record<RfxPersona, readonly { readonly id: string; readonly to: string; readonly labelKey: string }[]> = {
  buyer: [
    { id: 'rfi', to: '/buyer/sourcing/rfi', labelKey: 'rfx.tabs.rfi' },
    { id: 'rfq', to: '/buyer/sourcing', labelKey: 'rfx.tabs.rfq' },
    { id: 'rfp', to: '/buyer/sourcing/rfp', labelKey: 'rfx.tabs.rfp' },
  ],
  supplier: [
    { id: 'rfi', to: '/supplier/rfqs/rfi', labelKey: 'rfx.tabs.rfi' },
    { id: 'rfq', to: '/supplier/rfqs', labelKey: 'rfx.tabs.rfq' },
    { id: 'rfp', to: '/supplier/rfqs/rfp', labelKey: 'rfx.tabs.rfp' },
  ],
};

/** Counts per tab, so a buyer sees where the work is without opening each one. */
export interface RfxTabCounts {
  readonly rfi?: number;
  readonly rfq?: number;
  readonly rfp?: number;
}

const RfxTabs: React.FC<{ persona: RfxPersona; active: string; counts?: RfxTabCounts }> = ({
  persona,
  active,
  counts,
}) => {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  return (
    <nav
      aria-label={t('hub.nav.section.sourcing')}
      data-testid="rfx-tabs"
      className="flex items-center gap-6 border-b border-border-subtle mb-4"
    >
      {PATHS[persona].map((tab) => {
        const selected = tab.id === active || pathname === tab.to;
        const count = counts?.[tab.id as keyof RfxTabCounts];
        return (
          <Link
            key={tab.id}
            to={tab.to}
            aria-current={selected ? 'page' : undefined}
            data-testid={`rfx-tab-${tab.id}`}
            className={`-mb-px flex items-center gap-2 py-3 text-sm transition-colors ${
              selected
                ? 'text-action-hover font-semibold border-b-2 border-action'
                : 'text-text-tertiary border-b-2 border-transparent hover:text-text-secondary'
            }`}
          >
            <span>{t(tab.labelKey)}</span>
            {typeof count === 'number' && (
              <span
                className={`inline-flex items-center justify-center rounded-full px-2 h-5 text-xs font-semibold ${
                  selected ? 'bg-action-soft text-action-hover' : 'bg-bg-hover text-text-tertiary'
                }`}
              >
                {count}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
};

export default RfxTabs;
