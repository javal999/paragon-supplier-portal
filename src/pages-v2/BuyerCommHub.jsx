/** @import React from 'react' */
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { Info, Send, Radio, MessageSquareReply } from 'lucide-react';
import AppShellV2 from '@components/layout-v2/AppShellV2';
import BuyerChannelTriage from './BuyerChannelTriage';
import ChaseList from './ChaseList';
import PageHeader from '@components/ui-v2/PageHeader';
import PageMetaLine from '@components/ui-v2/PageMetaLine';
import LivenessPill from '@components/ui-v2/LivenessPill';
import LoadingState from '@components/ui-v2/LoadingState';
import ErrorState from '@components/ui-v2/ErrorState';
import StatusPill from '@components/ui-v2/StatusPill';
import Data from '@components/ui-v2/Data';
import Button from '@components/ui-v2/Button';
import SubTabs from '@components/ui-v2/SubTabs';
import { useUrlEnumParam } from '@hooks/useUrlEnumParam';
import { useUnifiedChase } from '@services/query/chaseHooks';
import { useConsolidationRows } from '@services/query/sdcBuyerHooks';
import { useSuppliers } from '@services/query/hooks';
/** @import { OutboundStatus, SupplierReplyFact } from '@services/channel' */
import {
  deriveOutboundQueue,
  outboundRequestStore,
  channelProvenanceStore
} from '@services/channel';
/** @import { ChaseSeverityLevel } from '@services/chase' */
/** @import { ConsolidationRow } from '@services/sdc' */
import { sdcClock } from '@services/sdc';
import { formatDate } from '@lib/format';

// ─────────────────────────────────────────────────────────────────────────────
// SUPPLIER FOLLOW-UPS (IA P-05) — the buyer/planner follow-up page, built on the
// Comm Hub C4a COMMUNICATION HUB (DEC-COMMS-PRIMARY front door).
//
// P-05 merged the Chase page (`/buyer/chase`) into this one: one follow-up job,
// one page, one name. Three tabs, in the order a planner works them, with the
// active tab in `?tab=` (`follow-up` is the default):
//   · `follow-up` — SUPPLIERS TO FOLLOW UP: the unified chase list (5a–5e),
//     worst-first, rendered by the shared ChaseList. Each card's "Record a reply"
//     opens the `reply` tab with that supplier bound (`?supplier=<id>`).
//   · `reply` — RECORD A REPLY: the C4d in-place triage (BuyerChannelTriage). An
//     honest note: no live inbound transport; the operator pastes a reply under a
//     supplier's context and records stock through the Inventory entry form.
//   · `log` — REQUEST LOG:
//       OUTBOUND QUEUE — deriveOutboundQueue (C3) over the buyer-gated unified
//       chase. Per-supplier composed / awaiting / stale, worst-first. SIMULATED
//       via the LivenessRegistry two-gate — every ask reads "composed — not sent"
//       (no transport exists; invariant b).
//       CHANNEL-SOURCED SUBMISSIONS — the channelProvenanceStore audit trail:
//       replies that were CONFIRMED into the governed ledger (C2), each linked to
//       its channel message + submission session. A true audit trail, not a
//       conversation replay.
//
// The no-live-channel banner sits above the tabs, so it is on screen whichever
// tab is open.
//
// The page itself is RENDER-ONLY: it reads the hooks + the append-only stores,
// derives the queue via the pure C3 selector, and joins supplier names for
// display. The one write is the triage panel's, through the Inventory page's own
// entry form. Buyer-gated: the unified-chase read resolves [] for a supplier
// persona.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Severity → quiet StatusPill tone (hard = Urgent; soft = Advisory).
 * @type {Record<ChaseSeverityLevel, 'danger' | 'warning' | 'neutral'>}
 */
const SEVERITY_VARIANT = {
  hard: 'danger',
  soft: 'warning',
  none: 'neutral'
};

/** Derived request status → tone. awaiting = responsive (success); stale = went
 * @type {Record<OutboundStatus, 'success' | 'danger' | 'neutral'>}
 *  quiet (danger); composed = an ask to compose (neutral). */
const STATUS_VARIANT = {
  awaiting: 'success',
  stale: 'danger',
  composed: 'neutral'
};

/** The page's tabs, in display order; the first is the default.
 * @typedef {'follow-up' | 'reply' | 'log'} FollowUpTab */
