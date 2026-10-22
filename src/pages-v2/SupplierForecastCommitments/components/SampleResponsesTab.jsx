/** @import React from 'react' */
import { lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';

// P-04 (IA-S03) — the supplier's earlier responses, incoming-shipment reports
// and published sample lines (SDC-2b / SDC-3b) are this page's second tab. It
// is the same component its own page rendered, lazy-loaded as before, and
// embedded: the host page owns the shell and the header.
const SupplierForecasts = lazy(() => import('@pages-v2/SupplierForecasts'));

/**
 * The Responses & shipments tab: a line saying it reads the published sample
 * plan, then the submission hub with its shipment report action.
 * @type {React.FC}
 */
const SampleResponsesTab = () => {
  const { t } = useTranslation();
  return (
    <div
      role="tabpanel"
      aria-label={t('fc.sup.pageTab.responses')}
      data-testid="fc-sup-responses-tab"
    >
      <p
        className="mb-4 rounded border-l-2 border-info bg-info-soft px-4 py-3 text-sm text-text-primary"
        data-testid="fc-sup-responses-note"
      >
        {t('fc.sup.pageTab.responsesNote')}
      </p>
      <Suspense
        fallback={
          <p role="status" className="py-10 text-center text-sm text-text-tertiary">
            {t('loadingState.message')}
          </p>
        }
      >
        <SupplierForecasts embedded />
      </Suspense>
    </div>
  );
};

export default SampleResponsesTab;
