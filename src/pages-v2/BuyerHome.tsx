import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import AppShellV2 from '../components/layout-v2/AppShellV2';
import PageHeader from '../components/ui-v2/PageHeader';
import SampleDataBadge from '../components/ui-v2/SampleDataBadge';
import {
  useASNs,
  useBuyerInvoices,
  useGoodsReceipts,
  usePurchaseOrders,
  useQuotations,
  useRFQs,
} from '../services/query/hooks';
import { useUnifiedChase } from '../services/query/chaseHooks';
import { useHubRole, type HubRole } from '../components/layout-v2/hubRole';
import * as d from './widgets/buyerDerivations';
import TaskList, { type HomeTask } from './home/TaskList';

// PTI Home — "My tasks" (REQUIREMENTS §3.8 SC-01). Tasks are filtered by the
// PTI role the menu is showing, so a Finance user is not handed a planner's work.

type RoleTask = HomeTask & { readonly roles: readonly Exclude<HubRole, 'ALL'>[] };

const BuyerHome: React.FC = () => {
  const { t } = useTranslation();
  const [role] = useHubRole();
  const invoices = useBuyerInvoices();
  const pos = usePurchaseOrders();
  const rfqs = useRFQs();
  const quotes = useQuotations();
  const grs = useGoodsReceipts();
  const asns = useASNs();
  const chase = useUnifiedChase();

  const tasks = useMemo<HomeTask[]>(() => {
    const now = new Date();
    const poItems = pos.data?.items ?? [];
    const invItems = invoices.data?.items ?? [];
    const rfqItems = rfqs.data?.items ?? [];
    const quoteItems = quotes.data?.items ?? [];
    const grItems = grs.data?.items ?? [];
    const asnItems = asns.data?.items ?? [];
    const chaseRows = chase.data ?? [];
    const all: RoleTask[] = [
      {
        id: 'unack-po',
        roles: ['MP'],
        label: t('hub.home.task.unackPo'),
        count: d.unacknowledgedOver48h(poItems, now).length,
        severity: d.poTier(poItems, now),
        to: '/buyer/orders',
      },
      {
        id: 'chase',
        roles: ['MP'],
        label: t('hub.home.task.chase'),
        count: chaseRows.length,
        severity: chaseRows.some((r) => r.overallSeverity === 'hard') ? 'critical' : 'warning',
        to: '/buyer/chase',
      },
      {
        id: 'receipts',
        roles: ['MP'],
        label: t('hub.home.task.receipts'),
        count: d.grNeedingAction(grItems).length,
        severity: d.grTier(grItems),
        to: '/buyer/goods-receipt',
      },
      {
        id: 'inbound-asn',
        roles: ['MP'],
        label: t('hub.home.task.inboundAsn'),
        count: d.pendingAsns(asnItems).length,
        severity: d.asnTier(asnItems),
        to: '/buyer/shipments',
      },
      {
        id: 'rfq-award',
        roles: ['BUY'],
        label: t('hub.home.task.rfqAward'),
        count: d.pendingAwardRfqs(rfqItems, quoteItems).length,
        severity: d.rfqAwardTier(rfqItems, quoteItems, now),
        to: '/buyer/sourcing',
      },
      {
        id: 'overdue-invoices',
        roles: ['FIN'],
        label: t('hub.home.task.overdueInvoices'),
        count: d.overdueInvoices(invItems).length,
        severity: d.invoiceTier(invItems),
        to: '/buyer/invoices',
      },
    ];
    return role === 'ALL' ? all : all.filter((task) => task.roles.includes(role));
  }, [role, pos.data, invoices.data, rfqs.data, quotes.data, grs.data, asns.data, chase.data, t]);

  return (
    <AppShellV2>
      <PageHeader
        breadcrumb={[t('hub.home.crumb'), t('hub.home.pti.title')]}
        title={t('hub.home.pti.title')}
        subtitle={t('hub.home.pti.subtitle')}
      />
      <div className="mb-4">
        <SampleDataBadge />
      </div>
      <TaskList tasks={tasks} />
    </AppShellV2>
  );
};

export default BuyerHome;
