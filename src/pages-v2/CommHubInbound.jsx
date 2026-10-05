/** @import React from 'react' */
import { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Inbox,
  Info,
  MessageSquare,
  PenLine,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  CalendarClock,
  Clock,
  ArrowRight
} from 'lucide-react';
import AppShellV2 from '@components/layout-v2/AppShellV2';
import PageHeader from '@components/ui-v2/PageHeader';
import PageMetaLine from '@components/ui-v2/PageMetaLine';
import Button from '@components/ui-v2/Button';
import Data from '@components/ui-v2/Data';
import StatusPill from '@components/ui-v2/StatusPill';
import LivenessPill from '@components/ui-v2/LivenessPill';
import NoSupplierIdentity from '@components/ui-v2/NoSupplierIdentity';
import { useCurrentIdentity } from '@context/CurrentIdentityContext';
import { useVerbAvailability } from '@hooks/useVerbAvailability';
import { HandoffNotice } from '@components/ui-v2/HandoffNotice';
import { useInventory } from '@services/query/hooks';
import StockEntryPanel from './inventory/StockEntryPanel';
import { useDeliveryAgreements } from '@services/query/deliveryHooks';
import { shapeObligations } from '@services/chase';
/** @import { ChannelParseResult, QtyRefusalReason } from '@services/channel/replyParser' */
import { parseChannelReply } from '@services/channel/replyParser';
/** @import { Channel, ChannelMessage } from '@services/channel/types' */
import { makeProvenanceRef } from '@services/channel/types';
import { channelProvenanceStore } from '@services/channel/provenanceStore';
/** @import { SubmissionSessionRecorder } from '@services/sdc' */
import {
  openSubmissionSession,
  sdcClock,
  SDC_SIMULATED_NOW,
  IMPORT_DECLARE_COLUMN
} from '@services/sdc';
/** @import { CommandResult } from '@services/data/types' */
import { formatDate } from '@lib/format';
import { qty } from './inventory/inventoryDisplay';
// GL-1 - the glossary destination for this surface's refusals.
import GlossaryTermChip from '@components/ui-v2/GlossaryTermChip';

// ────────────────────────────────────────────────────────────────────────────
// Comm Hub C2 — the INBOUND CONFIRM-BEFORE-COMMIT surface (DEC-COMMS-PRIMARY).
//
// The honesty crux of the arc: where a parsed channel reply becomes governed
// truth. A parsed reply is an INFERENCE until a human confirms; this surface
// shows the inference and hands it, as a pre-fill, to the Stock page's entry
// form — whose submit is the sole dispatch. The parse is a pre-fill SOURCE,
// never a dispatch path (the retired XlsxImportPanel's doctrine).
//
// SUPPLIER-CONTEXT: the entry form scopes by the current identity, so this
// triage runs under the bound supplier's conversation. `supplierId` comes from
// that identity, NEVER from the message text. The PTI side records on a
// supplier's behalf from `BuyerChannelTriage`.
//
// HONESTY: operator-fed (no webhook / no transport exists) — SIMULATED via the
// LivenessPill; a parsed reply never auto-commits; uom is diagnostic-only; only
// the material and the quantity reach the form, as values the user can change;
// provenance is recorded on the CHANNEL side (channelMessageId → sessionId),
// never in a payload.
//
// ⚠️ BL-73 · REQ-E08-02 BR-09 — THIS PAGE NO LONGER RECORDS STOCK ITSELF. It
// used to confirm a parsed row through its own path (`parseGrid` in import mode
// → `useInventoryDeclare`), which carried ONE field (the total), its own number
// rules, and none of the Stock page's fields: supplier ROP, in production and
// its completion date, batches with manufacturing and expiry dates. That was a
// second stock entry point. A parsed row now only PRE-FILLS the Stock page's own
// entry (`StockEntryPanel`, supplier mode): the same fields, the same CR-18 /
// CR-19 checks, the same governed `declare` dispatch, recorded as "Entered on
// screen" because the supplier is the one entering it. The parse, its
// diagnostics and the channel-side provenance stay — they are not stock entry.
// ────────────────────────────────────────────────────────────────────────────

/** @type {Channel[]} */
const CHANNELS = ['whatsapp', 'email', 'wechat'];

