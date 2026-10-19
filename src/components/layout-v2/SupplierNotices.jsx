/** @import React from 'react' */
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { useCurrentIdentity } from '@context/CurrentIdentityContext';
import { deepLink } from '@lib/deepLink';
import { formatDate } from '@lib/format';
import { useServiceQuery } from '@services/query/useServiceQuery';
import {
  outcomeShareText,
  supplierAwardNotices,
  supplierSourcingQueue
} from '@services/sourcing/supplierOutcome';
/** @import { SupplierAwardNotice } from '@services/sourcing/supplierOutcome' */
/** @import { TFunction } from 'i18next' */

// ─────────────────────────────────────────────────────────────────────────────
// The supplier's in-hub notices and menu counts (RFx UX S-04, S-05, X-02).
// Both are DERIVED at read from the supplier's own scoped reads — nothing is
// stored, so the bell and the To do cannot disagree. Rendered only for a
// supplier seat; the PTI top bar and menu are unchanged.
// ─────────────────────────────────────────────────────────────────────────────

// The shell's reads. SAME KEYS as `useRFQs()`, `useAwards()` … in
// `services/query/hooks.js`, so they share the page's cache, but with
// `retryOnMount: false`: the shell remounts whenever a page swaps its Loading
// shell for its Error shell, and a shell read that re-fetched an errored query
// on mount would flip that page back to Loading, for ever.
const SHELL = { retryOnMount: false };
const useShellRfqs = () =>
  useServiceQuery(
    ['procurement', 'rfqs', undefined],
    (svc, scope) => svc.procurement.getRFQs(scope, undefined),
    SHELL
  );
const useShellAwards = () =>
  useServiceQuery(
    ['procurement', 'awards'],
    (svc, scope) => svc.procurement.getAwards(scope),
    SHELL
  );
const useShellRfpAwards = () =>
  useServiceQuery(
    ['procurement', 'rfpAwards'],
    (svc, scope) => svc.procurement.getRfpAwards(scope),
    SHELL
  );
const useShellRfis = () =>
  useServiceQuery(
    ['procurement', 'rfiEvents'],
    (svc, scope) => svc.procurement.getRfiEvents(scope),
    SHELL
  );
const useShellRfps = () =>
  useServiceQuery(
    ['procurement', 'rfpEvents'],
    (svc, scope) => svc.procurement.getRfpEvents(scope),
    SHELL
  );
const useShellRounds = () =>
  useServiceQuery(
    ['procurement', 'negotiationRounds'],
    (svc, scope) => svc.procurement.getNegotiationRounds(scope),
    SHELL
  );

/**
 * A notice in words: "Awarded to you · RFQ-2026-021 · 60% of item 1" or
 * "Award withdrawn · RFQ-2026-021 · 05 Sept 2026".
 * @param {TFunction} t
 * @param {SupplierAwardNotice} n
 * @returns {string}
 */
export const noticeText = (t, n) =>
  n.kind === 'awarded'
    ? t('topbar.notices.awarded', { event: n.eventNumber, share: outcomeShareText(t, n.shares) })
    : t('topbar.notices.withdrawn', { event: n.eventNumber, date: formatDate(n.at) });

/** @returns {SupplierAwardNotice[]} */
function useSupplierAwardNotices() {
  const { identity } = useCurrentIdentity();
  const rfqs = useShellRfqs();
  const rfqAwards = useShellAwards();
  const rfpAwards = useShellRfpAwards();
  return supplierAwardNotices({
    rfqs: rfqs.data?.items ?? [],
    rfqAwards: rfqAwards.data?.items ?? [],
    rfpAwards: rfpAwards.data?.items ?? [],
    supplierId: identity.supplierId ?? ''
  });
}

/**
 * The bell for a supplier seat: the count of award and withdrawal notices, and
 * a list of them that opens on click. An award notice says the purchase order
 * follows from SAP until PTI raises it there (owner ruling Q3, 2026-10-19).
 * @type {React.FC}
 */
