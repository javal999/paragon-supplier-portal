import React, { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import AppShellV2 from '../components/layout-v2/AppShellV2';
import PageHeader from '../components/ui-v2/PageHeader';
import PageMetaLine from '../components/ui-v2/PageMetaLine';
import SampleDataBadge from '../components/ui-v2/SampleDataBadge';
import Button from '../components/ui-v2/Button';
import Data from '../components/ui-v2/Data';
import StatusPill from '../components/ui-v2/StatusPill';
import Table from '../components/ui-v2/Table';
import TableHeader, { TableHeaderCell } from '../components/ui-v2/TableHeader';
import TableRow from '../components/ui-v2/TableRow';
import TableCell from '../components/ui-v2/TableCell';
import LoadingState from '../components/ui-v2/LoadingState';
import ErrorState from '../components/ui-v2/ErrorState';
import SessionAttachments from '../components/ui-v2/SessionAttachments';
import { HandoffNotice } from '../components/ui-v2/HandoffNotice';
import { useVerbAvailability } from '../hooks/useVerbAvailability';
import { useToast } from '../hooks/useToast';
import { formatDate } from '../lib/format';
import {
  useInviteeCandidates,
  useRfiEvents,
  useRfpAwards,
  useRfpEvents,
  useRfpOfferRounds,
  useRFQs,
} from '../services/query/hooks';
import { useRfxCommand } from '../services/query/commandHooks';
import type { GateResult } from '../services/sourcing/complianceGate';
import { rfpOptionRef } from '../services/sourcing/rfpFirmOffer';
import { RfpFirmOfferRounds } from './rfx/RfpFirmOffers';
import { RfpAwardSection, awardRecordsInForce, awardedRefsOf } from './rfx/RfpAwardSection';
import { rfpSettledOptionRefs, type RfpOptionSettlement } from '../services/sourcing/rfpAward';
import { RFP_TERM_GROUP_ORDER, rfpTermGroupOf, rfxFamilyForCategory, rfxSectionsOf } from '../services/sourcing/rfxConfig';
import { prefillRfpFromRfi } from '../services/sourcing/rfxPrefill';
import { rfpTemplateStore } from '../services/sourcing/rfxTemplates';
import { rfpScoringOf } from './rfx/rfpScoring';
import type { RfpEventView } from '../services/sourcing/views';
import RfpCreateWizard from './rfx/RfpCreateWizard';
import RfxSaveTemplate from './rfx/RfxSaveTemplate';
import { RfpPricingComparison } from './rfx/RfpPricing';
import { DeadlinePill, EmptyRow, OtifOrNoHistory, ResponseStatePill, rfxNow } from './rfx/rfxDisplay';
import { AnswerValue, authored, sectionTitle, termLabel, termValueText } from './rfx/rfxAuthoringDisplay';
import { DraftRevisionNote } from './rfx/draftEdit';
import { DocumentsStatus, SupplierDocumentsPanel } from './rfx/SupplierDocumentsPanel';

// ─────────────────────────────────────────────────────────────────────────────
// PTI PROPOSAL REQUESTS — REQ-E03-04 (BUY).
//
// An RFP asks for TERMS, not a price, so the comparison is shaped the way the
// requirement specifies and not the way a quote comparison is: TERMS ARE ROWS,
// SUPPLIERS ARE COLUMNS, and every deviation is highlighted with the comment the
// supplier had to write for it. A CUSTOM term (the buyer's own, RFx authoring)
// sits in its group beside the standard ones, labelled in the buyer's words.
//
// Where the RFP carries a price basis and a standard lead time — the two terms
// the standard list marks scorable — the proposals are ALSO scored with CR-15,
// reliability read from each supplier's OTIF. An RFP that carries neither is not
// scored at all, and says so: a weighted number invented from prose would be the
// fabricated-score defect in a new document.
//
// ⚠️ **INDICATIVE PRICING (D4) IS COMPARED OPTIONS × SUPPLIERS AND IS NEVER
// SCORED.** Every price there is labelled Indicative, and a supplier's own
// option is shown as proposed by that supplier.
//
// ⚠️ **AND THE EVENT IS RAISED HERE (section 3.6a).** "New RFP" opens the wizard;
// the lifecycle is offered BY STATE — Send on a Draft, Close on an Open one,
// Extend where `t_rfp_extend` legally runs (Open AND Closed, because reopening a
// window somebody asked for is not a state change). A seat without `rfp:publish`
// reads whose act it is rather than a button the dispatcher would refuse.
//
// `?rfi=<id>` opens the wizard pre-filled from that RFI (D3); the created RFP
// records `sourceRfiId` and the detail shows "Created from RFI-…".
//
// BL-93 — a Draft offers **Edit draft** (`rfp:create`, the create wizard
// re-opened on every stored field, saving through `t_rfp_revise_draft`); a seat
// without the atom reads whose act it is in the button's own slot.
//
// RFx D3 (NR-2) — a Closed or Partly awarded RFP (RFX-D15) offers "Ask for firm
// offers" (`rfp:negotiate`) for its options still open, and lists its
// firm-offer rounds; the pricing comparison shows each firm
// price labelled Firm with its validity beside the Indicative ones; the award
// section is the shared award panel over the options of the closed rounds
// (`rfp:award`), with the recorded awards, cancel and "Raised in SAP"; and
// "Create RFQ from this RFP" leaves out every option an award in force
// placed (NR-2 BR-08), naming the options by ref.
// ─────────────────────────────────────────────────────────────────────────────

/** CR-23 for a supplier the candidate read does not list (suspended, blacklisted, unknown). */
const NOT_SELECTABLE: GateResult = { passes: false, failed: ['status'] };

const BuyerRfp: React.FC = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const events = useRfpEvents();
  const rfis = useRfiEvents();
  const publish = useVerbAvailability('rfp:publish');
  const create = useVerbAvailability('rfp:create');
  const command = useRfxCommand();
  const offerRounds = useRfpOfferRounds();
  const rfpAwards = useRfpAwards();
  // RFX-D15 — the RFQs created from an RFP settle the options they source.
  const rfqs = useRFQs();
  // CR-23 on an RFP judges no material (it names none): the candidate read's
  // gate, with no material codes, is the gate the round and award policies use.
  const candidates = useInviteeCandidates();
  const [params, setParams] = useSearchParams();
  const [wizardOpen, setWizardOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  // `?open=<id>` lands on one event — the RFQ event page's "Created from RFP-…"
  // link points here.
  const [openId, setOpenId] = useState<string | null>(() => params.get('open'));
  const [extendTo, setExtendTo] = useState<Record<string, string>>({});

  // The eyebrow is the menu section alone (the `PageHeader` rule): it read
  // "Sourcing · Proposal requests" above the title "Proposal requests".
  const crumb = [t('hub.nav.section.sourcing')];
  const items = useMemo(() => events.data?.items ?? [], [events.data]);

  // D3 — `?rfi=<id>` asks for an RFP pre-filled from that RFI. Only a seat
  // holding `rfp:create` gets the wizard; the others read whose act it is.
  const sourceRfiId = params.get('rfi');
  const sourceRfi = sourceRfiId ? (rfis.data?.items ?? []).find((e) => e.id === sourceRfiId) : undefined;
  const prefill = useMemo(
    () =>
      sourceRfi
        ? { ...prefillRfpFromRfi(sourceRfi, sourceRfi.responses), sourceRfiNumber: sourceRfi.eventNumber }
        : undefined,
    [sourceRfi],
  );

  if (events.isPending) return <LoadingState breadcrumb={crumb} />;
  if (events.isError)
    return <ErrorState breadcrumb={crumb} error={events.error} onRetry={() => events.refetch()} />;

  const open = items.find((e) => e.id === openId) ?? null;
  const editing = items.find((e) => e.id === editingId && e.status === 'Draft') ?? null;
  const showWizard = create.kind === 'held' && (wizardOpen || !!prefill);

  const closeWizard = () => {
    setWizardOpen(false);
    if (sourceRfiId) setParams({}, { replace: true });
  };

  /** One runner for every RFP verb this page offers — one refusal path, not four. */
  const run = (vars: Parameters<typeof command.mutate>[0], successKey: string) =>
    command.mutate(vars, {
      onSuccess: (res) =>
        toast(
          res.status === 'failed'
            ? { variant: 'error', title: t('rfx.toast.refused', { reason: res.reason ?? '' }) }
            : { variant: 'success', title: t(successKey) },
        ),
      onError: () => toast({ variant: 'error', title: t('rfx.toast.refused', { reason: '' }) }),
    });

  const extend = (event: RfpEventView) =>
    run(
      { verb: 'extendRfp', rfpId: event.id, deadline: extendTo[event.id] ?? '' },
      'rfx.toast.extended',
    );

  const gateOf = (supplierId: string): GateResult =>
    (candidates.data?.items ?? []).find((c) => c.supplierId === supplierId)?.gate ?? NOT_SELECTABLE;
  const openRounds = open ? (offerRounds.data?.items ?? []).filter((r) => r.rfpId === open.id) : [];
  const openAwards = open ? (rfpAwards.data?.items ?? []).filter((a) => a.eventId === open.id) : [];
  // RFX-D15 — the options a new firm-offer round may no longer name, by the
  // rule the round policy judges with (`rfpSettledOptionRefs`).
  const openSettled = open
    ? rfpSettledOptionRefs(open.id, awardRecordsInForce(openAwards), rfqs.data?.items ?? [])
    : new Map<string, RfpOptionSettlement>();
  const supplierName = (supplierId: string): string =>
    open?.invitedSuppliers.find((i) => i.supplierId === supplierId)?.supplierName ?? supplierId;

  return (
    <AppShellV2>
      <PageHeader breadcrumb={crumb} title={t('rfx.rfp.title')} count={items.length} subtitle={t('rfx.rfp.subtitle')} />
      <PageMetaLine className="-mt-6 mb-4">
        {t('rfx.asOf')} <Data>{formatDate(rfxNow())}</Data>
        <SampleDataBadge className="ml-3 align-middle" />
      </PageMetaLine>

      {/* CE-01 — the buyer raises the event; a seat without `rfp:create` reads
          WHOSE act it is rather than losing the affordance silently (§72a). */}
      <div className="flex flex-wrap items-center justify-end gap-3 mb-4">
        {publish.kind !== 'held' && (
          <HandoffNotice availability={publish} testId="handoff-rfp-publish" />
        )}
        {create.kind === 'held' ? (
          <Button variant="outline" onClick={() => setWizardOpen(true)} data-testid="rfp-new">
            {t('rfx.rfp.new')}
          </Button>
        ) : (
          <HandoffNotice availability={create} testId="handoff-rfp-create" />
        )}
      </div>

      <div className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm overflow-x-auto">
        <Table>
          <TableHeader>
            <TableHeaderCell>{t('rfx.rfi.eventTitle')}</TableHeaderCell>
            <TableHeaderCell>{t('rfx.deadline')}</TableHeaderCell>
            <TableHeaderCell>{t('rfx.rfp.col.term')}</TableHeaderCell>
            <TableHeaderCell>{t('rfx.response.submitted')}</TableHeaderCell>
            <TableHeaderCell>{''}</TableHeaderCell>
          </TableHeader>
          <tbody>
            {items.map((event) => (
              <TableRow key={event.id} data-testid={`rfp-row-${event.id}`}>
                <TableCell className="align-top">
                  <Data className="font-semibold">{event.eventNumber}</Data>
                  <div className="text-sm text-text-primary">{event.title}</div>
                  <StatusPill variant={event.closed ? 'neutral' : 'info'} className="mt-1">
                    {t(`rfx.status.${event.status}`)}
                  </StatusPill>
                  {event.confidentiality && (
                    <StatusPill variant="neutral" className="mt-1 ml-1">
                      {t('rfxa.conf.pill')}
                    </StatusPill>
                  )}
                </TableCell>
                <TableCell className="align-top whitespace-nowrap">
                  <DeadlinePill deadline={event.responseDeadline} done={event.closed} />
                </TableCell>
                <TableCell className="align-top text-sm">
                  {t('rfx.rfp.terms', { count: event.terms.length })}
                  {event.pricing && (
                    <div className="text-xs text-text-tertiary">
                      {t('rfxa.pricing.summary', {
                        options: t('rfxa.pricing.optionCount', { count: event.pricing.options.length }),
                        points: t('rfxa.pricing.pointCount', { count: event.pricing.quantityPoints.length }),
                      })}
                    </div>
                  )}
                </TableCell>
                <TableCell className="align-top text-sm">
                  {t('rfx.rfp.proposals', { count: event.responses.length })}
                </TableCell>
                <TableCell className="align-top text-right">
                  <Button
                    variant="secondary"
                    onClick={() => setOpenId(openId === event.id ? null : event.id)}
                    data-testid={`rfp-open-${event.id}`}
                  >
                    {openId === event.id
                      ? t('rfx.close')
                      : event.status === 'Draft'
                        ? t('rfx.rfp.openEvent')
                        : t('rfx.rfp.compare')}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {items.length === 0 && (
              <EmptyRow colSpan={5} testId="rfp-empty">
                {t('rfx.rfp.empty')}
              </EmptyRow>
            )}
          </tbody>
        </Table>
      </div>

      {open && (
        <section className="mt-6 space-y-6" data-testid={`rfp-detail-${open.id}`}>
          <div className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm p-4">
            {/* — The event, and the acts its STATE allows. — */}
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <Data className="font-semibold">{open.eventNumber}</Data>
                <h3 className="text-sm font-semibold text-text-primary">{open.title}</h3>
                <StatusPill variant={open.closed ? 'neutral' : 'info'} className="mt-1">
                  {t(`rfx.status.${open.status}`)}
                </StatusPill>
                {open.sourceRfiNumber && (
                  <p className="text-xs text-text-tertiary mt-1" data-testid={`rfp-from-rfi-${open.id}`}>
                    {t('rfx.event.fromRfi', { event: open.sourceRfiNumber })}
                  </p>
                )}
                <DraftRevisionNote revisions={open.revisions} testId={`rfp-last-edited-${open.id}`} />
              </div>
              <div className="flex flex-wrap items-center gap-3">
                {open.status === 'Draft' &&
                  (create.kind === 'held' ? (
                    <Button variant="secondary" onClick={() => setEditingId(open.id)} data-testid={`rfp-edit-${open.id}`}>
                      {t('rfxEdit.edit')}
                    </Button>
                  ) : (
                    <HandoffNotice availability={create} testId={`handoff-rfp-edit-${open.id}`} />
                  ))}
                {open.status === 'Draft' && (
                  <Button
                    variant="outline"
                    disabled={publish.kind !== 'held'}
                    data-testid={`rfp-send-${open.id}`}
                    onClick={() => run({ verb: 'publishRfp', rfpId: open.id }, 'rfx.toast.published')}
                  >
                    {t('rfx.rfp.publish')}
                  </Button>
                )}
                {/* BL-93 — DISCARD a draft: the existing `t_rfp_cancel` (legal
                    from Draft), the same `rfp:publish` atom as Send; a seat
                    without it reads the page's publish notice. */}
                {open.status === 'Draft' && (
                  <Button
                    variant="secondary"
                    className="text-danger"
                    disabled={publish.kind !== 'held'}
                    data-testid={`rfp-discard-${open.id}`}
                    onClick={() => run({ verb: 'discardRfp', rfpId: open.id }, 'rfxEdit.toast.discarded')}
                  >
                    {t('rfxEdit.discard')}
                  </Button>
                )}
                {open.status === 'Open' && (
                  <Button
                    variant="secondary"
                    disabled={publish.kind !== 'held'}
                    data-testid={`rfp-close-${open.id}`}
                    onClick={() => run({ verb: 'closeRfp', rfpId: open.id }, 'rfx.toast.closed')}
                  >
                    {t('rfx.rfp.closeEvent')}
                  </Button>
                )}
              </div>
            </div>
            {open.status === 'Draft' && (
              <p className="text-xs text-text-tertiary mt-3" data-testid={`rfp-draft-notice-${open.id}`}>
                {t('rfx.status.draftHiddenFromSuppliers')}
              </p>
            )}
            <h4 className="text-xs uppercase tracking-wide text-text-tertiary mt-4">
              {t('rfx.rfp.scope')}
            </h4>
            <p className="text-sm text-text-secondary mt-1 whitespace-pre-line">{open.scope}</p>
            {(open.attachments ?? []).length > 0 && (
              <div className="mt-3">
                <SessionAttachments
                  value={open.attachments ?? []}
                  label={t('rfxa.att.buyer')}
                  testId={`rfp-attachments-${open.id}`}
                />
              </div>
            )}
            {open.confidentiality && (
              <p className="text-xs text-text-tertiary mt-3" data-testid={`rfp-confidential-${open.id}`}>
                {t('rfxa.conf.buyerNote')}
              </p>
            )}
            {open.termsDocument && (
              <div className="mt-3" data-testid={`rfp-tc-${open.id}`}>
                <h4 className="text-xs uppercase tracking-wide text-text-tertiary">{t('rfxa.tc.title')}</h4>
                {open.termsDocument.text && (
                  <p className="text-sm text-text-secondary whitespace-pre-line">{open.termsDocument.text}</p>
                )}
                {open.termsDocument.attachment && (
                  <SessionAttachments
                    value={[open.termsDocument.attachment]}
                    label={t('rfxa.tc.file')}
                    testId={`rfp-tc-file-${open.id}`}
                  />
                )}
              </div>
            )}
            <div className="flex flex-wrap items-end gap-3 mt-4">
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1" htmlFor={`rfp-extend-${open.id}`}>
                  {t('rfx.rfi.extend')}
                </label>
                <input
                  id={`rfp-extend-${open.id}`}
                  type="date"
                  value={extendTo[open.id] ?? ''}
                  onChange={(e) => setExtendTo((prev) => ({ ...prev, [open.id]: e.target.value }))}
                  className="bg-white border border-border-input rounded-md px-3 h-10 text-sm focus:outline-none focus:border-action"
                />
              </div>
              <Button
                variant="outline"
                disabled={publish.kind !== 'held' || !extendTo[open.id]}
                onClick={() => extend(open)}
                data-testid={`rfp-extend-btn-${open.id}`}
              >
                {t('rfx.rfi.extendAll')}
              </Button>
            </div>
            <div className="mt-4">
              <RfxSaveTemplate
                key={open.id}
                testIdPrefix={`rfp-${open.id}`}
                defaultName={open.title}
                onSave={(name) =>
                  rfpTemplateStore.save(
                    name,
                    {
                      familyId: rfxFamilyForCategory(open.materialCategory)?.id ?? '',
                      scope: open.scope,
                      currency: open.currency,
                      terms: open.terms,
                      questions: open.questions ?? [],
                      customSections: open.customSections ?? [],
                      ...(open.pricing ? { pricing: open.pricing } : {}),
                      confidential: !!open.confidentiality,
                      ...(open.confidentiality?.terms ? { confidentialityTerms: open.confidentiality.terms } : {}),
                      ...(open.termsDocument?.text ? { termsText: open.termsDocument.text } : {}),
                    },
                    rfxNow(),
                  )
                }
              />
            </div>
          </div>

          <RfpInvitees event={open} />
          <RfpComparison event={open} />
          {open.pricing && (
            <RfpPricingComparison
              request={open.pricing}
              currency={open.currency}
              responses={open.responses}
              testId={`rfp-pricing-${open.id}`}
              firmPrices={openRounds[0]?.firmPrices ?? []}
            />
          )}
          {open.status !== 'Draft' && !!open.pricing && (
            <RfpFirmOfferRounds
              event={open}
              rounds={openRounds}
              gateOf={gateOf}
              settled={openSettled}
              pending={command.isPending}
              run={run}
            />
          )}
          {/* Edge case 6 — an RFP with no pricing step says it cannot be
              awarded; a priced one shows the section once it is past Open. */}
          {open.status !== 'Draft' && (open.status !== 'Open' || !open.pricing) && (
            <RfpAwardSection
              event={open}
              rounds={openRounds}
              awards={openAwards}
              gateOf={gateOf}
              supplierName={supplierName}
              pending={command.isPending}
              run={run}
            />
          )}
          {rfpToRfqOffered(open) && (
            <RfpToRfq event={open} awardedRefs={awardedRefsOf(openAwards)} />
          )}
          {(open.questions ?? []).length > 0 && <RfpQuestionAnswers event={open} />}
          {/* RFx B5 — every supplier file, submitted proposals only (NR-1 buyer step 5). */}
          <SupplierDocumentsPanel
            requests={open.documentRequests}
            responses={open.responses}
            deadlineFor={(supplierId) =>
              open.invitedSuppliers.find((i) => i.supplierId === supplierId)?.deadline ?? open.responseDeadline
            }
            testId={`rfp-documents-${open.id}`}
          />
        </section>
      )}

      {create.kind !== 'held' && sourceRfiId && (
        <div className="mt-4">
          <HandoffNotice availability={create} testId="handoff-rfp-from-rfi" />
        </div>
      )}

      {editing && create.kind === 'held' && (
        <RfpCreateWizard
          key={`edit-${editing.id}`}
          editing={editing}
          canPublish={publish.kind === 'held'}
          onCancel={() => setEditingId(null)}
          onCreated={(rfpId) => {
            setEditingId(null);
            setOpenId(rfpId);
          }}
        />
      )}

      {showWizard && (
        <RfpCreateWizard
          key={prefill?.sourceRfiId ?? 'blank'}
          pastEvents={items}
          prefill={prefill}
          canPublish={publish.kind === 'held'}
          onCancel={closeWizard}
          onCreated={(rfpId) => {
            // Land the buyer ON the new event — the act just performed is in view.
            closeWizard();
            setOpenId(rfpId);
          }}
        />
      )}
    </AppShellV2>
  );
};

/**
 * D3 — "Create RFQ from this RFP" is offered only where it can do something: an
 * RFP that asked for indicative prices on options AND holds at least one
 * submitted proposal (the view carries submitted proposals only). Without
 * options there is nothing to turn into items; without a proposal there is
 * nobody to invite and no supplier option to choose — a button there would be a
 * false affordance.
 */
const rfpToRfqOffered = (event: RfpEventView): boolean =>
  (event.pricing?.options.length ?? 0) > 0 && event.responses.length > 0;

/**
 * The buyer picks the options — PTI's own and any a supplier proposed — and the
 * RFQ wizard opens pre-filled from them (`/buyer/rfq?rfp=…&options=…`, read by
 * the sourcing board through `prefillRfqItemsFromRfp`). Creating an RFQ is
 * `rfq:create`; a seat without it reads whose act it is instead (§72a).
 *
 * RFx D3 (NR-2 BR-08, AC-06) — each option travels by its REF
 * (`rfpOptionRef`: a supplier's `sup-opt-N` names its proposer), and an option
 * an award in force already placed is not offered: it cannot go to an RFQ as
 * well, while the others stay available.
 */
const RfpToRfq: React.FC<{ event: RfpEventView; awardedRefs: ReadonlyMap<string, string> }> = ({
  event,
  awardedRefs,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const create = useVerbAvailability('rfq:create');
  const [chosen, setChosen] = useState<string[]>([]);
  const options = [
    ...(event.pricing?.options ?? []).map((o) => ({ option: o, ref: rfpOptionRef(o.id), by: null as string | null })),
    ...event.responses.flatMap((r) =>
      (r.pricing?.proposedOptions ?? []).map((o) => ({
        option: o,
        ref: rfpOptionRef(o.id, r.supplierId),
        by: r.supplierName,
      })),
    ),
  ].filter((o) => !awardedRefs.has(o.ref));
  const toggle = (id: string) =>
    setChosen((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  const go = () =>
    navigate(
      `/buyer/rfq?rfp=${encodeURIComponent(event.id)}&options=${chosen.map(encodeURIComponent).join(',')}`,
    );
  return (
    <div
      className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm p-4"
      data-testid={`rfp-to-rfq-${event.id}`}
    >
      <h4 className="text-sm font-semibold text-text-primary">{t('rfx.rfp.toRfq.title')}</h4>
      <p className="text-xs text-text-tertiary mt-1">{t('rfx.rfp.toRfq.hint')}</p>
      <fieldset className="mt-3 space-y-2">
        <legend className="sr-only">{t('rfx.rfp.toRfq.title')}</legend>
        {options.map(({ option, ref, by }) => (
          <label key={ref} className="flex items-start gap-2 text-sm text-text-primary">
            <input
              type="checkbox"
              className="mt-1"
              checked={chosen.includes(ref)}
              onChange={() => toggle(ref)}
              data-testid={`rfp-to-rfq-option-${ref}`}
            />
            <span>
              {option.title}
              <span className="block text-xs text-text-tertiary">
                {by ? t('rfx.rfp.toRfq.proposedBy', { supplier: by }) : t('rfx.rfp.toRfq.pti')}
                {option.description ? ` · ${option.description}` : ''}
              </span>
            </span>
          </label>
        ))}
      </fieldset>
      <div className="flex flex-wrap items-center gap-3 mt-4">
        {create.kind === 'held' ? (
          <>
            <Button
              variant="outline"
              disabled={chosen.length === 0}
              onClick={go}
              data-testid={`rfp-to-rfq-btn-${event.id}`}
            >
              {t('rfx.rfp.toRfq.button')}
            </Button>
            {chosen.length === 0 && (
              <span className="text-xs text-text-tertiary">{t('rfx.rfp.toRfq.pick')}</span>
            )}
          </>
        ) : (
          <HandoffNotice availability={create} testId="handoff-rfp-to-rfq" />
        )}
      </div>
    </div>
  );
};

const RfpInvitees: React.FC<{ event: RfpEventView }> = ({ event }) => {
  const { t } = useTranslation();
  const acceptedCell = (at: string | null, testId: string) => (
    <TableCell data-testid={testId}>
      {at ? <Data>{formatDate(at)}</Data> : <span className="text-xs text-text-tertiary">{t('rfxa.conf.notYet')}</span>}
    </TableCell>
  );
  return (
    <div className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm overflow-x-auto">
      <Table>
        <TableHeader>
          <TableHeaderCell>{t('rfx.invite.col.supplier')}</TableHeaderCell>
          <TableHeaderCell>{t('rfx.invite.col.otif')}</TableHeaderCell>
          <TableHeaderCell>{t('rfx.deadline.own')}</TableHeaderCell>
          <TableHeaderCell>{t('rfx.response.submitted')}</TableHeaderCell>
          {event.confidentiality && <TableHeaderCell>{t('rfxa.conf.col')}</TableHeaderCell>}
          {event.termsDocument && <TableHeaderCell>{t('rfxa.tc.col')}</TableHeaderCell>}
        </TableHeader>
        <tbody>
          {event.invitedSuppliers.map((invitee) => (
            <TableRow key={invitee.supplierId} data-testid={`rfp-invitee-${invitee.supplierId}`}>
              <TableCell>{invitee.supplierName}</TableCell>
              <TableCell>
                <OtifOrNoHistory otif={invitee.otif} testId={`rfp-otif-${invitee.supplierId}`} />
              </TableCell>
              <TableCell className="whitespace-nowrap">
                <DeadlinePill deadline={invitee.deadline} done={invitee.responseState === 'submitted'} />
              </TableCell>
              <TableCell>
                <ResponseStatePill state={invitee.responseState} />
              </TableCell>
              {event.confidentiality &&
                acceptedCell(invitee.confidentialityAcceptedAt, `rfp-accepted-${event.id}-${invitee.supplierId}`)}
              {event.termsDocument &&
                acceptedCell(invitee.termsAcceptedAt, `rfp-tc-accepted-${event.id}-${invitee.supplierId}`)}
            </TableRow>
          ))}
        </tbody>
      </Table>
    </div>
  );
};

/** REQ-E03-04 — terms as rows, suppliers as columns, deviations highlighted. */
const RfpComparison: React.FC<{ event: RfpEventView }> = ({ event }) => {
  const { t } = useTranslation();
  const scoring = rfpScoringOf(event);
  const scoreById = new Map(
    scoring?.kind === 'scored' ? scoring.scores.map((s) => [s.quoteId, s] as const) : [],
  );

  if (event.responses.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-text-tertiary" data-testid="rfp-no-proposals">
        {t('rfx.rfp.empty')}
      </p>
    );
  }

  return (
    <div className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm overflow-x-auto">
      <Table>
        <TableHeader>
          <TableHeaderCell>{t('rfx.rfp.col.term')}</TableHeaderCell>
          <TableHeaderCell>{t('rfx.rfp.col.requested')}</TableHeaderCell>
          {event.responses.map((r) => (
            <TableHeaderCell key={r.id}>
              {r.supplierName}
              <div className="text-xs font-normal normal-case text-text-tertiary">
                {t('rfx.rfp.deviations', { count: r.deviationCount })}
                {scoreById.has(r.id) && (
                  <>
                    {' · '}
                    {t('rfx.rfp.scored')} <Data>{scoreById.get(r.id)!.composite}</Data>
                    {scoreById.get(r.id)!.topRanked && (
                      <StatusPill variant="success" className="ml-1">
                        {t('rfx.cmp.best')}
                      </StatusPill>
                    )}
                  </>
                )}
              </div>
            </TableHeaderCell>
          ))}
        </TableHeader>
        <tbody>
          {RFP_TERM_GROUP_ORDER.flatMap((group) => {
            const rows = event.terms.filter((row) => rfpTermGroupOf(row) === group);
            if (rows.length === 0) return [];
            return rows.map((row, index) => (
              <TableRow key={row.termId} data-testid={`rfp-term-${row.termId}`}>
                <TableCell className="align-top">
                  {index === 0 && (
                    <div className="text-xs uppercase tracking-wide text-text-tertiary">
                      {t(`rfx.group.${group}`)}
                    </div>
                  )}
                  <div className="text-sm text-text-primary">{termLabel(t, row)}</div>
                  {row.termId.startsWith('custom-') && (
                    <StatusPill variant="neutral" className="mt-1">
                      {t('rfxa.term.customPill')}
                    </StatusPill>
                  )}
                </TableCell>
                <TableCell className="align-top text-sm text-text-secondary">
                  <Data>{termValueText(t, row, row.requestedValue)}</Data>
                </TableCell>
                {event.responses.map((r) => {
                  const a = r.answers.find((x) => x.termId === row.termId);
                  const deviates = a?.stance === 'deviate';
                  return (
                    <TableCell
                      key={r.id}
                      className={`align-top ${deviates ? 'bg-warning-soft' : ''}`}
                      data-testid={`rfp-cell-${row.termId}-${r.supplierId}`}
                    >
                      <div className="text-sm text-text-primary">
                        <Data>{termValueText(t, row, a?.proposedValue)}</Data>
                      </div>
                      {a && (
                        <StatusPill variant={deviates ? 'warning' : 'success'} className="mt-1">
                          {t(`rfx.stance.${a.stance}`)}
                        </StatusPill>
                      )}
                      {deviates && a?.comment && (
                        <div className="text-xs text-warning-hover mt-1">{a.comment}</div>
                      )}
                    </TableCell>
                  );
                })}
              </TableRow>
            ));
          })}
          {/* REQ-E03-04 edge case — the free-text terms a supplier added. */}
          <TableRow data-testid="rfp-other-terms">
            <TableCell className="align-top">
              <div className="text-xs uppercase tracking-wide text-text-tertiary">{t('rfx.group.other')}</div>
              <div className="text-sm text-text-primary">{t('rfx.rfp.otherTerms')}</div>
            </TableCell>
            <TableCell className="align-top text-sm text-text-tertiary">—</TableCell>
            {event.responses.map((r) => (
              <TableCell key={r.id} className="align-top text-sm text-text-secondary">
                {r.otherTerms ?? '—'}
              </TableCell>
            ))}
          </TableRow>
          {/* RFx B5 — NR-1 buyer step 6: the required documents, per supplier. */}
          <TableRow data-testid="rfp-documents-row">
            <TableCell className="align-top text-sm text-text-primary">{t('rfxFiles.docs.row')}</TableCell>
            <TableCell className="align-top text-sm text-text-tertiary">—</TableCell>
            {event.responses.map((r) => (
              <TableCell key={r.id} className="align-top">
                <DocumentsStatus
                  requests={event.documentRequests ?? []}
                  documents={r.documents ?? []}
                  testId={`rfp-documents-${r.supplierId}`}
                />
              </TableCell>
            ))}
          </TableRow>
        </tbody>
      </Table>
      {scoring === null && (
        <p className="px-4 py-3 text-xs text-text-tertiary border-t border-border-subtle" data-testid="rfp-not-scorable">
          {t('rfx.rfp.notScorable')}
        </p>
      )}
    </div>
  );
};

/** The RFP's questions section, answers side by side (submitted proposals only). */
const RfpQuestionAnswers: React.FC<{ event: RfpEventView }> = ({ event }) => {
  const { t } = useTranslation();
  if (event.responses.length === 0) return null;
  return (
    <div className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm overflow-x-auto" data-testid={`rfp-answers-${event.id}`}>
      <div className="px-4 py-3 border-b border-border-subtle text-sm font-semibold text-text-primary">
        {t('rfxa.step.rfpQuestions')}
      </div>
      <Table>
        <TableHeader>
          <TableHeaderCell>{t('rfx.rfi.section')}</TableHeaderCell>
          {event.responses.map((r) => (
            <TableHeaderCell key={r.id}>{r.supplierName}</TableHeaderCell>
          ))}
        </TableHeader>
        <tbody>
          {rfxSectionsOf(event.customSections).flatMap((section) =>
            (event.questions ?? [])
              .filter((q) => q.sectionId === section.id)
              .map((q) => (
                <TableRow key={q.id}>
                  <TableCell className="align-top">
                    <div className="text-xs text-text-tertiary">{sectionTitle(t, section)}</div>
                    <div className="text-sm text-text-primary">{authored(t, q.promptKey)}</div>
                  </TableCell>
                  {event.responses.map((r) => (
                    <TableCell key={r.id} className="align-top text-sm">
                      <AnswerValue
                        q={q}
                        a={(r.questionAnswers ?? []).find((a) => a.questionId === q.id)}
                        testId={`rfp-answer-files-${q.id}-${r.supplierId}`}
                      />
                    </TableCell>
                  ))}
                </TableRow>
              )),
          )}
        </tbody>
      </Table>
    </div>
  );
};

export default BuyerRfp;