// i18n-defer: tab identifiers (the `?tab=` values), not copy — each renders through t(TAB_LABEL_KEY[id])
/** @type {readonly FollowUpTab[]} */
const TABS = ['follow-up', 'reply', 'log'];

/** @type {Record<FollowUpTab, string>} */
const TAB_LABEL_KEY = {
  'follow-up': 'buyerCommHub.tab.followUp',
  reply: 'buyerCommHub.tab.reply',
  log: 'buyerCommHub.tab.log'
};

/**
 * Fold the buyer-visible reply signal into the channel-agnostic SupplierReplyFact[]
 * the C3 derivation consumes (LAW 4 — "the caller folds every reply store"). The
 * one buyer-readable reply store today is the forecast-response consolidation: each
 * ANSWERED line carries its submitted response; the latest per supplier is that
 * supplier's freshest reply. (As other reply stores become buyer-readable they fold
 * in here the same way — the derivation never changes.)
 * @param {readonly ConsolidationRow[]} rows
 * @returns {SupplierReplyFact[]}
 */
function foldReplies(rows) {
  const latest = /** @type {Map<string, string>} */ (new Map());
  for (const row of rows) {
    if (!('response' in row.state)) continue; // 'awaiting' has no reply
    const at = row.state.response.submittedAt;
    if (!at) continue;
    const cur = latest.get(row.line.supplierId);
    if (cur === undefined || at > cur) latest.set(row.line.supplierId, at);
  }
  return [...latest].map(([supplierId, latestSubmittedAt]) => ({ supplierId, latestSubmittedAt }));
}

