/** @import React from 'react' */
import { lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';

// P-04 (IA-B05) — the consolidation view (demand against confirmation against
// fulfilment, SDC-1b) is this page's second tab. It is the same component its
// own page rendered, lazy-loaded as before so the grid engine stays in its own
// chunk, and embedded: the host page owns the shell and the header.
const BuyerCollaboration = lazy(() => import('@pages-v2/BuyerCollaboration'));

/**
 * The Consolidation tab: a line saying it reads the published sample plan,
 * then the consolidation view.
 * @type {React.FC}
 */
const ConsolidationTab = () => {
  const { t } = useTranslation();
  return (
    <div
      role="tabpanel"
      aria-label={t('fc.pti.pageTab.consolidation')}
      data-testid="fc-pti-consolidation-tab"
    >
      <p
        className="mb-4 rounded border-l-2 border-info bg-info-soft px-4 py-3 text-sm text-text-primary"
        data-testid="fc-pti-consolidation-note"
      >
        {t('fc.pti.pageTab.consolidationNote')}
      </p>
      <Suspense
        fallback={
          <p role="status" className="py-10 text-center text-sm text-text-tertiary">
            {t('loadingState.message')}
          </p>
        }
      >
        <BuyerCollaboration embedded />
      </Suspense>
    </div>
  );
};

export default ConsolidationTab;