// C5 — how many own obligations to preview inline before deferring the rest to the
// full list on the delivery mirror (compact here, never a duplicate of the mirror).
const NEEDS_CAP = 4;

/** @type {Record<QtyRefusalReason, string>} */
const QTY_REASON_KEY = {
  EMPTY_QTY: 'commHub.qtyReason.EMPTY_QTY',
  NOT_NUMERIC: 'commHub.qtyReason.NOT_NUMERIC',
  AMBIGUOUS_QTY: 'commHub.qtyReason.AMBIGUOUS_QTY'
};

const inputClass =
  'w-full px-3 py-2 text-sm text-text-primary bg-white border border-border-input rounded-md focus:outline-none focus:border-action placeholder:text-text-tertiary';
const labelClass = 'block text-label text-text-tertiary uppercase mb-1';

/** One row read from a parsed reply — a SUGGESTION for the Stock page's entry. */
/**
 * `id`: Row identity, used as the React key: `<message id>-row-<n>`, minted once in runParse. Unique because message ids are unique per parse, and stable because rows are only ever replaced wholesale. Content cannot serve: a supplier can write the same line twice.
 * `rawMaterial`:  The raw material token the supplier wrote (reference — never dispatched as-is).
 * `materialCode`:  The supplier's own material it names EXACTLY, or '' (never a guess).
 * `totalQty`:  The quantity the parser read, canonical (e.g. '2400'), or ''.
 *
 * @typedef {{
 *     readonly id: string;
 *     readonly rawMaterial: string;
 *     readonly materialCode: string;
 *     readonly totalQty: string;
 *   }} ReadRow
 */

/** A row saved through the entry form. */
/**
 * `id`:  Row identity / React key, minted on append (the same material can be saved twice).
 *
 * @typedef {{
 *     readonly id: string;
 *     readonly material: string;
 *     readonly qty: number;
 *   }} Recorded
 */

