/** @import React from 'react' */
import { useMemo, useState } from 'react';
import { Upload } from 'lucide-react';
import AppShellV2 from '@components/layout-v2/AppShellV2';
import PageHeader from '@components/ui-v2/PageHeader';
import PageMetaLine from '@components/ui-v2/PageMetaLine';
import ProvenanceMarker from '@components/ui-v2/ProvenanceMarker';
import BulkActionsBar from '@components/ui-v2/BulkActionsBar';
import { useToast } from '@hooks/useToast';
import { useCurrentIdentity } from '@context/CurrentIdentityContext';
import NoSupplierIdentity from '@components/ui-v2/NoSupplierIdentity';
import LoadingState from '@components/ui-v2/LoadingState';
import ErrorState from '@components/ui-v2/ErrorState';
import EmptyState from '@components/ui-v2/EmptyState';
/** @import { CategoryFilter, ExpiryFilter } from './const' */
import { useDocuments, useVendorQualifications } from '@services/query/hooks';
import QualificationPanel from '../qualification/QualificationPanel';
import { documentExpiry } from '@services/data/dayProjection';
import { documentDisplayState } from '@services/data/documentDisplayState';
import { useUrlEnumParam } from '@hooks/useUrlEnumParam';
import { formatDate } from '@lib/format';
import { useTranslation } from 'react-i18next';
import { DECLARED_PRESENT } from '@services/data/fixturePresent';
import { useDeclarationPanel } from './hooks/useDeclarationPanel';
import DocumentAlerts from './components/DocumentAlerts';
import DocumentKpis from './components/DocumentKpis';
import DocumentFilters from './components/DocumentFilters';
import DocumentTable from './components/DocumentTable';
import BpjphNotice from './components/BpjphNotice';
import RenewalLessonPanel from './components/RenewalLessonPanel';
import DeclarationPanel from './components/DeclarationPanel';

// ⚠️ ANCHORED — this surface rendered values derived from anchored
// fixture data against the WALL CLOCK, so what a reader saw moved every day
// with no commit involved. Module-scope `DECLARED_PRESENT`, the shipped
// pattern from `BuyerShipments` / `BuyerGoodsReceipt`, and behaviour-
// preserving for the same reason they are: this surface's families shift by
// `DECLARED_PRESENT - anchor` and so does this pin, so every rendered
// day-count is answered at the instant the fixtures were authored for.
//
// ⚠️ SESSION-WRITTEN STATE KEEPS THE WALL CLOCK. This constant is for READ
// projections only. A timestamp stamped onto something the user just did is a
// fact about this session, not about the fixture set, and anchoring one would
// tell the reader their own action happened weeks ago.
const TODAY = DECLARED_PRESENT;

// ⚠️ **`STATUS_VARIANT` IS DELETED RATHER THAN LEFT UNUSED**, and so is the
// `DocStatus` alias that existed only to type it. `tsc` would not have said
// a word — `noUnusedLocals` is off — so a stored-keyed tone map would have
// sat here indefinitely, one import away from being wired back by a future
// edit that saw a map and assumed it was the one to use. `DISPLAY_STATE_TONE`
// is now the only tone map this page can reach.

// ⚠️ The page-local `daysUntil` is GONE. It read `Date.now()` inside a pure-
// looking helper, which made this page's expiry story untestable and — more to
// the point — made it ONE OF THREE different answers to "what day is it?".
// `services/data/dayProjection` is now the only one; `now` is captured once
// below and injected, so this page and `SupplierCertsExpiringWidget` cannot
// drift apart again.

/**
 * The supplier's documents page (`/supplier/documents`): header with the
 * declare action, the qualification panel, the refused / expired / expiring /
 * awaiting banners, five KPI tiles, the search and `?expiry=` / `?status=`
 * chips, the documents table, the BPJPH notice, and the renewal-walkthrough
 * and declaration side panels. Owns every piece of state that must survive the
 * loading / empty early returns (filters, search, the walkthrough flag and —
 * through `useDeclarationPanel` — the declaration panel and its form). Split
 * into a page folder by Phase 5 (no behaviour change).
 * @type {React.FC}
 */
