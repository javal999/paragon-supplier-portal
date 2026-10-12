/** @import React from 'react' */
/** @import { CategoryFilter, StatusFilter, Row } from './const' */
/** @import { ComplianceDisplayStatus } from '@services/data/types' */
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Download, Shield, Database, FilePlus2 } from 'lucide-react';
import AppShellV2 from '@components/layout-v2/AppShellV2';
import PageHeader from '@components/ui-v2/PageHeader';
import PageMetaLine from '@components/ui-v2/PageMetaLine';
import BulkActionsBar from '@components/ui-v2/BulkActionsBar';
import SidePanel from '@components/ui-v2/SidePanel';
import LivenessPill from '@components/ui-v2/LivenessPill';
import { isLive, readinessNote } from '@services/liveness';
import { formatDate } from '@lib/format';
import { useToast } from '@hooks/useToast';
import { useComplianceRegistry, useDocuments } from '@services/query/hooks';
import { HandoffNotice } from '@components/ui-v2/HandoffNotice';
import {
  BPJPH_MANDATE_DATE,
  computeStatus,
  daysRemaining,
  schemeValid,
  remindEligible
} from '@services/data/complianceProjection';
import { certCategory } from '@lib/complianceView';
import { useRefusalText, useDataErrorText } from '@hooks/useRefusalText';
import { TODAY } from './const';
import { useDocumentReview } from './hooks/useDocumentReview';
import { useDocumentRequest } from './hooks/useDocumentRequest';
import ReviewQueue from './components/ReviewQueue';
import BpjphMandate from './components/BpjphMandate';
import ComplianceKpis from './components/ComplianceKpis';
import ComplianceFilters from './components/ComplianceFilters';
import ComplianceRegistryTable from './components/ComplianceRegistryTable';
import RequestPanelBody from './components/RequestPanelBody';
import RequestPanelFooter from './components/RequestPanelFooter';

// Dates on this surface go through the canonical `formatDate` (lib/format), the
// mechanism the tree already uses at 101 call sites. The local helper this
// replaces hardcoded 'en-GB', so a certificate expiry rendered "15 Dec 2027" to
// an Indonesian reader while the SAME field, on the SAME domain's widgets
// (BuyerComplianceWidget / SupplierCertsExpiringWidget, which already import
// formatDate), rendered "15 Des 2027". A regulatory record disagreeing with its
// own summary tile is worse than either rendering alone. §47.
//
// Phase 5 page split (no behaviour change): this file keeps the page shell —
// the reads, the filters, every computed projection, the header actions and
// the request panel's authority guard. The review queue's state lives in
// `useDocumentReview`, the request panel's in `useDocumentRequest` (both
// called here, so their state lives as long as the page); each section lives
// in `components/`.

