/** @import React from 'react' */
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Upload, Download, FileSpreadsheet, UserPlus, ChevronRight } from 'lucide-react';
import AppShellV2 from '@components/layout-v2/AppShellV2';
import PageHeader from '@components/ui-v2/PageHeader';
import PageMetaLine from '@components/ui-v2/PageMetaLine';
import ProvenanceMarker from '@components/ui-v2/ProvenanceMarker';
import BulkActionsBar from '@components/ui-v2/BulkActionsBar';
import SubTabs from '@components/ui-v2/SubTabs';
import FilterChipsBar from '@components/ui-v2/FilterChipsBar';
import SearchBar from '@components/ui-v2/SearchBar';
import StatusPill from '@components/ui-v2/StatusPill';
import { statusTone } from '@lib/statusTone';
import Table from '@components/ui-v2/Table';
import TableHeader, { TableHeaderCell } from '@components/ui-v2/TableHeader';
import TableRow from '@components/ui-v2/TableRow';
import TableCell from '@components/ui-v2/TableCell';
import Data from '@components/ui-v2/Data';
import LoadingState from '@components/ui-v2/LoadingState';
import ErrorState from '@components/ui-v2/ErrorState';
import EmptyState from '@components/ui-v2/EmptyState';
import { useComplianceRegistry, useSuppliers } from '@services/query/hooks';
import { useCategoryLabel } from '@hooks/useCategoryLabel';
import { sdcClock } from '@services/sdc/clock';
/** @import { CertValidity, PerformanceBand } from '@services/sourcing/supplierFilters' */
import {
  bandOfLetter,
  certificateValidity,
  matchesSupplierFilters
} from '@services/sourcing/supplierFilters';
import SupplierFilterBar, {
  bandLabel,
  certLabel,
  useSupplierFilterLabels,
  useSupplierFilterParams
} from './suppliers/SupplierFilterBar';
import { SupplierStatus, SupplierTier } from '@app-types/supplier.types';

/** @type {Record<string, string>} */
const COUNTRY_FLAG = {
  ID: 'ID',
  MY: 'MY',
  DE: 'DE',
  FR: 'FR',
  CN: 'CN',
  SG: 'SG',
  IN: 'IN'
};

/**
 * @param {string} iso
 * @returns {string}
 */
const formatDate = (iso) => {
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
};

/** @typedef {'suppliers' | 'invitations'} GroupTab */
/** @typedef {'active' | 'inactive' | 'all'} StatusFilter */

/**
 * BL-52 — the certificate state's tone: semantic colour only for true state.
 * @type {Record<CertValidity, 'success' | 'warning' | 'danger'>}
 */
const CERT_TONE = {
  valid: 'success',
  expiring: 'warning',
  expiredOrMissing: 'danger'
};

