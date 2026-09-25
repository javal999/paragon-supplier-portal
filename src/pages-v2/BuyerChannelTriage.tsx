import React, { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Inbox, Info, MessageSquare, PenLine, RotateCcw, CheckCircle2, AlertTriangle } from 'lucide-react';
import Button from '../components/ui-v2/Button';
import Data from '../components/ui-v2/Data';
import StatusPill from '../components/ui-v2/StatusPill';
import SelectField from '../components/ui-v2/SelectField';
import { useInventory, useSuppliers } from '../services/query/hooks';
import StockEntryPanel from './inventory/StockEntryPanel';
import { HandoffNotice } from '../components/ui-v2/HandoffNotice';
import { useVerbAvailability } from '../hooks/useVerbAvailability';
import { parseChannelReply, type ChannelParseResult, type QtyRefusalReason } from '../services/channel/replyParser';
import { makeProvenanceRef, type Channel, type ChannelMessage } from '../services/channel/types';
import { channelProvenanceStore } from '../services/channel/provenanceStore';
import {
  openSubmissionSession,
  sdcClock,
  knownMaterialCodes,
  IMPORT_DECLARE_COLUMN,
  type SubmissionSessionRecorder,
} from '../services/sdc';
import type { CommandResult } from '../services/data/types';
import { qty } from './inventory/inventoryDisplay';
// GL-1 - the glossary destination for this surface's refusals.
import GlossaryTermChip from '../components/ui-v2/GlossaryTermChip';

// ────────────────────────────────────────────────────────────────────────────
// Comm Hub C4d — the buyer IN-PLACE TRIAGE CONFIRM (DEC-COMMS-PRIMARY).
//
// The surface that makes the C4c recording verb usable. A planner records an SOH
// assertion a supplier made over an ungoverned channel; the DR-10 actor is
// truthfully the BUYER (Paragon recorded the supplier's words — not the supplier
// self-submitting through the portal).
//
// It mirrors CommHubInbound (C2) — same honesty discipline, SHARED machinery
// (parseChannelReply, openSubmissionSession, the reply-parser vocabulary + the
// generic `commHub.*` diagnostic i18n, and the Stock page's entry form) — with
// TWO deliberate differences:
//   · BINDING: the SUBJECT supplier is chosen AT CAPTURE ("whose conversation is
//     this?") BEFORE the paste. That one choice mints the ChannelMessage; the
//     entry form is opened with the supplier LOCKED to it and NEVER offers a free
//     supplierId field.
//   · VERB: the form runs in PTI mode, so it dispatches `record`
//     (t_inventorydeclaration_record), the buyer recording verb — never the
//     supplier's `declare`.
//
// HONESTY (identical to C2): operator-fed, no live channel — nothing is sent or
// received here; a parsed reply is a SUGGESTION until the form is saved; uom is
// diagnostic-only; an unknown material is never pre-selected (no silent
// resolution). The RESULT is framed "Recorded by Paragon from {channel}" —
// never "the supplier submitted it".
//
// ⚠️ BL-73 · REQ-E08-02 BR-08 / BR-09 — THE RECORD IS MADE BY THE INVENTORY
// PAGE'S OWN ENTRY FORM, NOT BY THIS PANEL. This panel used to confirm through
// its own path (`parseGrid` in import mode → `useInventoryRecord`): one field
// (the total), its own number rules, none of the entry form's fields (supplier
// ROP, in production and its completion date, batches with manufacturing and
// expiry dates), and a cache carve-out that left the Inventory and Stock pages
// stale. A parsed row now only PRE-FILLS `StockEntryPanel` in PTI mode — the
// same form `BuyerInventory` opens with "Record stock" — with the supplier
// BOUND (`lockSupplier`): same fields, same CR-18 / CR-19 checks, the same
// governed `record` dispatch, stored as "Entered by PTI" and shown to the
// supplier on its Stock page. The binding, the parse and the channel-side
// provenance stay here; the act does not.
// ────────────────────────────────────────────────────────────────────────────

const CHANNELS: Channel[] = ['whatsapp', 'email', 'wechat'];

