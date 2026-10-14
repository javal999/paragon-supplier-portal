/** @import React from 'react' */
import { useMemo } from 'react';
import { Clock, Eye, CheckCircle2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import KpiCard from '@components/ui-v2/KpiCard';
import SubTabs from '@components/ui-v2/SubTabs';
import SearchBar from '@components/ui-v2/SearchBar';
import EmptyState from '@components/ui-v2/EmptyState';
/** @import { SupplierApplication, SupplierApplicationStatus } from '@services/data/types' */
/** @import { Tab } from '../const' */
import { TAB_STATUSES } from '../const';
import ApplicationsTable from './ApplicationsTable';

/**
 * @typedef {object} ApplicationsListProps
 * @property {SupplierApplication[]} applications every row the page read
 * @property {string[]} crumb                     the page breadcrumb, for the empty states
 * @property {Tab} tab                            the active sub-tab (page state)
 * @property {(tab: Tab) => void} onTabChange
 * @property {string} search                      the search text (page state)
 * @property {(search: string) => void} onSearchChange
 * @property {(id: string) => void} onSelect      opens the review panel on a row
 */

/**
 * The loaded body of the page: the three KPI tiles, the status sub-tabs and
 * search, then the roster table or one of its two empty states. Rendered only
 * once the read has settled without error; the tab and search state live in
 * the page so they survive a reload of the read. Moved out of
 * `BuyerSupplierApplications` by the Phase 5 page split.
 * @type {React.FC<ApplicationsListProps>}
 */
const ApplicationsList = ({
  applications,
  crumb,
  tab,
  onTabChange,
  search,
  onSearchChange,
  onSelect
}) => {
  const { t } = useTranslation();

  const counts = useMemo(() => {
    /** @param {SupplierApplicationStatus} s */
    const by = (s) => applications.filter((a) => a.status === s).length;
    return {
      waiting: by('Submitted'),
      inReview: by('Under Review'),
      decided: by('Approved') + by('Rejected')
    };
  }, [applications]);

  const filtered = useMemo(() => {
    const wanted = TAB_STATUSES[tab];
    const q = search.trim().toLowerCase();
    return applications.filter((a) => {
      if (wanted && !wanted.includes(a.status)) return false;
      if (!q) return true;
      return (
        a.companyName.toLowerCase().includes(q) || a.applicationNumber.toLowerCase().includes(q)
      );
    });
  }, [applications, tab, search]);

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <KpiCard
          icon={Clock}
          eyebrow={t('applications.kpi.waiting')}
          value={counts.waiting.toString()}
        />
        <KpiCard
          icon={Eye}
          eyebrow={t('applications.kpi.inReview')}
          value={counts.inReview.toString()}
        />
        <KpiCard
          icon={CheckCircle2}
          eyebrow={t('applications.kpi.decided')}
          value={counts.decided.toString()}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <SubTabs
          options={[
            { id: 'all', label: t('applications.tab.all'), count: applications.length },
            { id: 'waiting', label: t('applications.tab.waiting'), count: counts.waiting },
            { id: 'inReview', label: t('applications.tab.inReview'), count: counts.inReview },
            { id: 'decided', label: t('applications.tab.decided'), count: counts.decided }
          ]}
          value={tab}
          onChange={onTabChange}
        />
        <SearchBar
          value={search}
          onChange={onSearchChange}
          placeholder={t('applications.search.placeholder')}
        />
      </div>

      {applications.length === 0 ? (
        <EmptyState
          breadcrumb={crumb}
          title={t('applications.empty.title')}
          subtitle={t('applications.empty.subtitle')}
          message={t('applications.empty.body')}
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          breadcrumb={crumb}
          title={t('applications.empty.filtered.title')}
          subtitle={t('applications.empty.filtered.subtitle')}
          message={t('applications.empty.filtered.body')}
        />
      ) : (
        <ApplicationsTable rows={filtered} onSelect={onSelect} />
      )}
    </>
  );
};

export default ApplicationsList;
