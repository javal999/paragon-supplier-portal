// ────────────────────────────────────────────────────────────────────────────
// WHERE AN RFQ CAME FROM — one resolver, two readers.
//
// The event page's "Created from …" line (BL-98) and the wizard's "Pre-filled
// from …" banner (B6) name the same sources the same way: by the source's
// DOCUMENT NUMBER, never its internal id. They read ONE resolver so the two can
// never disagree about what a source is called — a wizard that said "RFP-2026-
// 002" and an event page that then said "rfp-002" would be the BL-98 defect
// back, one screen earlier.
// ────────────────────────────────────────────────────────────────────────────

import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Data from '../../components/ui-v2/Data';
import type { RFQ } from '../../data/mockRfqs';
import { useRequisitions, useRfiEvents, useRfpEvents } from '../../services/query/hooks';
import { rfqTemplateStore } from '../../services/sourcing/rfqTemplates';

/** The provenance fields an RFQ (or a draft of one) carries. */
export type RfqSourceRefs = Pick<RFQ, 'sourceRfiId' | 'sourceRfpId' | 'copiedFromRfqId' | 'templateId'> & {
  /** The RFQ's own number, when it has one: the requisition names it, not the reverse. */
  readonly rfqNumber?: string;
};

/**
 * Resolve every source an RFQ records against the live reads. A source the
 * reads cannot resolve (once settled) keeps its id rather than vanishing.
 */
export function useRfqSources(refs: RfqSourceRefs, rfqs: readonly RFQ[]) {
  const { t } = useTranslation();
  const rfis = useRfiEvents();
  const rfps = useRfpEvents();
  const prs = useRequisitions();
  const rfi = refs.sourceRfiId ? (rfis.data?.items ?? []).find((e) => e.id === refs.sourceRfiId) : undefined;
  const rfp = refs.sourceRfpId ? (rfps.data?.items ?? []).find((e) => e.id === refs.sourceRfpId) : undefined;
  // The RFQ does not store the requisition id; the PR does — `t_pr_source`
  // writes this RFQ's number onto the PR's `linkedDoc`.
  const pr = refs.rfqNumber ? (prs.data?.items ?? []).find((p) => p.linkedDoc === refs.rfqNumber) : undefined;
  const copied = refs.copiedFromRfqId ? rfqs.find((r) => r.id === refs.copiedFromRfqId) : undefined;
  const template = refs.templateId ? rfqTemplateStore.byId(refs.templateId) : undefined;
  const templateName = template ? (template.nameKey ? t(template.nameKey) : (template.name ?? template.id)) : undefined;
  return {
    rfi,
    rfp,
    pr,
    copied,
    templateName,
    rfisPending: rfis.isPending,
    rfpsPending: rfps.isPending,
    /** The source's number, or id when unresolved, per kind. */
    labels: {
      rfi: refs.sourceRfiId ? (rfi?.eventNumber ?? refs.sourceRfiId) : undefined,
      rfp: refs.sourceRfpId ? (rfp?.eventNumber ?? refs.sourceRfpId) : undefined,
      copy: refs.copiedFromRfqId ? (copied?.rfqNumber ?? refs.copiedFromRfqId) : undefined,
      template: refs.templateId ? (templateName ?? refs.templateId) : undefined,
    },
  };
}

/**
 * D3 / D2 — "Created from …", for EVERY source the tree records, by the source's
 * DOCUMENT NUMBER (never its internal id), linked where a page shows it:
 *
 * - `sourceRfiId` → RFI-2026-… (the RFI board, opened on it);
 * - `sourceRfpId` → RFP-2026-… (the RFP board, opened on it);
 * - the requisition → PR-2026-… (the requisitions page, opened on it);
 * - `copiedFromRfqId` → RFQ-2026-… (its own event page);
 * - `templateId` → the template's name (no page shows a template).
 */
export const RfqSourceLinks: React.FC<{ rfq: RFQ; rfqs: readonly RFQ[] }> = ({ rfq, rfqs }) => {
  const { t } = useTranslation();
  const { rfi, rfp, pr, copied, templateName, rfisPending, rfpsPending } = useRfqSources(rfq, rfqs);
  const link = 'text-xs text-action-hover hover:underline';
  const note = 'text-xs text-text-tertiary';
  return (
    <>
      {rfq.sourceRfiId && !rfisPending && (
        <span className={note} data-testid="event-from-rfi">
          {t('rfx.event.createdFrom')}{' '}
          {rfi ? (
            <Link to={`/buyer/rfi?open=${encodeURIComponent(rfi.id)}`} className={link}>
              <Data>{rfi.eventNumber}</Data>
            </Link>
          ) : (
            <Data>{rfq.sourceRfiId}</Data>
          )}
        </span>
      )}
      {rfq.sourceRfpId && !rfpsPending && (
        <span className={note} data-testid="event-from-rfp">
          {t('rfx.event.createdFrom')}{' '}
          {rfp ? (
            <Link to={`/buyer/rfp?open=${encodeURIComponent(rfp.id)}`} className={link}>
              <Data>{rfp.eventNumber}</Data>
            </Link>
          ) : (
            <Data>{rfq.sourceRfpId}</Data>
          )}
        </span>
      )}
      {pr && (
        <span className={note} data-testid="event-from-pr">
          {t('rfx.event.createdFrom')}{' '}
          <Link to={`/buyer/purchase-requisition?open=${encodeURIComponent(pr.id)}`} className={link}>
            <Data>{pr.prNumber}</Data>
          </Link>
        </span>
      )}
      {rfq.copiedFromRfqId && (
        <span className={note} data-testid="event-copied-from">
          {t('rfx.event.copiedFrom')}{' '}
          {copied ? (
            <Link to={`/buyer/rfq/${encodeURIComponent(copied.id)}`} className={link}>
              <Data>{copied.rfqNumber}</Data>
            </Link>
          ) : (
            <Data>{rfq.copiedFromRfqId}</Data>
          )}
        </span>
      )}
      {rfq.templateId && (
        <span className={note} data-testid="event-from-template">
          {t('rfx.event.fromTemplate', { name: templateName ?? rfq.templateId })}
        </span>
      )}
    </>
  );
};

/**
 * B6 — the one-line note at the top of the RFQ wizard when it opened from
 * somewhere: "Pre-filled from RFP-2026-002 · everything is editable". Nothing
 * renders for a blank wizard, so an ordinary RFQ gains no line claiming a
 * source. The label comes from `useRfqSources`, the event page's resolver.
 */
export const RfqPrefillBanner: React.FC<{
  /** Which entrance filled the wizard — a copy of an RFQ that itself came
   *  from an RFI was pre-filled from the RFQ, not from the RFI. */
  kind: 'rfi' | 'rfp' | 'template' | 'copy';
  refs: RfqSourceRefs;
  rfqs: readonly RFQ[];
}> = ({ kind, refs, rfqs }) => {
  const { labels } = useRfqSources(refs, rfqs);
  const source = labels[kind];
  if (!source) return null;
  return <PrefillBanner source={source} testId="rfq-prefill-banner" />;
};

/** The banner itself, shared with the RFP wizard (opened from an RFI). */
export const PrefillBanner: React.FC<{ source: string; testId: string }> = ({ source, testId }) => {
  const { t } = useTranslation();
  return (
    <p className="text-sm text-text-secondary bg-bg-hover border border-border-subtle rounded-md px-3 py-2" data-testid={testId}>
      {t('rfxEdit.prefill.from')} <Data>{source}</Data> · {t('rfxEdit.prefill.editable')}
    </p>
  );
};