/** @type {React.FC} */
const CommHubInbound = () => {
  const { t } = useTranslation();
  const { identity } = useCurrentIdentity();
  const { supplierId } = identity;

  // The supplier's OWN stock rows — exactly the positions the Stock page offers
  // its entry form, so a material this page suggests is one the form can take.
  const inventoryQuery = useInventory();
  const positions = useMemo(() => inventoryQuery.data?.items ?? [], [inventoryQuery.data]);

  // ⚠️ THE SEAT'S AUTHORITY OVER THE ONE ACT THIS SURFACE LEADS TO. The entry
  // form dispatches `t_inventorydeclaration_declare`, whose atom
  // `inventorydeclaration:declare` is FULFILMENT's since the supplier split —
  // so a COMMERCIAL or BACK_OFFICE seat reads the wait with the lane named
  // instead of opening a form that would refuse at dispatch. The Stock page
  // gates its own entry on the same atom.
  const declareAvailability = useVerbAvailability('inventorydeclaration:declare');

  // C5 — the supplier's OWN obligations ("what Paragon needs from you"), reusing the
  // shared 5e derivation over the own-scoped delivery views (no ask-store read, no
  // send implied — chase-derived facts, TRUE without any message having been sent).
  const agreementsQuery = useDeliveryAgreements();
  const obligations = useMemo(
    () => shapeObligations(agreementsQuery.data ?? [], SDC_SIMULATED_NOW),
    [agreementsQuery.data]
  );

  const [channel, setChannel] = useState(/** @type {Channel} */ ('whatsapp'));
  const [rawText, setRawText] = useState('');
  const [parsed, setParsed] = useState(/** @type {ChannelParseResult | null} */ (null));
  const [message, setMessage] = useState(/** @type {ChannelMessage | null} */ (null));
  const [rows, setRows] = useState(/** @type {ReadRow[]} */ ([]));
  const [recorded, setRecorded] = useState(/** @type {Recorded[]} */ ([]));
  // The pre-fill handed to the entry form — held in state so its identity is
  // stable (the form re-seeds itself whenever `initial` changes).
  const [entry, setEntry] = useState(
    /** @type {{ supplierId: string; materialCode: string; soh: string } | null} */ (null)
  );

  // ONE SubmissionSession per triage visit (mirrors SupplierForecasts): the first
  // dispatch anchors the audit correlation; later dispatches chain via causationId.
  const sessionRef = useRef(/** @type {SubmissionSessionRecorder | null | null} */ (null));
  const msgSeq = useRef(0);
  const recordedSeq = useRef(0);

  if (!supplierId) return <NoSupplierIdentity />;

  const lastUpdated = sdcClock.now();

  // ── Gate 1 → parse (the reply is a SOURCE; nothing dispatches here) ──────────
  const runParse = () => {
    const result = parseChannelReply(rawText, { numberFormatHint: 'id' });
    // Construct the inbound record (C1a) — supplierId is the app binding, NEVER
    // parsed from the text. receivedAt rides the shared simulated clock.
    msgSeq.current += 1;
    /** @type {ChannelMessage} */
    const cm = {
      id: `cm-${Date.now().toString(36)}-${msgSeq.current}`,
      channel,
      supplierId,
      receivedAt: sdcClock.now(),
      rawText
    };
    setMessage(cm);
    setParsed(result);
    setRecorded([]);
    // Pre-select a material only on an EXACT match with one of the supplier's own
    // stock rows (a suggestion, never silent resolution).
    setRows(
      result.proposedRows.map((r, n) => {
        const rawMaterial = r[IMPORT_DECLARE_COLUMN.materialCode] ?? '';
        const exact = positions.some((p) => p.materialCode === rawMaterial);
        return {
          id: `${cm.id}-row-${n}`,
          rawMaterial,
          materialCode: exact ? rawMaterial : '',
          totalQty: r[IMPORT_DECLARE_COLUMN.totalQty] ?? ''
        };
      })
    );
  };

  const reset = () => {
    setRawText('');
    setParsed(null);
    setMessage(null);
    setRows([]);
    setRecorded([]);
    setEntry(null);
  };

  /**
   * @param {string} materialCode
   * @returns {string}
   */
  const uomOf = (materialCode) => positions.find((p) => p.materialCode === materialCode)?.uom ?? '';

  // ── Gate 3 → the Stock page's entry, pre-filled; its submit is the only act ──
  /** @param {ReadRow} row */
  const openEntry = (row) =>
    setEntry({ supplierId, materialCode: row.materialCode, soh: row.totalQty });

  /**
   * @param {CommandResult} res
   * @param {{ materialCode: string; totalQty: number }} saved
   */
  const onSubmitted = (res, saved) => {
    if (!sessionRef.current) {
      sessionRef.current = openSubmissionSession(
        `ss-c2-${Date.now().toString(36)}`,
        supplierId,
        sdcClock.now()
      );
    }
    sessionRef.current.attempt('InventoryDeclaration', res.entityId ?? '', res.correlationId);
    // Provenance (channel side): link the message to the session it produced —
    // once per message; later rows share the session's anchor.
    if (message && channelProvenanceStore.forMessage(message.id).length === 0) {
      channelProvenanceStore.append(makeProvenanceRef(message.id, sessionRef.current.envelope()));
    }
    recordedSeq.current += 1;
    const recordedId = `rec-${recordedSeq.current}`;
    setRecorded((prev) => [
      ...prev,
      { id: recordedId, material: saved.materialCode, qty: saved.totalQty }
    ]);
  };

  const crumb = [t('commHub.crumb.intelligence'), t('commHub.crumb.inbound')];
  const hasRows = parsed !== null && rows.length > 0;
  const recognized = parsed !== null && parsed.specHint !== null;

  return (
    <AppShellV2>
      <PageHeader
        breadcrumb={crumb}
        title={t('commHub.header.title')}
        subtitle={t('commHub.header.subtitle')}
        actions={<LivenessPill capability="inventory" />}
      />

      <PageMetaLine className="-mt-6 mb-6">
        {t('commHub.meta.line', { date: lastUpdated.slice(0, 10) })}
      </PageMetaLine>

      {/* Honesty banner — operator-fed, no live channel. */}
      <div className="mb-6 flex items-start gap-2 rounded-lg border border-warning/30 bg-warning-soft px-4 py-3 text-sm text-text-primary">
        <Info size={16} className="mt-0.5 shrink-0 text-warning-hover" />
        <div>
          <div className="font-semibold text-warning-hover">{t('commHub.honesty.title')}</div>
          <p className="mt-0.5 text-text-secondary">{t('commHub.honesty.body')}</p>
        </div>
      </div>

      {/* ── Comm Hub C5 — "what Paragon needs from you" (own obligations) ──────
          The supplier's OWN upcoming + overdue deliveries, chase-derived and
          own-scoped — TRUE without any send. Own-facing tone (no chase vocabulary);
          the OUTBOUND ASK STORE is deliberately never read here (every record is
          "composed — not sent" — surfacing it would fabricate a receipt). */}
      <section
        className="border border-border-subtle rounded-lg bg-white overflow-hidden mb-6"
        data-testid="commhub-needs"
      >
        <div className="px-4 py-3 border-b border-border-subtle bg-bg-subtle flex items-center gap-3">
          <CalendarClock size={16} className="text-teal shrink-0" aria-hidden="true" />
          <div className="min-w-0">
            <div className="text-sm font-semibold text-text-primary">
              {t('commHub.needs.title')}
            </div>
            <div className="text-xs text-text-tertiary">{t('commHub.needs.subtitle')}</div>
          </div>
          {obligations.length > 0 && (
            <span className="ml-auto text-xs text-text-tertiary">
              {t('delivery.supplier.obligations.summary', {
                overdue: obligations.filter((o) => o.kind === 'overdue').length,
                upcoming: obligations.filter((o) => o.kind === 'upcoming').length
              })}
            </span>
          )}
        </div>

        {agreementsQuery.isPending ? (
          // Don't flash the "all-clear" before the read settles — that would assert
          // "nothing due" for a moment even when obligations exist.
          <div className="px-4 py-6 text-sm text-text-tertiary">{t('commHub.needs.loading')}</div>
        ) : obligations.length === 0 ? (
          <div className="px-4 py-6 text-sm text-text-tertiary flex items-center gap-2">
            <CheckCircle2 size={16} className="text-success shrink-0" aria-hidden="true" />
            {t('delivery.supplier.obligations.empty')}
          </div>
        ) : (
          <>
            <ul className="flex flex-col">
              {obligations.slice(0, NEEDS_CAP).map((o, idx, shown) => (
                <li
                  key={o.key}
                  className={`px-4 py-3 flex items-start gap-3 border-l-[3px] ${
                    o.kind === 'overdue' ? 'border-l-danger' : 'border-l-warning'
                  } ${idx < shown.length - 1 ? 'border-b border-border-subtle' : ''}`}
                  data-testid="commhub-needs-row"
                >
                  <div className="w-8 h-8 rounded-md flex items-center justify-center shrink-0 bg-bg-hover">
                    {o.kind === 'overdue' ? (
                      <AlertTriangle size={15} className="text-danger" aria-hidden="true" />
                    ) : (
                      <Clock size={15} className="text-warning-hover" aria-hidden="true" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <span className="text-sm font-semibold text-text-primary">
                        {t(
                          o.kind === 'overdue'
                            ? 'delivery.supplier.obligations.overdue'
                            : 'delivery.supplier.obligations.upcoming'
                        )}
                      </span>
                      <Data className="text-sm">{o.materialCode}</Data>
                      <span className="text-xs text-text-tertiary">
                        {t('delivery.supplier.obligations.due', { date: formatDate(o.dueDate) })}
                      </span>
                    </div>
                    <div className="text-xs text-text-secondary">
                      {t(
                        o.kind === 'overdue'
                          ? 'delivery.supplier.obligations.overdueGloss'
                          : 'delivery.supplier.obligations.upcomingGloss'
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            {/* The full list lives on the delivery mirror — cross-link, never a
                duplicate render of it. */}
            <div className="px-4 py-2.5 border-t border-border-subtle bg-bg-subtle">
              <Link
                to="/supplier/delivery-agreements"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-action hover:text-action-hover"
                data-testid="commhub-needs-viewall"
              >
                {t('commHub.needs.viewAll')}
                <ArrowRight size={13} aria-hidden="true" />
              </Link>
            </div>
          </>
        )}
      </section>

      {/* ── The honest note — recorded here, never sent from here (C5) ──────── */}
      <div
        className="mb-6 flex items-start gap-2 rounded-lg border border-info/30 bg-info-soft px-4 py-3 text-sm text-text-primary"
        data-testid="commhub-note"
      >
        <Info size={16} className="mt-0.5 shrink-0 text-info" aria-hidden="true" />
        <div>
          <div className="font-semibold text-info">{t('commHub.note.title')}</div>
          <p className="mt-0.5 text-text-secondary">{t('commHub.note.body')}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── Gate 1 — the message source ─────────────────────────────────── */}
        <section
          className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm p-5"
          data-testid="commhub-source"
        >
          <div className="flex items-center gap-2 mb-4">
            <MessageSquare size={16} className="text-teal" />
            <h3 className="text-section text-text-primary">{t('commHub.source.title')}</h3>
          </div>

          <div className="mb-3">
            <label className={labelClass} htmlFor="commhub-channel">
              {t('commHub.source.channelLabel')}
            </label>
            <select
              id="commhub-channel"
              className={inputClass}
              value={channel}
              onChange={(e) => setChannel(/** @type {Channel} */ (e.target.value))}
            >
              {CHANNELS.map((c) => (
                <option key={c} value={c}>
                  {t(`commHub.channel.${c}`)}
                </option>
              ))}
            </select>
          </div>

          <div className="mb-1">
            <label className={labelClass} htmlFor="commhub-message">
              {t('commHub.source.messageLabel')}
            </label>
            <textarea
              id="commhub-message"
              rows={4}
              className={`${inputClass} resize-y font-mono`}
              placeholder={t('commHub.source.placeholder')}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              data-testid="commhub-message-input"
            />
          </div>
          <p className="text-xs text-text-tertiary mb-4">{t('commHub.source.hint')}</p>

          <div className="flex items-center justify-between gap-2">
            <Button
              variant="outline"
              icon={Inbox}
              disabled={rawText.trim() === ''}
              onClick={runParse}
              data-testid="commhub-parse"
            >
              {t('commHub.source.parse')}
            </Button>
            {parsed !== null && (
              <Button variant="secondary" icon={RotateCcw} onClick={reset}>
                {t('commHub.reset')}
              </Button>
            )}
          </div>
        </section>

        {/* ── Gate 2 — the inference review (the confirm gate) ─────────────── */}
        <section
          className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm p-5"
          data-testid="commhub-inference"
        >
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle2 size={16} className="text-teal" />
            <h3 className="text-section text-text-primary">{t('commHub.infer.title')}</h3>
          </div>

          {parsed === null ? (
            <p className="text-sm text-text-tertiary">{t('commHub.source.hint')}</p>
          ) : (
            <div className="flex flex-col gap-4">
              {/* Raw message echo + diagnostics (honest render of the inference). */}
              <div className="rounded-md border border-border-subtle bg-bg-hover px-3 py-2">
                <div className="text-label text-text-tertiary uppercase mb-1">
                  {t('commHub.infer.rawTitle')}
                </div>
                <Data className="text-sm text-text-primary break-words">{message?.rawText}</Data>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs">
                <StatusPill variant="neutral">
                  {t('commHub.infer.confidence', {
                    pct: Math.round((parsed.diagnostics.confidence ?? 0) * 100)
                  })}
                </StatusPill>
                {recognized && (
                  <span className="text-text-secondary">
                    {t('commHub.infer.specHint')}:{' '}
                    <strong className="text-text-primary">
                      {t('commHub.infer.specHint.inventory')}
                    </strong>
                  </span>
                )}
              </div>

              {parsed.diagnostics.matchedTokens.length > 0 && (
                <div className="text-xs text-text-secondary">
                  <span className="text-label text-text-tertiary uppercase mr-2">
                    {t('commHub.infer.matched')}
                  </span>
                  <span className="inline-flex flex-wrap gap-1">
                    {parsed.diagnostics.matchedTokens.map((tok, i) => (
                      // eslint-disable-next-line react/no-array-index-key -- immutable parser output (max 4 tokens), replaced wholesale per parse; tokens can repeat
                      <Data key={i} className="rounded bg-teal-soft px-1.5 py-0.5 text-teal-hover">
                        {tok}
                      </Data>
                    ))}
                  </span>
                </div>
              )}

              <div className="text-xs text-text-secondary">
                <span className="text-label text-text-tertiary uppercase mr-2">
                  {t('commHub.infer.unparsed')}
                </span>
                {parsed.diagnostics.unparsedRemainder ? (
                  <Data className="text-warning-hover">{parsed.diagnostics.unparsedRemainder}</Data>
                ) : (
                  <span className="text-text-tertiary">{t('commHub.infer.unparsedNone')}</span>
                )}
              </div>

              {parsed.diagnostics.uom && (
                <div className="text-xs text-text-tertiary italic">
                  {t('commHub.infer.uomDiag', { uom: parsed.diagnostics.uom })}
                </div>
              )}

              {parsed.diagnostics.qtyReason && (
                <div className="flex items-start gap-2 rounded-md border border-warning/30 bg-warning-soft px-3 py-2 text-xs text-warning-hover">
                  <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                  <span>
                    {t('commHub.infer.qtyRefused', {
                      reason: t(QTY_REASON_KEY[parsed.diagnostics.qtyReason])
                    })}{' '}
                    <GlossaryTermChip
                      refTo={{ sourceType: 'QtyRefusalReason', term: parsed.diagnostics.qtyReason }}
                    />
                  </span>
                </div>
              )}

              {/* No recognized intent OR no confirmable row: honest, nothing to record. */}
              {!hasRows && (
                <div className="rounded-md border border-border-subtle bg-bg-hover px-3 py-3">
                  <div className="text-sm font-semibold text-text-primary">
                    {t('commHub.infer.noParse.title')}
                  </div>
                  <p className="mt-0.5 text-xs text-text-secondary">
                    {t('commHub.infer.noParse.body')}
                  </p>
                </div>
              )}

              {/* The rows read from the message — each one only PRE-FILLS the Stock
                  page's entry form, which is where the stock is entered (BR-09). */}
              {hasRows && (
                <div className="flex flex-col gap-3" data-testid="commhub-rows">
                  <div className="text-label text-text-tertiary uppercase">
                    {t('commHub.row.title')}
                  </div>
                  {rows.map((row, i) => (
                    <div
                      key={row.id}
                      className="rounded-md border border-border-subtle bg-bg-hover p-3 flex flex-wrap items-center justify-between gap-2"
                      data-testid={`commhub-row-${i}`}
                    >
                      <div className="flex flex-col gap-0.5 text-xs">
                        <span className="text-text-tertiary">
                          {t('commHub.row.supplierWrote')}:{' '}
                          <Data className="text-text-secondary">{row.rawMaterial || '—'}</Data>
                          {row.totalQty !== '' && (
                            <>
                              {' · '}
                              <Data className="text-text-secondary">{row.totalQty}</Data>
                            </>
                          )}
                        </span>
                        <span
                          className={
                            row.materialCode ? 'text-text-secondary' : 'text-warning-hover'
                          }
                        >
                          {row.materialCode
                            ? t('commHub.row.matched', { material: row.materialCode })
                            : t('commHub.row.unmatched')}
                        </span>
                      </div>
                      {declareAvailability.kind === 'held' && (
                        <Button
                          variant="outline"
                          icon={PenLine}
                          onClick={() => openEntry(row)}
                          data-testid={`commhub-enter-${i}`}
                        >
                          {t('commHub.row.enter')}
                        </Button>
                      )}
                    </div>
                  ))}
                  <p className="text-xs text-text-tertiary">{t('commHub.entry.hint')}</p>
                  {declareAvailability.kind !== 'held' && (
                    <div className="flex justify-end">
                      <HandoffNotice
                        availability={declareAvailability}
                        testId="handoff-commhub-declare"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* What was saved from this message, through the entry form. */}
              {recorded.length > 0 && (
                <div className="flex flex-col gap-1.5" data-testid="commhub-result">
                  <div className="text-label text-text-tertiary uppercase">
                    {t('commHub.result.title')}
                  </div>
                  {recorded.map((o) => (
                    <div key={o.id} className="flex items-start gap-2 text-xs text-success">
                      <CheckCircle2 size={14} className="mt-0.5 shrink-0" />
                      <span>
                        {t('commHub.result.landed', {
                          material: o.material,
                          qty: `${qty(o.qty)} ${uomOf(o.material)}`.trim()
                        })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>
      </div>

      {/* The Stock page's own entry form — the only place stock is entered. */}
      {declareAvailability.kind === 'held' && (
        <StockEntryPanel
          open={entry !== null}
          onClose={() => setEntry(null)}
          mode="supplier"
          positions={positions}
          initial={entry}
          causationId={sessionRef.current?.causationAnchor() ?? undefined}
          onSubmitted={onSubmitted}
        />
      )}
    </AppShellV2>
  );
};

export default CommHubInbound;
