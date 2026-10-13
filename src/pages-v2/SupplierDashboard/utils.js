/** @import { TFunction } from 'i18next' */
/** @import { TargetStatus } from '@lib/chartPalette' */
/** @import { PurchaseOrder, SupplierDocument } from '@services/data/types' */
/** @import { ActionItem } from './const' */
import { AlertTriangle, Clock, Truck, User } from 'lucide-react';
import { targetStatus } from '@lib/chartPalette';
import { TODAY } from './const';

/**
 * Compact IDR amount for the recent-orders table: `Rp 1.2M` (billions),
 * `Rp 185jT` (millions), else the plain number.
 * @param {number} v
 * @returns {string}
 */
export const fmtIDR = (v) => {
  if (v >= 1_000_000_000) return `Rp ${(v / 1_000_000_000).toFixed(1)}M`;
  if (v >= 1_000_000) return `Rp ${Math.round(v / 1_000_000)}jT`;
  return `Rp ${v.toLocaleString()}`;
};

/**
 * `dd Mon yyyy` (en-GB) for a stored ISO date, or `—` when there is none.
 * @param {string} s
 * @returns {string}
 */
export const fmtDate = (s) => {
  if (!s) return '—';
  return new Date(s).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
};

// DP2-TARGET-01: perf thresholds come from the central target-status system
// (target 90 → meeting ≥90, near ≥80, else missing) so the StatusPill and the
// KPI bars can't disagree. Kept returning StatusPill variants for the pill site.
/** @type {Record<TargetStatus, 'success' | 'warning' | 'danger'>} */
const STATUS_TO_VARIANT = {
  meeting: 'success',
  near: 'warning',
  missing: 'danger'
};
/**
 * The StatusPill variant for a performance percentage against the 90 target.
 * @param {number} v
 * @returns {'success' | 'warning' | 'danger'}
 */
export const perfVariant = (v) => STATUS_TO_VARIANT[targetStatus(v, 90)];

/**
 * @typedef {object} BriefingInputs
 * @property {TFunction} t
 * @property {number} needsConfirmCount  POs in Sent / Acknowledged.
 * @property {{ doc: SupplierDocument; days: number } | null} expiringDoc
 *   The soonest expiring-or-expired certificate, or none.
 * @property {PurchaseOrder[]} asnDueOrders  Confirmed POs delivering within 7 days.
 */

/**
 * Every card the "Today's briefing" panel can show, in render order, before
 * the page filters out the ones the supplier dismissed. Pure: same inputs,
 * same cards. Moved out of the page component by the Phase 5 split (no
 * behaviour change).
 * @param {BriefingInputs} inputs
 * @returns {ActionItem[]}
 */
export const buildBriefingActions = ({ t, needsConfirmCount, expiringDoc, asnDueOrders }) => {
  // i18n-defer: mock/sample data — the briefing is badged "Sample data"; these
  // action titles/descs/badges/labels are fixture narratives, kept EN by design.
  /** @type {ActionItem[]} */
  const allActions = [
    {
      id: 'po-confirm',
      Icon: AlertTriangle,
      iconClass: 'text-danger',
      iconBg: 'bg-danger-soft',
      title: `Confirm ${needsConfirmCount} purchase order${needsConfirmCount !== 1 ? 's' : ''}`,
      badge: 'Urgent',
      badgeVariant: 'danger',
      desc: 'PO-2025-00108 · Rp 185jT · Delivery 25 Apr 2025 — acknowledgement overdue 96h',
      primary: true,
      btnLabel: 'Confirm now',
      time: '~2 min'
    },
    // ⚠️ **THE CERTIFICATE CARD IS DERIVED NOW, AND WHAT IT REPLACED WAS NOT
    // MERELY UNTRANSLATED — IT CONTRADICTED THE PAGE IT SAT ON.** Retired,
    // quoted rather than deleted:
    //
    //     title: 'Upload ISO 9001:2015 certificate'
    //     badge: '45 days left'
    //     desc:  'Cert expires 24 May 2026 — upload renewal to avoid
    //             disruption to active POs'
    //
    // Three claims, and the fixture answers all three. The ISO 9001 cert is a
    // REAL row (`doc-005`) — so this was never authored-because-uncomputable,
    // it was authored beside its own subject. That row is not expiring: it
    // computes `valid`, and this card was urging a renewal on a certificate
    // with most of a year left, in a slot two cards down from `asn-*` entries
    // that have always computed their own day-counts.
    //
    // ⚠️ **AND `45 days left` DISAGREED WITH `expires 24 May 2026` ON THE SAME
    // CARD** — one implies a future date, the other names a past one. A
    // hand-written day-count decays; a hand-written PAIR of them decays out of
    // step, which is how one card ends up arguing with itself. No count is
    // written below: both come from `daysUntil` at the page's own instant.
    //
    // ⚠️ **IT IS TRANSLATED, WHICH THE `i18n-defer` ABOVE NO LONGER COVERS.**
    // That note acquits these entries as *fixture narratives, kept EN by
    // design*. This one is no longer a narrative — it reads a real document —
    // so the exemption lapses with the authorship. The remaining authored
    // cards are untouched and the note still covers them.
    ...(expiringDoc
      ? [
          {
            id: `cert-renew-${expiringDoc.doc.id}`,
            Icon: Clock,
            iconClass: 'text-warning-hover',
            iconBg: 'bg-warning-soft',
            title: t('supplierDashboard.briefing.cert.title', {
              name: expiringDoc.doc.name
            }),
            // The expired arm is reachable by the clock alone — no fixture
            // reaches it today, and the day one does the card must not still
            // say `days left`.
            badge:
              expiringDoc.days <= 0
                ? t('supplierDashboard.briefing.cert.badgeExpired')
                : t('supplierDashboard.briefing.cert.badge', {
                    count: expiringDoc.days
                  }),
            badgeVariant:
              expiringDoc.days <= 0
                ? /** @type {const} */ ('danger')
                : /** @type {const} */ ('warning'),
            desc: t('supplierDashboard.briefing.cert.desc', {
              date: fmtDate(expiringDoc.doc.expiryDate ?? '')
            }),
            primary: true,
            btnLabel: t('supplierDashboard.briefing.cert.cta'),
            time: '~5 min'
          }
        ]
      : []),
    ...asnDueOrders.map((po) => {
      const days = Math.ceil(
        (new Date(po.requestedDeliveryDate).getTime() - new Date(TODAY).getTime()) / 86_400_000
      );
      return {
        id: `asn-${po.id}`,
        Icon: Truck,
        iconClass: 'text-teal',
        iconBg: 'bg-teal-soft',
        title: `Create ASN for ${po.poNumber}`,
        badge: `Delivery in ${days}d`,
        badgeVariant: /** @type {const} */ ('info'),
        desc: `${po.supplierName} · ${fmtDate(po.requestedDeliveryDate)} — ASN must be submitted before delivery`,
        primary: true,
        btnLabel: 'Create ASN',
        time: '~5 min'
      };
    }),
    {
      id: 'profile',
      Icon: User,
      iconClass: 'text-teal',
      iconBg: 'bg-teal-soft',
      title: 'Complete company profile',
      badge: 'When ready',
      badgeVariant: 'neutral',
      desc: 'Add bank account details and payment preferences to enable Net 15 payment terms',
      primary: false,
      btnLabel: 'Update profile',
      time: '~10 min'
    }
  ];
  return allActions;
};
