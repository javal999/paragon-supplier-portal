/** @import React from 'react' */
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { MessageCircle } from 'lucide-react';
import AppShellV2 from '@components/layout-v2/AppShellV2';
import PageHeader from '@components/ui-v2/PageHeader';
import PageMetaLine from '@components/ui-v2/PageMetaLine';
import LivenessPill from '@components/ui-v2/LivenessPill';
import LoadingState from '@components/ui-v2/LoadingState';
import EmptyState from '@components/ui-v2/EmptyState';
import ErrorState from '@components/ui-v2/ErrorState';
import { useUnifiedChase } from '@services/query/chaseHooks';
import { useSuppliers } from '@services/query/hooks';
import ChaseList from './ChaseList';
import { SDC_SIMULATED_NOW } from '@services/sdc';
import { formatDate } from '@lib/format';

// ─────────────────────────────────────────────────────────────────────────────
// BuyerChase (SDC-5d) — the buyer/planner UNIFIED chase surface.
//
// The first VISIBLE chase surface: one card per supplier, WORST-FIRST (the
// reducer already sorts hard > soft, then chaseCount, then supplierId), carrying
// BOTH families — forecast-response staleness (data chase) AND delivery-commitment
// exceptions (nudge / alert / drift × firm/semi-firm). The hard/soft split is
// visible: a firm (JIT) miss reads Urgent (danger); a semi-firm (FRC) or a data
// non-response reads Advisory (warning). RENDER-ONLY — reads the hook, derives
// nothing (the composition runs in the service via the pure 5c reducer).
//
// HONEST + SIMULATED: LivenessPill "Sample" (no live channel send, no SAP). The
// chase is a DERIVED assessment over real fulfillment + real consolidation
// staleness, never fabricated urgency. Channel DISPATCH is DEFERRED — the planner
// pushes through the EXISTING WhatsApp/email chrome; the callout + the per-card
// "Push via WhatsApp" link frame that honestly and open that chrome (no sender is
// built here). Buyer-gated: a supplier persona resolves an empty chase list.
//
// ⚠️ BEING RETIRED (IA P-05). The list now lives on Supplier follow-ups
// (`/buyer/comm-hub?tab=follow-up`), which renders the same ChaseList. This page
// stays only while `AppRouter` and `allRoutes.smoke` still import it; once
// `/buyer/chase` redirects there, delete this file and its spec.
// ─────────────────────────────────────────────────────────────────────────────

/** @type {React.FC} */
const BuyerChase = () => {
  const { t } = useTranslation();
  const query = useUnifiedChase();
  const suppliersQuery = useSuppliers();
  const views = query.data ?? [];

  const CRUMB = [t('chase.crumb.settle'), t('chase.title')];

  // Display join — supplierId → name (falls back to the id for a supplier with no
  // master row). A plain lookup, not a derivation.
  const nameOf = useMemo(() => {
    const map = /** @type {Map<string, string>} */ (new Map());
    for (const s of suppliersQuery.data?.items ?? []) map.set(s.id, s.name);
    return /** @param {string} id */ (id) => map.get(id) ?? id;
  }, [suppliersQuery.data]);

  if (query.isPending) return <LoadingState breadcrumb={CRUMB} />;
  if (query.isError)
    return <ErrorState breadcrumb={CRUMB} error={query.error} onRetry={() => query.refetch()} />;
  if (views.length === 0)
    return (
      <EmptyState
        breadcrumb={CRUMB}
        title={t('chase.title')}
        subtitle={t('chase.subtitle')}
        message={t('chase.empty')}
      />
    );

  return (
    <AppShellV2>
      <PageHeader
        breadcrumb={CRUMB}
        title={t('chase.title')}
        subtitle={t('chase.subtitle')}
        actions={<LivenessPill capability="deliveryAgreements" />}
      />

      <PageMetaLine className="-mt-6 mb-6 flex items-center gap-3">
        <span>
          {t('chase.meta.summary', { count: views.length, date: formatDate(SDC_SIMULATED_NOW) })}
        </span>
        <LivenessPill capability="deliveryAgreements" />
      </PageMetaLine>

      {/* The list itself (cards + its honesty callout) is the shared ChaseList,
          the same component Supplier follow-ups renders on its first tab. */}
      <ChaseList
        views={views}
        nameOf={nameOf}
        renderAction={() => (
          // Push affordance — opens the EXISTING WhatsApp chrome; no sender is
          // built here (channel dispatch deferred).
          <Link
            to="/buyer/comm-hub"
            className="inline-flex items-center gap-1.5 rounded-md border border-action px-3 py-1.5 text-sm font-medium text-action hover:bg-action-soft transition-colors"
          >
            <MessageCircle size={14} />
            {t('chase.pushWhatsApp')}
          </Link>
        )}
      />
    </AppShellV2>
  );
};

export default BuyerChase;