const SupplierDocuments = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { identity } = useCurrentIdentity();
  const { supplierId, supplierName } = identity;
  const docsCrumb = [t('supplierDocuments.crumb.settle'), t('supplierDocuments.crumb.myDocuments')];
  const docsQuery = useDocuments();
  // Material G1 (MR-10 AC-06) — this supplier's own level, narrowed in the read model.
  const qualifications = useVendorQualifications();
  const myQualification = qualifications.data?.items.find((q) => q.supplierId === supplierId);
  const docs = docsQuery.data?.items ?? [];
  // ONE clock read for the whole page, captured once so every expiry figure on
  // screen is answered against the SAME instant. Deps are empty deliberately:
  // a re-render must not silently move the day under a rendered count.
  // (`BuyerCompliance` is the precedent.)
  const nowIso = TODAY;
  const [filterCat, setFilterCat] = useState(/** @type {CategoryFilter} */ ('All'));
  const [expiryFilter, setExpiryFilter] = useState(/** @type {ExpiryFilter} */ ('all'));
  // Deep-link read: `?expiry=expired|expiring|due` narrows the "certificates
  // expired or expiring" task (`due` is both kinds, IA P-08: the task counts
  // both, so no single kind may stand for it), and `?status=awaiting-upload`
  // the "Documents PTI asked for" task (IA P-03).
  useUrlEnumParam(
    'expiry',
    /** @type {('all' | 'expired' | 'expiring' | 'due')[]} */ ([
      'all',
      'expired',
      'expiring',
      'due'
    ]),
    setExpiryFilter
  );
  useUrlEnumParam(
    'status',
    /** @type {'awaiting-upload'[]} */ (['awaiting-upload']),
    setExpiryFilter
  );
  const [search, setSearch] = useState('');
  const panel = useDeclarationPanel(supplierId);
  // I3.4 (FORK-1=(c)) — the halal-renewal walkthrough. Read-only guidance; a
  // shared SIHALAL path (no per-document branching; the `certBasis` this once
  // named was deleted at D-A). Opened from the
  // per-document "Renew" action AND the standalone "How to renew" entry.
  const [lessonOpen, setLessonOpen] = useState(false);

  const filtered = useMemo(
    () =>
      docs.filter((d) => {
        const matchCat = filterCat === 'All' || d.category === filterCat;
        const state = documentDisplayState(d, nowIso);
        const matchExpiry =
          expiryFilter === 'all' ||
          state === expiryFilter ||
          (expiryFilter === 'due' && (state === 'expired' || state === 'expiring'));
        const q = search.toLowerCase();
        const matchSearch =
          q === '' || d.name.toLowerCase().includes(q) || d.issuedBy.toLowerCase().includes(q);
        return matchCat && matchExpiry && matchSearch;
      }),
    [filterCat, expiryFilter, search, docs, nowIso]
  );

  const expiringSoon = useMemo(
    () => docs.filter((d) => documentExpiry(d, nowIso) === 'expiring'),
    [docs, nowIso]
  );
  const expired = useMemo(
    () => docs.filter((d) => documentExpiry(d, nowIso) === 'expired'),
    [docs, nowIso]
  );
  const awaitingUpload = useMemo(() => docs.filter((d) => d.status === 'Awaiting Upload'), [docs]);
  // The stored state, not a projection — a refusal is an act that was recorded,
  // so unlike expiry it is never derived from the clock.
  const refused = useMemo(() => docs.filter((d) => d.status === 'Rejected'), [docs]);
  // ⚠️ **COMPUTED, AND IT IS THE THIRD KPI IN THIS BLOCK RATHER THAN THE
  // FIRST.** `expiringSoon` and `expired` above have read the clock since the
  // projection landed; this one still asked the STORED field, so the same
  // row could in principle be counted Valid here and expiring three lines up.
  // It never was — the fixture agrees — but two counters over one population
  // answering to two sources is the divergence, not the disagreement it has
  // not yet produced. `awaitingUpload` and `refused` below stay STORED on
  // purpose: those are lifecycle facts and no clock has an opinion on them.
  const validCount = useMemo(
    () => docs.filter((d) => documentDisplayState(d, nowIso) === 'valid').length,
    [docs, nowIso]
  );

  // Same instant as every expiry figure above — a page that says "as of <date>"
  // must mean the date it actually reckoned against, not a second clock read.
  const today = formatDate(nowIso);

  if (!supplierId) return <NoSupplierIdentity />;
  if (docsQuery.isPending) return <LoadingState breadcrumb={docsCrumb} />;
  if (docsQuery.isError)
    return (
      <ErrorState
        breadcrumb={docsCrumb}
        error={docsQuery.error}
        onRetry={() => docsQuery.refetch()}
      />
    );
  if (docs.length === 0)
    return (
      <EmptyState
        breadcrumb={docsCrumb}
        title={t('supplierDocuments.empty.title')}
        subtitle={t('supplierDocuments.empty.subtitle', {
          name: supplierName ?? t('supplierDocuments.empty.supplierFallback')
        })}
        message={t('supplierDocuments.empty.message')}
      />
    );

  return (
    <AppShellV2>
      <PageHeader
        breadcrumb={docsCrumb}
        title={t('supplierDocuments.header.title')}
        subtitle={t('supplierDocuments.header.subtitle', {
          name: supplierName ?? t('supplierDocuments.common.supplierFallback')
        })}
        actions={
          <BulkActionsBar
            primary={{
              label: t('supplierDocuments.action.declareCert'),
              icon: Upload,
              onClick: panel.openNewUpload
            }}
          />
        }
      />

      <PageMetaLine className="-mt-6 mb-6">
        {docs.length === 1
          ? t('supplierDocuments.meta.summary.one', { count: docs.length, date: today })
          : t('supplierDocuments.meta.summary.other', { count: docs.length, date: today })}
        {/* D-CENSUS-8 — `supplierDocuments` is an F0.4 flow that is REGISTERED but not
            a wired CommandTarget, so it derives SIMULATED and shows the feed axis
            only. Certificate validity here is authored, not verified. */}
        <ProvenanceMarker capability="supplierDocuments" className="ml-3 align-middle" />
      </PageMetaLine>

      {myQualification ? (
        <QualificationPanel
          row={myQualification}
          reader="supplier"
          onDeclare={panel.openDeclareFor}
        />
      ) : null}

      <DocumentAlerts
        refused={refused}
        expired={expired}
        expiringSoon={expiringSoon}
        awaitingUpload={awaitingUpload}
      />

      <DocumentKpis
        total={docs.length}
        validCount={validCount}
        expiringCount={expiringSoon.length}
        expiredCount={expired.length}
        awaitingCount={awaitingUpload.length}
      />

      <DocumentFilters
        search={search}
        setSearch={setSearch}
        filterCat={filterCat}
        setFilterCat={setFilterCat}
        expiryFilter={expiryFilter}
        setExpiryFilter={setExpiryFilter}
        shown={filtered.length}
        total={docs.length}
      />

      <DocumentTable
        filtered={filtered}
        nowIso={nowIso}
        openUploadFor={panel.openUploadFor}
        setLessonOpen={setLessonOpen}
        toast={toast}
      />

      <BpjphNotice setLessonOpen={setLessonOpen} />

      <RenewalLessonPanel lessonOpen={lessonOpen} setLessonOpen={setLessonOpen} />

      <DeclarationPanel
        panelMode={panel.panelMode}
        panelTitle={panel.panelTitle}
        activeDoc={panel.activeDoc}
        uploaded={panel.uploaded}
        form={panel.form}
        setForm={panel.setForm}
        supplyAvailability={panel.supplyAvailability}
        pending={panel.pending}
        closePanel={panel.closePanel}
        recordDeclaration={panel.recordDeclaration}
      />
    </AppShellV2>
  );
};

export default SupplierDocuments;