const QTY_REASON_KEY: Record<QtyRefusalReason, string> = {
  EMPTY_QTY: 'commHub.qtyReason.EMPTY_QTY',
  NOT_NUMERIC: 'commHub.qtyReason.NOT_NUMERIC',
  AMBIGUOUS_QTY: 'commHub.qtyReason.AMBIGUOUS_QTY',
};

const inputClass =
  'w-full px-3 py-2 text-sm text-text-primary bg-white border border-border-input rounded-md focus:outline-none focus:border-action placeholder:text-text-tertiary';
const labelClass = 'block text-label text-text-tertiary uppercase mb-1';

/** One row read from a parsed reply — a SUGGESTION for the entry form. */
interface ReadRow {
  readonly rawMaterial: string;
  /** The subject's own stock row it names EXACTLY, or '' (never a guess). */
  readonly materialCode: string;
  readonly totalQty: string;
}

/** A row recorded through the entry form. */
interface Recorded {
  readonly material: string;
  readonly qty: number;
}

interface BuyerChannelTriageProps {
  /** Called after a declaration is recorded, so the parent's channel-sourced
   *  audit trail (which reads the append-only provenance store) re-renders. */
  onRecorded?: () => void;
}

const BuyerChannelTriage: React.FC<BuyerChannelTriageProps> = ({ onRecorded }) => {
  const { t } = useTranslation();
  const suppliersQuery = useSuppliers();
  const suppliers = useMemo(() => suppliersQuery.data?.items ?? [], [suppliersQuery.data]);
  // The same read the Inventory page hands its entry form.
  const inventoryQuery = useInventory();

  // §74 — the seat's authority over `t_inventorydeclaration_record`
  // (atom `inventorydeclaration:record`, held by `planning`). The entry form's
  // submit is the ONE act this surface leads to; a seat without it reads whose.
  const recordAvailability = useVerbAvailability('inventorydeclaration:record');

  // THE BINDING, FIRST: the subject supplier is chosen at capture. Everything
  // downstream (the ChannelMessage, the material suggestion, the entry form)
  // derives from it. There is no free supplierId field anywhere after this.
  const [subjectSupplierId, setSubjectSupplierId] = useState('');
  const [channel, setChannel] = useState<Channel>('whatsapp');
  const [rawText, setRawText] = useState('');
  const [parsed, setParsed] = useState<ChannelParseResult | null>(null);
  const [message, setMessage] = useState<ChannelMessage | null>(null);
  const [rows, setRows] = useState<ReadRow[]>([]);
  const [recorded, setRecorded] = useState<Recorded[]>([]);
  const [entry, setEntry] = useState<{ supplierId: string; materialCode: string; soh: string } | null>(null);

  const sessionRef = useRef<SubmissionSessionRecorder | null>(null);
  const msgSeq = useRef(0);

  // The subject's stock rows — EXACTLY the supplier × material pairs the entry
  // form offers and the record verb accepts (its assignments).
  const subjectPositions = useMemo(
    () => (inventoryQuery.data?.items ?? []).filter((p) => p.supplierId === subjectSupplierId),
    [inventoryQuery.data, subjectSupplierId],
  );

  const subjectName = useMemo(
    () => suppliers.find((s) => s.id === subjectSupplierId)?.name ?? subjectSupplierId,
    [suppliers, subjectSupplierId],
  );

  const subjectUom = (materialCode: string): string =>
    subjectPositions.find((p) => p.materialCode === materialCode)?.uom ?? '';

  // ── Gate 1 → parse (the reply is a SOURCE; nothing dispatches here) ──────────
  const runParse = () => {
    if (!subjectSupplierId) return; // binding first — cannot parse without a subject
    // CP-2 · B1 — MEMBERSHIP-FIRST classification. The subject's own materials
    // are EXACTLY what a legitimate reply could name; the master's remaining
    // codes come second so a canonical code the subject does not hold is still
    // read as the MATERIAL (and then stays unmatched) rather than being silently
    // captured as the QUANTITY.
    const result = parseChannelReply(rawText, {
      numberFormatHint: 'id',
      knownMaterials: [...subjectPositions.map((p) => p.materialCode), ...knownMaterialCodes()],
    });
    // The ChannelMessage's supplierId is the SUBJECT binding — chosen at capture,
    // NEVER parsed from the text (C1a). receivedAt rides the shared simulated clock.
    msgSeq.current += 1;
    const cm: ChannelMessage = {
      id: `cm-c4d-${Date.now().toString(36)}-${msgSeq.current}`,
      channel,
      supplierId: subjectSupplierId,
      receivedAt: sdcClock.now(),
      rawText,
    };
    setMessage(cm);
    setParsed(result);
    setRecorded([]);
    setRows(
      result.proposedRows.map((r) => {
        const rawMaterial = r[IMPORT_DECLARE_COLUMN.materialCode] ?? '';
        const exact = subjectPositions.some((p) => p.materialCode === rawMaterial);
        return {
          rawMaterial,
          materialCode: exact ? rawMaterial : '',
          totalQty: r[IMPORT_DECLARE_COLUMN.totalQty] ?? '',
        };
      }),
    );
  };

  // Picking a new subject invalidates any in-flight parse (the binding changed).
  const pickSupplier = (id: string) => {
    setSubjectSupplierId(id);
    setParsed(null);
    setMessage(null);
    setRows([]);
    setRecorded([]);
    setEntry(null);
    sessionRef.current = null;
  };

  const reset = () => {
    setRawText('');
    setParsed(null);
    setMessage(null);
    setRows([]);
    setRecorded([]);
    setEntry(null);
    sessionRef.current = null;
  };

  // ── Gate 3 → the entry form, pre-filled and BOUND; its submit is the act ─────
  const openEntry = (row: ReadRow) => {
    if (!message) return;
    // The supplier is the MESSAGE's binding, never a field.
    setEntry({ supplierId: message.supplierId, materialCode: row.materialCode, soh: row.totalQty });
  };

  const onSubmitted = (res: CommandResult, saved: { materialCode: string; totalQty: number }) => {
    if (!message) return;
    if (!sessionRef.current) {
      sessionRef.current = openSubmissionSession(
        `ss-c4d-${Date.now().toString(36)}`,
        message.supplierId, // the SUBJECT supplier — the envelope is "about X"
        sdcClock.now(),
      );
    }
    sessionRef.current.attempt('InventoryDeclaration', res.entityId ?? '', res.correlationId);
    // Provenance (channel side): link the message to the session it produced —
    // channelMessageId → sessionId / causationAnchor, never in a payload. Once
    // per message; later rows share the session's anchor.
    if (channelProvenanceStore.forMessage(message.id).length === 0) {
      channelProvenanceStore.append(makeProvenanceRef(message.id, sessionRef.current.envelope()));
    }
    setRecorded((prev) => [...prev, { material: saved.materialCode, qty: saved.totalQty }]);
    onRecorded?.(); // let the parent refresh its channel-sourced audit trail
  };

  const hasRows = parsed !== null && rows.length > 0;
  const recognized = parsed !== null && parsed.specHint !== null;

  return (
    <section data-testid="commhub-triage">
      <div className="flex items-center gap-2 mb-1">
        <Inbox size={16} className="text-teal" aria-hidden="true" />
        <h2 className="text-section text-text-primary">{t('buyerCommHub.triage.title')}</h2>
      </div>
      <p className="text-sm text-text-tertiary mb-4">{t('buyerCommHub.triage.subtitle')}</p>

      <div className="border border-border-subtle rounded-lg bg-white p-5 flex flex-col gap-5">
        {/* ── The binding, FIRST — whose conversation is this? ─────────────── */}
        <div>
          <label className={labelClass} htmlFor="triage-supplier">
            {t('buyerCommHub.triage.supplierLabel')}
          </label>
          <SelectField
            id="triage-supplier"
            testId="triage-supplier"
            options={suppliers.map((s) => ({ value: s.id, label: s.name }))}
            value={subjectSupplierId || null}
            onChange={(id) => pickSupplier(id ?? '')}
            clearable
            placeholder={t('buyerCommHub.triage.supplierSelect')}
            loading={suppliersQuery.isPending}
            error={suppliersQuery.isError}
            onRetry={() => suppliersQuery.refetch()}
            name="triage-supplier"
          />
          <p className="mt-1 text-[11px] text-text-tertiary">{t('buyerCommHub.triage.supplierHint')}</p>
        </div>

        {subjectSupplierId === '' ? (
          <div className="rounded-md border border-border-subtle bg-bg-subtle px-4 py-6 text-center text-sm text-text-tertiary">
            {t('buyerCommHub.triage.pickSupplierFirst')}
          </div>
        ) : (
          <>
            {/* Recording-for banner — the bound subject, shown read-only. */}
            <div className="flex items-center gap-2 rounded-md border border-action/30 bg-action-soft px-3 py-2 text-sm">
              <MessageSquare size={14} className="text-action shrink-0" aria-hidden="true" />
              <span className="text-text-secondary">
                {t('buyerCommHub.triage.recordingFor')}{' '}
                <strong className="text-text-primary">{subjectName}</strong>
              </span>
            </div>

            {/* ── Gate 1 — the message source ──────────────────────────────── */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className={labelClass} htmlFor="triage-channel">
                  {t('buyerCommHub.triage.channelLabel')}
                </label>
                <select
                  id="triage-channel"
                  className={inputClass}
                  value={channel}
                  onChange={(e) => setChannel(e.target.value as Channel)}
                >
                  {CHANNELS.map((c) => (
                    <option key={c} value={c}>
                      {t(`buyerCommHub.channel.${c}`)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass} htmlFor="triage-message">
                  {t('buyerCommHub.triage.messageLabel')}
                </label>
                <textarea
                  id="triage-message"
                  rows={2}
                  className={`${inputClass} resize-y font-mono`}
                  placeholder={t('buyerCommHub.triage.placeholder')}
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  data-testid="triage-message"
                />
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 -mt-1">
              <p className="text-xs text-text-tertiary">{t('buyerCommHub.triage.messageHint')}</p>
              <div className="flex items-center gap-2">
                {parsed !== null && (
                  <Button variant="secondary" icon={RotateCcw} onClick={reset}>
                    {t('buyerCommHub.triage.reset')}
                  </Button>
                )}
                <Button
                  variant="outline"
                  icon={Inbox}
                  disabled={rawText.trim() === ''}
                  onClick={runParse}
                  data-testid="triage-parse"
                >
                  {t('buyerCommHub.triage.parse')}
                </Button>
              </div>
            </div>

            {/* ── Gate 2 — the inference review (the confirm gate) ──────────── */}
            {parsed !== null && (
              <div className="flex flex-col gap-4 border-t border-border-subtle pt-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-teal" aria-hidden="true" />
                  <h3 className="text-section text-text-primary">{t('buyerCommHub.triage.inferTitle')}</h3>
                </div>

                {/* Raw message echo. */}
                <div className="rounded-md border border-border-subtle bg-bg-hover px-3 py-2">
                  <div className="text-label text-text-tertiary uppercase mb-1">{t('buyerCommHub.triage.rawTitle')}</div>
                  <Data className="text-sm text-text-primary break-words">{message?.rawText}</Data>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <StatusPill variant="neutral">
                    {t('commHub.infer.confidence', { pct: Math.round((parsed.diagnostics.confidence ?? 0) * 100) })}
                  </StatusPill>
                  {recognized && (
                    <span className="text-text-secondary">
                      {t('commHub.infer.specHint')}:{' '}
                      <strong className="text-text-primary">{t('commHub.infer.specHint.inventory')}</strong>
                    </span>
                  )}
                </div>

                {parsed.diagnostics.matchedTokens.length > 0 && (
                  <div className="text-xs text-text-secondary">
                    <span className="text-label text-text-tertiary uppercase mr-2">{t('commHub.infer.matched')}</span>
                    <span className="inline-flex flex-wrap gap-1">
                      {parsed.diagnostics.matchedTokens.map((tok, i) => (
                        <Data key={i} className="rounded bg-teal-soft px-1.5 py-0.5 text-teal-hover">
                          {tok}
                        </Data>
                      ))}
                    </span>
                  </div>
                )}

                <div className="text-xs text-text-secondary">
                  <span className="text-label text-text-tertiary uppercase mr-2">{t('commHub.infer.unparsed')}</span>
                  {parsed.diagnostics.unparsedRemainder
                    ? <Data className="text-warning-hover">{parsed.diagnostics.unparsedRemainder}</Data>
                    : <span className="text-text-tertiary">{t('commHub.infer.unparsedNone')}</span>}
                </div>

                {parsed.diagnostics.uom && (
                  <div className="text-xs text-text-tertiary italic">
                    {t('commHub.infer.uomDiag', { uom: parsed.diagnostics.uom })}
                  </div>
                )}

                {parsed.diagnostics.qtyReason && (
                  <div className="flex items-start gap-2 rounded-md border border-warning/30 bg-warning-soft px-3 py-2 text-xs text-warning-hover">
                    <AlertTriangle size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
                    <span>
                      {t('commHub.infer.qtyRefused', { reason: t(QTY_REASON_KEY[parsed.diagnostics.qtyReason]) })}{' '}
                      <GlossaryTermChip
                        refTo={{ sourceType: 'QtyRefusalReason', term: parsed.diagnostics.qtyReason }}
                      />
                    </span>
                  </div>
                )}

                {!hasRows && (
                  <div className="rounded-md border border-border-subtle bg-bg-hover px-3 py-3">
                    <div className="text-sm font-semibold text-text-primary">{t('commHub.infer.noParse.title')}</div>
                    <p className="mt-0.5 text-xs text-text-secondary">{t('commHub.infer.noParse.body')}</p>
                  </div>
                )}

                {hasRows && (
                  <div className="flex flex-col gap-3" data-testid="triage-rows">
                    <div className="text-label text-text-tertiary uppercase">{t('buyerCommHub.triage.rowTitle')}</div>
                    {rows.map((row, i) => (
                      <div
                        key={i}
                        className="rounded-md border border-border-subtle bg-bg-hover p-3 flex flex-wrap items-center justify-between gap-2"
                        data-testid={`triage-row-${i}`}
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
                          <span className={row.materialCode ? 'text-text-secondary' : 'text-warning-hover'}>
                            {row.materialCode
                              ? t('buyerCommHub.triage.row.matched', { material: row.materialCode, supplier: subjectName })
                              : t('buyerCommHub.triage.row.unmatched', { supplier: subjectName })}
                          </span>
                        </div>
                        {recordAvailability.kind === 'held' && (
                          <Button
                            variant="outline"
                            icon={PenLine}
                            onClick={() => openEntry(row)}
                            data-testid={`triage-enter-${i}`}
                          >
                            {t('buyerCommHub.triage.row.record')}
                          </Button>
                        )}
                      </div>
                    ))}

                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs text-text-tertiary">{t('buyerCommHub.triage.entryHint')}</p>
                      {recordAvailability.kind !== 'held' && (
                        <HandoffNotice availability={recordAvailability} testId="handoff-triage-record" />
                      )}
                    </div>
                  </div>
                )}

                {/* Result — the C4c semantic ON SCREEN: RECORDED BY PARAGON. */}
                {recorded.length > 0 && (
                  <div className="flex flex-col gap-1.5 border-t border-border-subtle pt-3" data-testid="triage-result">
                    <div className="text-label text-text-tertiary uppercase">{t('buyerCommHub.triage.resultTitle')}</div>
                    {recorded.map((o, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs text-success">
                        <CheckCircle2 size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
                        <span>
                          {t('buyerCommHub.triage.result.landed', {
                            channel: t(`buyerCommHub.channel.${channel}`),
                            material: o.material,
                            qty: `${qty(o.qty)} ${subjectUom(o.material)}`.trim(),
                          })}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* Honesty footer — operator-fed, actor is Paragon. */}
        <div className="flex items-start gap-2 border-t border-border-subtle pt-3 text-xs text-text-tertiary">
          <Info size={13} className="mt-0.5 shrink-0 text-warning-hover" aria-hidden="true" />
          <span>{t('buyerCommHub.triage.honestyNote')}</span>
        </div>
      </div>

      {/* The Inventory page's own entry form, bound to the subject supplier. */}
      {recordAvailability.kind === 'held' && (
        <StockEntryPanel
          open={entry !== null}
          onClose={() => setEntry(null)}
          mode="pti"
          lockSupplier
          positions={subjectPositions}
          initial={entry}
          causationId={sessionRef.current?.causationAnchor() ?? undefined}
          onSubmitted={onSubmitted}
        />
      )}
    </section>
  );
};

export default BuyerChannelTriage;