export const SupplierNoticeBell = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const notices = useSupplierAwardNotices();
  const [open, setOpen] = useState(false);
  const boxRef = useRef(/** @type {HTMLDivElement | null} */ (null));

  useEffect(() => {
    if (!open) return undefined;
    /** @param {MouseEvent} e */
    const onDown = (e) => {
      if (boxRef.current && !boxRef.current.contains(/** @type {Node} */ (e.target))) {
        setOpen(false);
      }
    };
    /** @param {KeyboardEvent} e */
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={boxRef}>
      <button
        type="button"
        aria-label={t('topbar.notifications')}
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-md text-text-secondary hover:bg-bg-hover"
        data-testid="supplier-notice-bell"
      >
        <Bell size={18} />
        {notices.length > 0 ? (
          <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-danger text-white text-[10px] font-bold flex items-center justify-center">
            {notices.length}
          </span>
        ) : null}
      </button>
      {open ? (
        <div
          className="absolute right-0 mt-1 w-80 max-w-[calc(100vw-2rem)] z-50 bg-bg-surface border border-border-subtle rounded-lg shadow-md"
          data-testid="supplier-notices"
        >
          {notices.length === 0 ? (
            <p className="px-4 py-3 text-sm text-text-tertiary">{t('topbar.notices.empty')}</p>
          ) : (
            <ul className="divide-y divide-border-subtle">
              {notices.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    data-testid={`supplier-notice-${n.id}`}
                    onClick={() => {
                      setOpen(false);
                      navigate(
                        n.eventType === 'rfq'
                          ? deepLink('/supplier/rfq', { tab: 'history' })
                          : '/supplier/rfp'
                      );
                    }}
                    className="w-full text-left px-4 py-3 hover:bg-bg-hover"
                  >
                    <span className="block text-sm text-text-primary">{noticeText(t, n)}</span>
                    {n.kind === 'awarded' && !n.raisedInSap ? (
                      <span className="block text-xs text-text-secondary">
                        {t('hub.home.poFollowsFromSap')}
                      </span>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
};

/**
 * @param {number} n
 * @returns {string}
 */
const countText = (n) => (n > 0 ? String(n) : '');

/** The supplier menu items that carry a count. */
export const SUPPLIER_COUNTED_PATHS = ['/supplier/rfi', '/supplier/rfq', '/supplier/rfp'];

/**
 * The count beside a supplier Sourcing menu item (RFx UX S-05, X-02): RFIs and
 * RFPs still to answer; on RFQ invitations the open revision rounds ("1
 * round") when there are any, else the RFQs still to quote. Nothing when zero.
 * @type {React.FC<{ path: string }>}
 */
export const SupplierMenuCount = ({ path }) => {
  const { t } = useTranslation();
  const { identity } = useCurrentIdentity();
  const rfqs = useShellRfqs();
  const rfis = useShellRfis();
  const rfps = useShellRfps();
  const rounds = useShellRounds();
  const queue = supplierSourcingQueue({
    rfqs: rfqs.data?.items ?? [],
    rfis: rfis.data?.items ?? [],
    rfps: rfps.data?.items ?? [],
    rounds: rounds.data?.items ?? [],
    supplierId: identity.supplierId
  });
  const text =
    path === '/supplier/rfi'
      ? countText(queue.openRfis.length)
      : path === '/supplier/rfp'
        ? countText(queue.openRfps.length)
        : queue.openRounds.length > 0
          ? t('hub.nav.count.rounds', { count: queue.openRounds.length })
          : countText(queue.openRfqs.length);
  return text ? (
    <span
      className="ml-auto shrink-0 text-xs font-semibold text-warning-hover bg-warning-soft rounded-full px-2 py-0.5"
      data-testid={`nav-count-${path}`}
    >
      {text}
    </span>
  ) : null;
};