/** @type {React.FC} */
const BuyerSuppliers = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const cl = useCategoryLabel();
  const suppliersQuery = useSuppliers();
  const suppliers = useMemo(() => suppliersQuery.data?.items ?? [], [suppliersQuery.data]);
  // BL-52 — the certificate registry the validity filter reads (REQ-E03-01 BR-05).
  const registryQuery = useComplianceRegistry();
  const [group, setGroup] = useState(/** @type {GroupTab} */ ('suppliers'));
  const [statusFilter, setStatusFilter] = useState(/** @type {StatusFilter} */ ('all'));
  const [search, setSearch] = useState('');
  // BL-52 — certificate validity, performance band and country, in the address.
  const { filters, setFilters } = useSupplierFilterParams();
  const filterLabels = useSupplierFilterLabels();

  /** Each supplier's BR-05 facts, derived at read — never stored (law 0.5). */
  const facts = useMemo(() => {
    const registry = registryQuery.data?.items ?? [];
    const now = sdcClock.now();
    const out =
      /** @type {Map<string, { certificates: CertValidity; band: PerformanceBand; country: string }>} */ (
        new Map()
      );
    for (const s of suppliers) {
      out.set(s.id, {
        certificates: certificateValidity(s, registry, now),
        band: bandOfLetter(s.scorecardGrade),
        country: s.country
      });
    }
    return out;
  }, [suppliers, registryQuery.data]);

  /** The countries the list can offer — derived from the rows. */
  const countries = useMemo(
    () => [...new Set(suppliers.map((s) => s.country))].sort(),
    [suppliers]
  );

  const SUPPLIERS_CRUMB = [t('buyerSuppliers.crumb.acquire'), t('buyerSuppliers.crumb.directory')];

  // Connectivity-tier display labels (WhatsApp/Web Portal/API are proper
  // nouns/protocols; only the "Tier N" word localizes).
  /** @type {Record<SupplierTier, string>} */
  const TIER_LABEL = {
    [SupplierTier.WHATSAPP]: t('buyerSuppliers.tier.whatsapp'),
    [SupplierTier.WEB]: t('buyerSuppliers.tier.web'),
    [SupplierTier.API]: t('buyerSuppliers.tier.api')
  };

  const lastUpdated = useMemo(() => {
    const latest = suppliers.reduce((acc, s) => {
      return s.lastActivityDate > acc ? s.lastActivityDate : acc;
    }, suppliers[0]?.lastActivityDate ?? '');
    return latest ? formatDate(latest) : '';
  }, [suppliers]);

  const counts = useMemo(() => {
    const active = suppliers.filter((s) => s.status === SupplierStatus.ACTIVE).length;
    const inactive = suppliers.length - active;
    return { active, inactive, total: suppliers.length };
  }, [suppliers]);

  const filtered = useMemo(() => {
    return suppliers.filter((s) => {
      if (statusFilter === 'active' && s.status !== SupplierStatus.ACTIVE) return false;
      if (statusFilter === 'inactive' && s.status === SupplierStatus.ACTIVE) return false;
      if (search) {
        const q = search.toLowerCase();
        const hay = `${s.name} ${s.sapBpNumber} ${s.country} ${s.category}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      // BL-52 — composes with the status and search filters above (AND).
      const f = facts.get(s.id);
      if (f && !matchesSupplierFilters(f, filters)) return false;
      return true;
    });
  }, [suppliers, statusFilter, search, facts, filters]);

  if (suppliersQuery.isPending || registryQuery.isPending)
    return <LoadingState breadcrumb={SUPPLIERS_CRUMB} />;
  if (suppliersQuery.isError || registryQuery.isError)
    return (
      <ErrorState
        breadcrumb={SUPPLIERS_CRUMB}
        error={suppliersQuery.error ?? registryQuery.error}
        onRetry={() => {
          suppliersQuery.refetch();
          registryQuery.refetch();
        }}
      />
    );
  if (suppliers.length === 0)
    return (
      <EmptyState
        breadcrumb={SUPPLIERS_CRUMB}
        title={t('buyerSuppliers.empty.title')}
        subtitle={t('buyerSuppliers.empty.subtitle')}
        message={t('buyerSuppliers.empty.message')}
      />
    );

  return (
    <AppShellV2>
      <PageHeader
        breadcrumb={SUPPLIERS_CRUMB}
        title={t('buyerSuppliers.header.title')}
        subtitle={t('buyerSuppliers.header.subtitle')}
        actions={
          <BulkActionsBar
            actions={[
              { label: t('buyerSuppliers.actions.bulkUpload'), icon: Upload },
              { label: t('buyerSuppliers.actions.bulkDownload'), icon: Download },
              { label: t('buyerSuppliers.actions.export'), icon: FileSpreadsheet }
            ]}
            primary={{ label: t('buyerSuppliers.actions.invite'), icon: UserPlus }}
          />
        }
      />

      <PageMetaLine className="-mt-6 mb-6">
        {counts.total === 1
          ? t('buyerSuppliers.meta.records.one', { count: counts.total })
          : t('buyerSuppliers.meta.records.other', { count: counts.total })}{' '}
        · {t('buyerSuppliers.meta.lastUpdated')} <Data>{lastUpdated}</Data>
        {/* REQ-E10-01 — the page-level marker is RETIRED, the same move phase 6b made
            on the scorecard. D-CENSUS-8 put it here because supplier master carried no
            marker at all; since the OTIF column stopped being a stored field and became
            a measure over this hub's own call-offs, a page-level "Sample data" claim is
            FALSE about the one number a buyer reads this table for. The marker moved
            onto the table below, which states which column it does not speak for. */}
      </PageMetaLine>

      <SubTabs
        options={[
          {
            id: 'suppliers',
            label: t('buyerSuppliers.tab.suppliers'),
            count: counts.total
          },
          {
            id: 'invitations',
            label: t('buyerSuppliers.tab.invitations'),
            count: 3
          }
        ]}
        value={group}
        onChange={setGroup}
        className="mb-5"
      />

      <div className="flex items-center justify-between gap-4 mb-4">
        <FilterChipsBar
          options={[
            {
              id: 'active',
              label: t('buyerSuppliers.filter.active'),
              count: counts.active
            },
            {
              id: 'inactive',
              label: t('buyerSuppliers.filter.inactive'),
              count: counts.inactive
            },
            { id: 'all', label: t('buyerSuppliers.filter.all'), count: counts.total }
          ]}
          value={statusFilter}
          onChange={setStatusFilter}
        />
      </div>

      <div className="mb-4">
        {/* BL-52 / REQ-E03-01 BR-05 — certificate validity, band, country. */}
        <SupplierFilterBar
          filters={filters}
          onChange={setFilters}
          countries={countries}
          testIdPrefix="suppliers"
        />
      </div>

      <div className="mb-4">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder={t('buyerSuppliers.search.placeholder')}
        />
      </div>

      <div className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm overflow-hidden">
        {/* The marker sits on the company master — name, country, tier, category,
            compliance and status are all authored — and says in the same breath which
            column it is NOT speaking for, the way the analytics table names its own
            sample columns. `suppliers` is null-backed → feed axis only, no verb axis. */}
        <div
          className="px-4 py-3 border-b border-border-subtle flex flex-wrap items-center gap-3"
          data-testid="suppliers-provenance"
        >
          <ProvenanceMarker capability="suppliers" />
          <span className="text-meta text-text-tertiary">
            {t('buyerSuppliers.col.otif')}: {t('perf.calculated')}
          </span>
        </div>
        <Table>
          <TableHeader>
            <TableHeaderCell>{t('buyerSuppliers.col.supplier')}</TableHeaderCell>
            <TableHeaderCell>{t('buyerSuppliers.col.country')}</TableHeaderCell>
            <TableHeaderCell term="supplierChannel" />
            <TableHeaderCell>{t('buyerSuppliers.col.category')}</TableHeaderCell>
            <TableHeaderCell term="supplierCompliance" />
            <TableHeaderCell className="text-right" term="otif" />
            <TableHeaderCell term="performanceBand" />
            <TableHeaderCell>{t('buyerSuppliers.col.status')}</TableHeaderCell>
            <TableHeaderCell className="text-right">
              {t('buyerSuppliers.col.actions')}
            </TableHeaderCell>
          </TableHeader>
          <tbody>
            {filtered.map((s) => (
              <TableRow
                key={s.id}
                data-testid={`supplier-row-${s.id}`}
                className="cursor-pointer"
                onClick={() => navigate(`/buyer/suppliers/${s.id}`)}
              >
                <TableCell>
                  <div className="font-semibold text-text-primary">{s.name}</div>
                  <Data as="div" className="text-xs text-text-tertiary mt-0.5">
                    {s.sapBpNumber}
                  </Data>
                </TableCell>
                <TableCell>
                  <span className="text-sm text-text-secondary">
                    {COUNTRY_FLAG[s.country] ?? s.country} · {s.city}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="text-sm text-text-secondary">{TIER_LABEL[s.tier]}</span>
                </TableCell>
                <TableCell>
                  <span className="text-sm text-text-secondary">{cl(s.category)}</span>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1.5">
                    {s.halalCertified && <StatusPill variant="success">Halal</StatusPill>}
                    {s.bpomRegistered && <StatusPill variant="info">BPOM</StatusPill>}
                    {!s.halalCertified && !s.bpomRegistered && (
                      <StatusPill variant="neutral">None</StatusPill>
                    )}
                  </div>
                  {/* BL-52 — the certificate validity the filter reads, on the row. */}
                  {facts.get(s.id) && (
                    <div className="mt-1" data-testid={`supplier-cert-${s.id}`}>
                      <StatusPill
                        variant={
                          CERT_TONE[
                            /** @type {NonNullable<ReturnType<typeof facts.get>>} */ (
                              facts.get(s.id)
                            ).certificates
                          ]
                        }
                      >
                        {certLabel(
                          t,
                          /** @type {NonNullable<ReturnType<typeof facts.get>>} */ (facts.get(s.id))
                            .certificates
                        )}
                      </StatusPill>
                    </div>
                  )}
                </TableCell>
                <TableCell className="text-right font-semibold text-text-primary">
                  {s.otif === undefined ? (
                    <span className="font-normal text-text-tertiary">{t('rfx.noHistory')}</span>
                  ) : (
                    <Data>{s.otif}%</Data>
                  )}
                </TableCell>
                <TableCell>
                  <span
                    className="text-sm text-text-secondary"
                    data-testid={`supplier-band-${s.id}`}
                  >
                    {bandLabel(t, facts.get(s.id)?.band ?? 'noHistory')}
                  </span>
                </TableCell>
                <TableCell>
                  <StatusPill variant={statusTone(s.status)}>{s.status}</StatusPill>
                </TableCell>
                <TableCell className="text-right">
                  <ChevronRight size={16} className="text-text-tertiary inline-block" />
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={9}
                  className="text-center text-sm text-text-tertiary py-10"
                  data-testid="suppliers-no-match"
                >
                  {t('buyerSuppliers.table.noMatch')}
                  {/* BL-52 — the empty state names the BR-05 filters in force. */}
                  {filterLabels(filters).length > 0 && (
                    <div className="mt-1 text-xs">
                      {t('supFilter.active', { filters: filterLabels(filters).join(', ') })}
                    </div>
                  )}
                </td>
              </tr>
            )}
          </tbody>
        </Table>
      </div>
    </AppShellV2>
  );
};

export default BuyerSuppliers;