/** @type {React.FC} */
const BuyerCommHub = () => {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [tab, setTab] = useState(/** @type {FollowUpTab} */ ('follow-up'));
  // Deep-link read: `?tab=reply&supplier=sup-007` lands on Record a reply with
  // that supplier bound; a plain visit from the menu opens the follow-up list.
  useUrlEnumParam('tab', TABS, setTab);
  // The supplier the reply tab opens bound to. Held in state as well as in the
  // address: an address write lands a render later than a state change, and the
  // triage panel reads its supplier once, when it mounts.
  const [replySupplierId, setReplySupplierId] = useState(() => searchParams.get('supplier') ?? '');
  const chaseQuery = useUnifiedChase();
  const consolidationQuery = useConsolidationRows();
  const suppliersQuery = useSuppliers();

  const views = useMemo(() => chaseQuery.data ?? [], [chaseQuery.data]);
  const consolidation = useMemo(() => consolidationQuery.data ?? [], [consolidationQuery.data]);

  const now = sdcClock.now();
  // Reads of the append-only stores (buyer sees the whole network — no per-supplier
  // leak concern; these are Paragon's OWN asks + its OWN recorded provenance).
  const queue = useMemo(
    () => deriveOutboundQueue(views, outboundRequestStore.all(), foldReplies(consolidation), now),
    [views, consolidation, now]
  );
  // The in-place triage panel (C4d) appends to channelProvenanceStore on a
  // successful record; `recordTick` bumps on its onRecorded so this render re-reads
  // the append-only store and the new row shows in the audit trail immediately.
  const [recordTick, setRecordTick] = useState(0);
  const provenance = useMemo(() => channelProvenanceStore.all(), [recordTick]);

  const nameOf = useMemo(() => {
    const map = /** @type {Map<string, string>} */ (new Map());
    for (const s of suppliersQuery.data?.items ?? []) map.set(s.id, s.name);
    return /** @param {string} id */ (id) => map.get(id) ?? id;
  }, [suppliersQuery.data]);

  const CRUMB = [t('buyerCommHub.crumb.intelligence'), t('buyerCommHub.crumb.hub')];

  /**
   * Write the page address in place (no new history entry), so Back still
   * returns to the page the user came from rather than to an earlier tab.
   * @param {(params: URLSearchParams) => void} edit
   */
  const editParams = (edit) =>
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        edit(next);
        return next;
      },
      { replace: true }
    );

  /** @param {FollowUpTab} next */
  const changeTab = (next) => {
    setTab(next);
    editParams((p) => p.set('tab', next));
  };

  /**
   * "Record a reply" on a follow-up card: open the reply tab bound to that supplier.
   * @param {string} supplierId
   */
  const recordReplyFor = (supplierId) => {
    setReplySupplierId(supplierId);
    setTab('reply');
    editParams((p) => {
      p.set('tab', 'reply');
      p.set('supplier', supplierId);
    });
  };

  /** @param {string} supplierId */
  const keepReplySupplier = (supplierId) => {
    setReplySupplierId(supplierId);
    editParams((p) => (supplierId ? p.set('supplier', supplierId) : p.delete('supplier')));
  };

  if (chaseQuery.isPending) return <LoadingState breadcrumb={CRUMB} />;
  if (chaseQuery.isError)
    return (
      <ErrorState
        breadcrumb={CRUMB}
        error={chaseQuery.error}
        onRetry={() => chaseQuery.refetch()}
      />
    );

  return (
    <AppShellV2>
      <PageHeader
        breadcrumb={CRUMB}
        title={t('buyerCommHub.header.title')}
        subtitle={t('buyerCommHub.header.subtitle')}
        actions={<LivenessPill capability="deliveryAgreements" />}
      />

      <PageMetaLine className="-mt-6 mb-6 flex items-center gap-3">
        <span>{t('buyerCommHub.meta.line', { date: formatDate(now) })}</span>
        <LivenessPill capability="deliveryAgreements" />
      </PageMetaLine>

      {/* Honest framing — no live channel; nothing is sent from here. */}
      <div className="bg-warning-soft border border-warning/30 rounded-lg px-4 py-3 mb-6 text-sm text-text-primary flex items-start gap-2">
        <Info size={16} className="text-warning-hover shrink-0 mt-0.5" aria-hidden="true" />
        <div>
          <div className="font-semibold text-warning-hover">{t('buyerCommHub.honesty.title')}</div>
          <p className="mt-0.5 text-text-secondary">{t('buyerCommHub.honesty.body')}</p>
        </div>
      </div>

      <SubTabs
        options={TABS.map((id) => ({
          id,
          label: t(TAB_LABEL_KEY[id]),
          ...(id === 'follow-up' ? { count: views.length } : {})
        }))}
        value={tab}
        onChange={changeTab}
        className="mb-6"
      />

      {/* ── Suppliers to follow up (the unified chase list) ────────────────── */}
      {tab === 'follow-up' && (
        <section data-testid="commhub-followup">
          <ChaseList
            views={views}
            nameOf={nameOf}
            renderAction={(view) => (
              <Button
                variant="outline"
                icon={MessageSquareReply}
                onClick={() => recordReplyFor(view.supplierId)}
                data-testid={`followup-record-reply-${view.supplierId}`}
              >
                {t('buyerCommHub.followUp.recordReply')}
              </Button>
            )}
          />
        </section>
      )}

      {/* ── Record a reply (C4d — in-place recording confirm) ──────────────── */}
      {tab === 'reply' && (
        <BuyerChannelTriage
          initialSupplierId={replySupplierId}
          onSupplierChange={keepReplySupplier}
          onRecorded={() => setRecordTick((n) => n + 1)}
        />
      )}

      {/* ── Request log (outbound requests + channel-sourced submissions) ──── */}
      {tab === 'log' && (
        <div data-testid="commhub-log">
          {/* ── Outbound requests (chase-derived; composed — not sent) ─────────── */}
          <section className="mb-8" data-testid="commhub-outbound">
            <div className="flex items-center gap-2 mb-1">
              <Send size={16} className="text-teal" aria-hidden="true" />
              <h2 className="text-section text-text-primary">{t('buyerCommHub.outbound.title')}</h2>
            </div>
            <p className="text-sm text-text-tertiary mb-4">{t('buyerCommHub.outbound.subtitle')}</p>

            {queue.length === 0 ? (
              <div className="border border-border-subtle rounded-lg bg-white px-6 py-8 text-center text-sm text-text-tertiary">
                {t('buyerCommHub.outbound.empty')}
              </div>
            ) : (
              <div className="space-y-3">
                {queue.map((entry) => (
                  <div
                    key={entry.supplierId}
                    className="border border-border-subtle rounded-lg bg-white overflow-hidden"
                    data-testid="commhub-outbound-row"
                  >
                    <div className="flex flex-wrap items-center gap-3 px-4 py-3 border-b border-border-subtle bg-bg-subtle">
                      <span className="text-sm font-semibold text-text-primary">
                        {nameOf(entry.supplierId)}
                      </span>
                      <StatusPill variant={SEVERITY_VARIANT[entry.severity]}>
                        {t(`buyerCommHub.severity.${entry.severity}`)}
                      </StatusPill>
                      <StatusPill variant={STATUS_VARIANT[entry.status]}>
                        {t(`buyerCommHub.status.${entry.status}`)}
                      </StatusPill>
                      {/* Honesty: no transport — every ask reads composed, never sent. */}
                      <span className="ml-auto inline-flex items-center gap-1.5 text-xs text-warning-hover">
                        <span
                          className="h-1.5 w-1.5 rounded-full border border-warning"
                          aria-hidden="true"
                        />
                        {t('buyerCommHub.outbound.composedNotSent')}
                      </span>
                    </div>

                    <div className="px-4 py-3 flex flex-col gap-3">
                      {entry.dataReasons.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {entry.dataReasons.map((reason, i) => (
                            // eslint-disable-next-line react/no-array-index-key -- reason codes can repeat and have no id; read-only, stateless pills recomputed whole from the chase view
                            <StatusPill key={`${reason}-${i}`} variant="warning">
                              {t(`buyerCommHub.reason.${reason}`)}
                            </StatusPill>
                          ))}
                        </div>
                      )}

                      {entry.subjectRefs.length > 0 && (
                        <ul className="flex flex-col divide-y divide-border-subtle">
                          {entry.subjectRefs.map((ref) => (
                            <li
                              key={`${ref.agreementId}-${ref.itemSeq}-${ref.releaseSeq ?? 'item'}`}
                              className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2 text-sm"
                            >
                              <Data className="text-sm">{ref.materialCode}</Data>
                              <span className="text-text-tertiary text-xs">
                                {t('buyerCommHub.outbound.subjectDue', {
                                  date: formatDate(ref.dueAt)
                                })}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}

                      <div className="text-xs text-text-tertiary">
                        {entry.lastSentAt ? (
                          <span>
                            {t('buyerCommHub.outbound.lastAsked', {
                              date: formatDate(entry.lastSentAt)
                            })}
                            {entry.lastChannel && (
                              <>
                                {' '}
                                ·{' '}
                                {t('buyerCommHub.outbound.channel', {
                                  channel: t(`buyerCommHub.channel.${entry.lastChannel}`)
                                })}
                              </>
                            )}
                          </span>
                        ) : (
                          <span>{t('buyerCommHub.outbound.neverAsked')}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* ── Channel-sourced submissions (provenance audit trail) ───────────── */}
          <section className="mb-8" data-testid="commhub-provenance">
            <div className="flex items-center gap-2 mb-1">
              <Radio size={16} className="text-teal" aria-hidden="true" />
              <h2 className="text-section text-text-primary">
                {t('buyerCommHub.provenance.title')}
              </h2>
            </div>
            <p className="text-sm text-text-tertiary mb-4">
              {t('buyerCommHub.provenance.subtitle')}
            </p>

            {provenance.length === 0 ? (
              <div className="border border-border-subtle rounded-lg bg-white px-6 py-8 text-center text-sm text-text-tertiary">
                {t('buyerCommHub.provenance.empty')}
              </div>
            ) : (
              <ul className="space-y-2">
                {provenance.map((ref) => (
                  <li
                    // Key: channelMessageId. Both writers append at most one ref per
                    // message (they check forMessage() first), so it is unique.
                    key={ref.channelMessageId}
                    className="border border-border-subtle rounded-lg bg-white px-4 py-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm"
                    data-testid="commhub-provenance-row"
                  >
                    <StatusPill variant="success">
                      {t('buyerCommHub.provenance.recorded')}
                    </StatusPill>
                    <span className="text-text-secondary">
                      {t('buyerCommHub.provenance.message')}{' '}
                      <Data className="text-text-primary">{ref.channelMessageId}</Data>
                    </span>
                    <span className="text-text-tertiary text-xs">
                      {t('buyerCommHub.provenance.session')}{' '}
                      <Data className="text-text-secondary">{ref.sessionId}</Data>
                    </span>
                    <span className="text-text-tertiary text-xs">
                      {ref.causationAnchor ? (
                        <>
                          {t('buyerCommHub.provenance.correlation')}{' '}
                          <Data className="text-text-secondary">{ref.causationAnchor}</Data>
                        </>
                      ) : (
                        t('buyerCommHub.provenance.noCorrelation')
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </AppShellV2>
  );
};

export default BuyerCommHub;