/** @type {React.FC} */
const BuyerCompliance = () => {
  const { t } = useTranslation();
  const refusalText = useRefusalText();
  const dataErrorText = useDataErrorText();
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState(/** @type {StatusFilter} */ ('All'));
  const [categoryFilter, setCategoryFilter] = useState(/** @type {CategoryFilter} */ ('All'));

  // Now injected once per mount — the projection is pure & deterministic (no
  // clock read inside pure code); rows recompute only if the read changes.
  const now = TODAY;
  const query = useComplianceRegistry();
  // §82 — the review queue. A BUYER scope gets the cross-supplier superset from
  // `applySupplierScope`, which is what makes a compliance officer able to see
  // every supplier's pending declaration from one page.
  const docsQuery = useDocuments();
  const reviewQueue = useMemo(
    () => (docsQuery.data?.items ?? []).filter((d) => d.status === 'Under Review'),
    [docsQuery.data]
  );
  const reviewer = useDocumentReview(t, refusalText, toast);
  const requester = useDocumentRequest(t, refusalText, dataErrorText, toast);
  const { request, requestOpen, setRequestOpen, closeRequest } = requester;

  const items = query.data?.items ?? [];

  /** @type {Row[]} */
  const rows = useMemo(
    () =>
      items.map((entry) => ({
        entry,
        status: computeStatus(entry, now),
        days: daysRemaining(entry, now),
        category: certCategory(entry.certType),
        remind: remindEligible(entry),
        schemeOk: schemeValid(entry, now)
      })),
    [items, now]
  );

  const filtered = useMemo(
    () =>
      rows.filter((r) => {
        if (statusFilter !== 'All' && r.status !== statusFilter) return false;
        if (categoryFilter !== 'All' && r.category !== categoryFilter) return false;
        return true;
      }),
    [rows, statusFilter, categoryFilter]
  );

  const counts = useMemo(() => {
    /** @param {ComplianceDisplayStatus} s */
    const by = (s) => rows.filter((r) => r.status === s).length;
    return {
      expired: by('Expired'),
      expiring: by('Expiring'),
      missing: by('Missing'),
      valid: by('Valid'),
      underReview: by('Under Review')
    };
  }, [rows]);

  // BPJPH compliance is SCHEME-AWARE (HALAL-ISSUER-BLIND mechanism): a halal cert
  // counts as compliant only when `schemeValid` holds — a MUI-legacy cert whose
  // dates say Valid is NON-compliant from the mandate date. The mechanism renders
  // here; the finding stays DOWNGRADED (SIMULATED, not closed) until real issuer
  // data backs it — the surface is honestly marked Sample via <LivenessPill>.
  const bpjph = useMemo(() => {
    const halal = rows.filter((r) => r.category === 'Halal');
    return { compliant: halal.filter((r) => r.schemeOk).length, total: halal.length };
  }, [rows]);

  const deadline = useMemo(() => {
    // ⚠️ THE ABSOLUTE CLASS, READ RATHER THAN RESTATED. This was a hardcoded
    // `new Date('2026-10-17')` — a duplicate of the regulatory constant that
    // would NOT have moved with it. A date that must not move is as much a
    // declaration as one that must, and it belongs to its owner.
    const target = new Date(BPJPH_MANDATE_DATE);
    const today = new Date(TODAY);
    const daysLeft = Math.ceil((target.getTime() - today.getTime()) / 86_400_000);
    const pct = Math.max(0, Math.min(100, (daysLeft / 365) * 100));
    return { daysLeft, pct };
  }, []);

  const today = formatDate(TODAY);

  return (
    <AppShellV2>
      <PageHeader
        breadcrumb={[t('compliance.crumb.intelligence'), t('compliance.crumb.tracker')]}
        title={t('compliance.header.title')}
        subtitle={t('compliance.header.subtitle')}
        actions={
          /* ⚠️ **EXPORT LEFT THE PRIMARY SLOT, AND DP2-BUTTON-01 SAYS WHY:
             *an Export never occupies the primary slot*. It sat there because
             it was the only action this page had. The primary act on a
             compliance tracker is asking a supplier for the certificate the
             tracker says is missing — so the slot now holds the act, and
             Export takes the secondary register it always belonged in. */
          <div className="flex items-center gap-2">
            <BulkActionsBar
              actions={[
                {
                  label: t('compliance.action.exportReport'),
                  icon: Download,
                  onClick: () =>
                    toast({
                      variant: 'info',
                      title: t('compliance.toast.exporting')
                    })
                }
              ]}
              primary={
                request.kind === 'held'
                  ? {
                      label: t('compliance.request.action'),
                      icon: FilePlus2,
                      onClick: () => setRequestOpen(true)
                    }
                  : undefined
              }
            />
            {/* Withheld renders as pending-with-an-owner, in the verb's own
                slot — never as a disabled control and never as silence. */}
            {request.kind !== 'held' && (
              <HandoffNotice availability={request} testId="handoff-supplierdoc-request" />
            )}
          </div>
        }
      />

      <PageMetaLine className="-mt-6 mb-6 flex items-center gap-3">
        <span>{t('compliance.meta.summary', { count: rows.length, date: today })}</span>
        {/* Honest-render: capability="compliance" derives SIMULATED (no wired
            CommandTarget) AND is harvest-gated (I3.3) → amber "Sample — awaiting
            Track-R harvest". Green is structurally unreachable (two-gate guard). */}
        <LivenessPill capability="compliance" />
      </PageMetaLine>

      {/* Waiting-state banner (I3.3, second form) — the SPECIFIC readiness message:
          this surface is proven and wired to the seam, waiting for the Track-R
          certificate harvest to land the real registry. Rendered only while the
          capability is harvest-gated; it disappears the moment the two-gate flip
          lands (LIVENESS-DATASOURCE-01). Distinct from the legal-deadline banner
          below (that is about the mandate; this is about data liveness). */}
      {!isLive('compliance') && readinessNote('compliance') && (
        <div className="bg-bg-hover border-l-2 border-warning rounded px-4 py-3 mb-4 flex items-start gap-3">
          <Database size={16} className="text-warning-hover shrink-0 mt-0.5" />
          <div className="text-sm text-text-secondary">
            <strong className="text-text-primary">{t('compliance.readiness.title')}</strong>{' '}
            {t('compliance.readiness.body')}
          </div>
        </div>
      )}

      {/* ── §82 · COMPLIANCE'S REVIEW QUEUE ────────────────────────────────
          ⚠️ **THIS SECTION EXISTS BECAUSE ITS ABSENCE WAS THE FINDING.** The
          supplier-document verbs were authored at F0.4 and `ruled-unsurfaced` as
          *"a verification pipeline rather than a screen"* — so a declared
          document landed in `Under Review` and **no buyer surface in the tree
          read a `SupplierDocument` at all** (derived: the three readers were
          `SupplierDocuments`, `SupplierDashboard`, `SupplierCertsExpiringWidget`,
          every one supplier-side). Building the supplier's way in without this
          would ship the dead-end shape in the other direction: not unread by the
          gate, but unread by the person whose act it awaits.

          ⚠️ **IT SITS ABOVE THE REGISTRY, NOT INSIDE IT, AND THE TWO ARE
          DIFFERENT OBJECTS.** The table below is the certificate REGISTRY — what
          Paragon believes it holds. This is a QUEUE — what somebody has to
          decide about. Folding them into one list would make a supplier's
          unverified claim look like a registry fact, which is exactly what
          `lifecycleState` exists to keep apart. */}
      {reviewQueue.length > 0 && (
        <ReviewQueue reviewQueue={reviewQueue} reviewer={reviewer} t={t} />
      )}

      <BpjphMandate bpjph={bpjph} deadline={deadline} t={t} />

      <ComplianceKpis counts={counts} t={t} />

      <ComplianceFilters
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        categoryFilter={categoryFilter}
        setCategoryFilter={setCategoryFilter}
        filteredCount={filtered.length}
        totalCount={rows.length}
        t={t}
      />

      <ComplianceRegistryTable filtered={filtered} toast={toast} t={t} />

      <div className="bg-info-soft border-l-2 border-info rounded px-4 py-3 text-sm text-text-primary flex items-start gap-2">
        <Shield size={14} className="text-info shrink-0 mt-0.5" />
        <span>
          <strong className="text-info">{t('compliance.phase2.title')}</strong>{' '}
          {t('compliance.phase2.body')}
        </span>
      </div>
      {/* ── §WAVE E · THE REQUEST PANEL ────────────────────────────────────
          ⚠️ **THE PANEL IS MOUNTED ONLY WHEN THE SEAT HOLDS THE ATOM, AND THAT
          IS THE MODE BEING GATED RATHER THAN THE DOOR (§84).** `SupplierOrders`
          shipped a live commit because a notice guarded ONE entrance to a mode
          three ways reachable, and a comment asserting the other doors were
          unreachable was the only thing holding it up — it was false. Here the
          MODE itself is conditional, so there is no second door to miss, and a
          seat NARROWED WHILE THE PANEL STANDS OPEN loses the panel rather than
          just the button (`SupplierShipments` is the precedent to copy).

          `SidePanel`'s own contract (#280) makes a closed panel ABSENT rather
          than hidden, so this guard is about AUTHORITY, not about leakage. */}
      {request.kind === 'held' && (
        <SidePanel
          open={requestOpen}
          onClose={closeRequest}
          title={t('compliance.request.panel.title')}
          footerActions={<RequestPanelFooter requester={requester} t={t} />}
        >
          <RequestPanelBody requester={requester} t={t} />
        </SidePanel>
      )}
    </AppShellV2>
  );
};

export default BuyerCompliance;
