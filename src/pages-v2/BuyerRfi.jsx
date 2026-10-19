/** @import React from 'react' */
import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import AppShellV2 from '@components/layout-v2/AppShellV2';
import PageHeader from '@components/ui-v2/PageHeader';
import PageMetaLine from '@components/ui-v2/PageMetaLine';
import SampleDataBadge from '@components/ui-v2/SampleDataBadge';
import Button from '@components/ui-v2/Button';
import Data from '@components/ui-v2/Data';
import StatusPill from '@components/ui-v2/StatusPill';
import {
  EligibilityMarker,
  EventSourcingType,
  QualificationWarningsNote
} from './rfx/eligibilityDisplay';
import Table from '@components/ui-v2/Table';
import TableHeader, { TableHeaderCell } from '@components/ui-v2/TableHeader';
import TableRow from '@components/ui-v2/TableRow';
import TableCell from '@components/ui-v2/TableCell';
import LoadingState from '@components/ui-v2/LoadingState';
import ErrorState from '@components/ui-v2/ErrorState';
import { HandoffNotice } from '@components/ui-v2/HandoffNotice';
import { useVerbAvailability } from '@hooks/useVerbAvailability';
/** @import { VerbAvailability } from '@services/transitions/handoff' */
import { useToast } from '@hooks/useToast';
import { formatDate } from '@lib/format';
import { useRfiEvents } from '@services/query/hooks';
import { useRfxCommand } from '@services/query/commandHooks';
import { rfxFamilyForCategory, rfxSectionsOf } from '@services/sourcing/rfxConfig';
import { rfiTemplateStore } from '@services/sourcing/rfxTemplates';
/** @import { RfiEventView } from '@services/sourcing/views' */
import SessionAttachments from '@components/ui-v2/SessionAttachments';
import RfiCreateWizard from './rfx/RfiCreateWizard';
import RfxSaveTemplate from './rfx/RfxSaveTemplate';
import {
  DeadlinePill,
  EmptyRow,
  OtifOrNoHistory,
  ResponseStatePill,
  rfxNow
} from './rfx/rfxDisplay';
import { AnswerValue, IndicativePill, authored, sectionTitle } from './rfx/rfxAuthoringDisplay';
import { DraftRevisionNote } from './rfx/draftEdit';
import { SupplierDocumentsPanel } from './rfx/SupplierDocumentsPanel';
import { ConfirmSheet, closeEffects } from './rfx/ConfirmSheet';

// ─────────────────────────────────────────────────────────────────────────────
// PTI INFORMATION REQUESTS — REQ-E03-02 (BUY).
//
// The buyer's side of the RFI: the events, who was invited, who has answered,
// and the answers side by side. Three things on this page are the requirement
// rather than decoration:
//
//   · A DRAFT ANSWER IS NOT HERE. The read hides it (REQ-E03-02 edge case), so
//     the comparison below cannot accidentally show a supplier's unsent work.
//   · THE RESPONSE SCORE SHORTLISTS AND NOTHING ELSE. It is printed beside the
//     supplier with the sentence that says so; no button on this page acts on it.
//   · THE DEADLINE CAN BE EXTENDED FOR ALL OR FOR SELECTED INVITEES, and the
//     per-invitee deadline is what the submit verb actually enforces.
//
// "Create a quotation request from this" carries the RFI forward (REQ-E03-03
// AC-02): it opens the RFQ wizard with the event named, and every pre-filled
// field stays editable there. "Create a proposal request from this" (spec D3)
// does the same into the RFP wizard (`/buyer/rfp?rfi=…`), offered on an Open or
// Closed RFI — a Draft has no responders to carry, a Cancelled one no standing.
//
// RFx authoring: the detail shows the buyer's attachments, WHO HAS ACCEPTED a
// confidential event's terms and when, every answer in its question's kind
// (an indicative price range labelled so), and "Save as template" (D2).
//
// ⚠️ **THE EVENT IS RAISED HERE TOO (section 3.6a), AND THE LIFECYCLE IS OFFERED
// BY STATE RATHER THAN BY GUESS.** "New RFI" opens the wizard; a Draft offers
// Send and nothing else; an Open event offers Close and Extend; a Closed one
// offers Extend alone, because `t_rfi_extend` legally leaves a Closed event
// (reopening a window somebody asked for) while `t_rfi_close` does not run twice.
// A button the machine would refuse is worse than an absent one: it teaches the
// buyer that the screen does not know the rules.
//
// BL-93 — a Draft also offers **Edit draft**: the create wizard, re-opened on
// every stored field, saving through `t_rfi_revise_draft`. It needs
// `rfi:create` (the seat that may draft may finish its draft), so a seat
// without it reads whose act it is in the button's own slot; the wizard itself
// is gated on the same atom, not only its door.
// ─────────────────────────────────────────────────────────────────────────────

/** @type {React.FC} */
const BuyerRfi = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const events = useRfiEvents();
  const publish = useVerbAvailability('rfi:publish');
  const create = useVerbAvailability('rfi:create');
  const createRfp = useVerbAvailability('rfp:create');
  const command = useRfxCommand();
  const [wizardOpen, setWizardOpen] = useState(false);
  // BL-93 — the Draft being edited, by id; the event is re-derived from the
  // live read so the wizard opens on what the store holds now.
  const [editingId, setEditingId] = useState(/** @type {string | null} */ (null));
  // `?open=<id>` lands on one event — the RFQ event page's "Created from RFI-…"
  // link points here.
  const [params] = useSearchParams();
  const [openId, setOpenId] = useState(
    /** @type {() => string | null} */ (() => params.get('open'))
  );
  const [extendFor, setExtendFor] = useState(/** @type {Record<string, string>} */ ({}));
  const [extendOnly, setExtendOnly] = useState(/** @type {Record<string, string[]>} */ ({}));

  // The eyebrow is the menu section alone (the `PageHeader` rule).
  const crumb = [t('hub.nav.section.sourcing')];
  const items = useMemo(() => events.data?.items ?? [], [events.data]);

  if (events.isPending) return <LoadingState breadcrumb={crumb} />;
  if (events.isError)
    return <ErrorState breadcrumb={crumb} error={events.error} onRetry={() => events.refetch()} />;

  const open = items.find((e) => e.id === openId) ?? null;
  const editing = items.find((e) => e.id === editingId && e.status === 'Draft') ?? null;

  /**
   * @param {Parameters<typeof command.mutate>[0]} vars
   * @param {string} successKey
   */
  const run = (vars, successKey) =>
    command.mutate(vars, {
      onSuccess: (res) => {
        if (res.status === 'failed') {
          toast({ variant: 'error', title: t('rfx.toast.refused', { reason: res.reason ?? '' }) });
          return;
        }
        toast({ variant: 'success', title: t(successKey) });
      },
      onError: () => toast({ variant: 'error', title: t('rfx.toast.refused', { reason: '' }) })
    });

  return (
    <AppShellV2>
      <PageHeader
        breadcrumb={crumb}
        title={t('rfx.rfi.title')}
        count={items.length}
        subtitle={t('rfx.rfi.subtitle')}
      />
      <PageMetaLine className="-mt-6 mb-4">
        {t('rfx.asOf')} <Data>{formatDate(rfxNow())}</Data>
        <SampleDataBadge className="ml-3 align-middle" />
      </PageMetaLine>

      {/* CE-01 — the buyer raises the event. A seat without `rfi:create` reads
          WHOSE act it is rather than losing the affordance silently (§72a). */}
      <div className="flex flex-wrap items-center justify-end gap-3 mb-4">
        {publish.kind !== 'held' && (
          <HandoffNotice availability={publish} testId="handoff-rfi-publish" />
        )}
        {create.kind === 'held' ? (
          <Button variant="outline" onClick={() => setWizardOpen(true)} data-testid="rfi-new">
            {t('rfx.rfi.new')}
          </Button>
        ) : (
          <HandoffNotice availability={create} testId="handoff-rfi-create" />
        )}
      </div>

      <div className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm overflow-x-auto">
        <Table>
          <TableHeader>
            <TableHeaderCell>{t('rfx.rfi.eventTitle')}</TableHeaderCell>
            <TableHeaderCell>{t('rfx.deadline')}</TableHeaderCell>
            <TableHeaderCell>{t('rfx.rfi.template')}</TableHeaderCell>
            <TableHeaderCell>{t('rfx.response.submitted')}</TableHeaderCell>
            <TableHeaderCell>{''}</TableHeaderCell>
          </TableHeader>
          <tbody>
            {items.map((event) => (
              <TableRow key={event.id} data-testid={`rfi-row-${event.id}`}>
                <TableCell className="align-top">
                  <Data className="font-semibold">{event.eventNumber}</Data>
                  <div className="text-sm text-text-primary">{event.title}</div>
                  <StatusPill variant={event.closed ? 'neutral' : 'info'} className="mt-1">
                    {t(`rfx.status.${event.status}`)}
                  </StatusPill>
                </TableCell>
                <TableCell className="align-top whitespace-nowrap">
                  <DeadlinePill deadline={event.responseDeadline} done={event.closed} />
                  {event.extensions.length > 0 && (
                    <div className="text-xs text-text-tertiary mt-1">{t('rfx.extended')}</div>
                  )}
                </TableCell>
                <TableCell className="align-top text-sm text-text-secondary">
                  {t(`rfx.template.${event.templateId}`)}
                  <div className="text-xs text-text-tertiary">
                    {t('rfx.rfi.questions', { count: event.questions.length })}
                  </div>
                </TableCell>
                <TableCell className="align-top text-sm">
                  {t('rfx.rfi.responses', { count: event.responses.length })}
                </TableCell>
                <TableCell className="align-top text-right">
                  <Button
                    variant="secondary"
                    onClick={() => setOpenId(openId === event.id ? null : event.id)}
                    data-testid={`rfi-open-${event.id}`}
                  >
                    {openId === event.id
                      ? t('rfx.close')
                      : event.status === 'Draft'
                        ? t('rfx.rfi.openEvent')
                        : t('rfx.rfi.answer')}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {items.length === 0 && (
              <EmptyRow colSpan={5} testId="rfi-empty">
                {t('rfx.rfi.empty')}
              </EmptyRow>
            )}
          </tbody>
        </Table>
      </div>

      {open && (
        <RfiDetail
          event={open}
          run={run}
          onCreateRfq={() => navigate(`/buyer/rfq?rfi=${open.id}`)}
          onCreateRfp={() => navigate(`/buyer/rfp?rfi=${open.id}`)}
          createRfpAvailability={createRfp}
          extendFor={extendFor}
          setExtendFor={setExtendFor}
          extendOnly={extendOnly}
          setExtendOnly={setExtendOnly}
          canPublish={publish.kind === 'held'}
          publishAvailability={publish}
          createAvailability={create}
          onEdit={() => setEditingId(open.id)}
        />
      )}

      {editing && create.kind === 'held' && (
        <RfiCreateWizard
          key={editing.id}
          editing={editing}
          canPublish={publish.kind === 'held'}
          onCancel={() => setEditingId(null)}
          onCreated={(rfiId) => {
            setEditingId(null);
            setOpenId(rfiId);
          }}
        />
      )}

      {wizardOpen && (
        <RfiCreateWizard
          pastEvents={items}
          canPublish={publish.kind === 'held'}
          onCancel={() => setWizardOpen(false)}
          onCreated={(rfiId) => {
            // Land the buyer ON the new event rather than on a board they then
            // have to search: the act they just performed is the one in view.
            setWizardOpen(false);
            setOpenId(rfiId);
          }}
        />
      )}
    </AppShellV2>
  );
};

/**
 * @typedef {object} DetailProps
 * @property {RfiEventView} event
 * @property {(vars: Parameters<ReturnType<typeof useRfxCommand>['mutate']>[0], successKey: string) => void} run
 * @property {() => void} onCreateRfq
 * @property {() => void} onCreateRfp
 * @property {VerbAvailability} createRfpAvailability -  Whose act raising an RFP is, when this seat does not hold `rfp:create`.
 * @property {Record<string, string>} extendFor
 * @property {React.Dispatch<React.SetStateAction<Record<string, string>>>} setExtendFor
 * @property {Record<string, string[]>} extendOnly
 * @property {React.Dispatch<React.SetStateAction<Record<string, string[]>>>} setExtendOnly
 * @property {boolean} canPublish
 * @property {VerbAvailability} publishAvailability -  Whose act publishing is, when this seat does not hold it.
 * @property {VerbAvailability} createAvailability -  BL-93 — editing a draft is `rfi:create`.
 * @property {() => void} onEdit
 */

/** @type {React.FC<DetailProps>} */
const RfiDetail = ({
  event,
  run,
  onCreateRfq,
  onCreateRfp,
  createRfpAvailability,
  extendFor,
  setExtendFor,
  extendOnly,
  setExtendOnly,
  canPublish,
  publishAvailability,
  createAvailability,
  onEdit
}) => {
  const { t } = useTranslation();
  const only = extendOnly[event.id] ?? [];
  const deadline = extendFor[event.id] ?? '';
  // RFx UX 1C (B-05) — "Close the event" opens a confirmation sheet; the
  // close is dispatched only from the sheet.
  // Held by event id, so moving to another event never carries the sheet over.
  const [confirmClose, setConfirmClose] = useState(/** @type {string | null} */ (null));

  return (
    <section className="mt-6 space-y-6" data-testid={`rfi-detail-${event.id}`}>
      {/* — The event itself, and the acts its STATE allows. — */}
      <div className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <Data className="font-semibold">{event.eventNumber}</Data>
            <h3 className="text-sm font-semibold text-text-primary">{event.title}</h3>
            <StatusPill variant={event.closed ? 'neutral' : 'info'} className="mt-1">
              {t(`rfx.status.${event.status}`)}
            </StatusPill>
            {/* Material G2 (MR-10 BR-06) — the type, fixed at publish. */}
            <div className="mt-1">
              <EventSourcingType
                event={{
                  kind: 'rfi',
                  status: event.status,
                  materialCategory: event.materialCategory,
                  ...(event.purchasingGroup ? { purchasingGroup: event.purchasingGroup } : {}),
                  ...(event.sourcingType ? { sourcingType: event.sourcingType } : {})
                }}
                testId={`rfi-sourcing-type-${event.id}`}
              />
            </div>
            {/* BL-147 — the invitees published below the level on placeholder rules, as recorded. */}
            {!!event.qualificationWarnings && event.qualificationWarnings.length > 0 && (
              <div className="mt-2">
                <QualificationWarningsNote
                  kind="published"
                  warnings={event.qualificationWarnings}
                  supplierName={(sid) =>
                    event.invitedSuppliers.find((i) => i.supplierId === sid)?.supplierName ?? sid
                  }
                  testId={`rfi-published-warnings-${event.id}`}
                />
              </div>
            )}
            <DraftRevisionNote revisions={event.revisions} testId={`rfi-last-edited-${event.id}`} />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {event.status === 'Draft' &&
              (createAvailability.kind === 'held' ? (
                <Button variant="secondary" onClick={onEdit} data-testid={`rfi-edit-${event.id}`}>
                  {t('rfxEdit.edit')}
                </Button>
              ) : (
                <HandoffNotice
                  availability={createAvailability}
                  testId={`handoff-rfi-edit-${event.id}`}
                />
              ))}
            {publishAvailability.kind !== 'held' && (
              <HandoffNotice
                availability={publishAvailability}
                testId={`handoff-rfi-lifecycle-${event.id}`}
              />
            )}
            {event.status === 'Draft' && (
              <Button
                variant="outline"
                disabled={!canPublish}
                data-testid={`rfi-send-${event.id}`}
                onClick={() => run({ verb: 'publishRfi', rfiId: event.id }, 'rfx.toast.published')}
              >
                {t('rfx.rfi.publish')}
              </Button>
            )}
            {/* BL-93 — DISCARD a draft: the existing `t_rfi_cancel`, which is
                legal from Draft. Same atom as Send (`rfi:publish`), so a seat
                without it reads the lifecycle notice above. */}
            {event.status === 'Draft' && (
              <Button
                variant="secondary"
                className="text-danger"
                disabled={!canPublish}
                data-testid={`rfi-discard-${event.id}`}
                onClick={() =>
                  run({ verb: 'discardRfi', rfiId: event.id }, 'rfxEdit.toast.discarded')
                }
              >
                {t('rfxEdit.discard')}
              </Button>
            )}
            {event.status === 'Open' && (
              <Button
                variant="secondary"
                disabled={!canPublish}
                data-testid={`rfi-close-${event.id}`}
                onClick={() => setConfirmClose(event.id)}
              >
                {t('rfx.rfi.closeEvent')}
              </Button>
            )}
          </div>
        </div>
        {confirmClose === event.id && event.status === 'Open' && (
          <div className="mt-3">
            <ConfirmSheet
              title={t('rfx.confirm.close.title')}
              effects={closeEffects(t, {
                invited: event.invitedSuppliers.length,
                responded: event.responses.length
              })}
              confirmLabel={t('rfx.rfi.closeEvent')}
              confirmDisabled={!canPublish}
              onConfirm={() => {
                setConfirmClose(null);
                run({ verb: 'closeRfi', rfiId: event.id }, 'rfx.toast.closed');
              }}
              onBack={() => setConfirmClose(null)}
              testId={`rfi-close-sheet-${event.id}`}
              confirmTestId={`rfi-close-confirm-${event.id}`}
            />
          </div>
        )}
        {event.description && (
          <div className="mt-3">
            <h4 className="text-xs uppercase tracking-wide text-text-tertiary">
              {t('rfx.rfi.about')}
            </h4>
            <p className="text-sm text-text-secondary">{event.description}</p>
          </div>
        )}
        {event.status === 'Draft' && (
          <p
            className="text-xs text-text-tertiary mt-3"
            data-testid={`rfi-draft-notice-${event.id}`}
          >
            {t('rfx.status.draftHiddenFromSuppliers')}
          </p>
        )}
        {(event.attachments ?? []).length > 0 && (
          <div className="mt-3">
            <SessionAttachments
              value={event.attachments ?? []}
              label={t('rfxa.att.buyer')}
              testId={`rfi-attachments-${event.id}`}
            />
          </div>
        )}
        {event.confidentiality && (
          <p
            className="text-xs text-text-tertiary mt-3"
            data-testid={`rfi-confidential-${event.id}`}
          >
            {t('rfxa.conf.buyerNote')}
          </p>
        )}
        {/* D3 — RFI → RFP. Offered on an Open or Closed event: a Draft has no
            responders to carry forward, and a Cancelled one no standing. */}
        {(event.status === 'Open' || event.status === 'Closed') && (
          <div className="flex flex-wrap items-center gap-3 mt-4">
            {createRfpAvailability.kind === 'held' ? (
              <Button
                variant="outline"
                onClick={onCreateRfp}
                data-testid={`rfi-to-rfp-${event.id}`}
              >
                {t('rfxa.rfi.createRfp')}
              </Button>
            ) : (
              <HandoffNotice
                availability={createRfpAvailability}
                testId={`handoff-rfi-to-rfp-${event.id}`}
              />
            )}
          </div>
        )}
        <div className="mt-4">
          <RfxSaveTemplate
            key={event.id}
            testIdPrefix={`rfi-${event.id}`}
            defaultName={event.title}
            onSave={(name) =>
              rfiTemplateStore.save(
                name,
                {
                  familyId: rfxFamilyForCategory(event.materialCategory)?.id ?? '',
                  ...(event.description ? { description: event.description } : {}),
                  questions: event.questions,
                  customSections: event.customSections ?? [],
                  confidential: !!event.confidentiality,
                  ...(event.confidentiality?.terms
                    ? { confidentialityTerms: event.confidentiality.terms }
                    : {})
                },
                rfxNow()
              )
            }
          />
        </div>
      </div>

      {/* — Invitees, their OTIF and where their answer stands — */}
      <div className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm overflow-x-auto">
        <div className="px-4 py-3 border-b border-border-subtle text-sm font-semibold text-text-primary">
          {t('rfx.invite.title')}
        </div>
        <Table>
          <TableHeader>
            <TableHeaderCell>{t('rfx.invite.col.supplier')}</TableHeaderCell>
            <TableHeaderCell>{t('rfx.invite.col.otif')}</TableHeaderCell>
            <TableHeaderCell>{t('rfx.deadline.own')}</TableHeaderCell>
            <TableHeaderCell>{t('rfx.response.submitted')}</TableHeaderCell>
            {event.confidentiality && <TableHeaderCell>{t('rfxa.conf.col')}</TableHeaderCell>}
            <TableHeaderCell>{t('rfx.rfi.extendSelected')}</TableHeaderCell>
          </TableHeader>
          <tbody>
            {event.invitedSuppliers.map((invitee) => (
              <TableRow
                key={invitee.supplierId}
                data-testid={`rfi-invitee-${event.id}-${invitee.supplierId}`}
              >
                <TableCell>
                  {invitee.supplierName}
                  {/* BL-147 — Material G2's marker: below the level for this event's type, today. */}
                  <div className="mt-1">
                    <EligibilityMarker
                      eligibility={invitee.eligibility}
                      testId={`rfi-invitee-elig-${event.id}-${invitee.supplierId}`}
                    />
                  </div>
                </TableCell>
                <TableCell>
                  <OtifOrNoHistory otif={invitee.otif} testId={`rfi-otif-${invitee.supplierId}`} />
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  <DeadlinePill
                    deadline={invitee.deadline}
                    done={invitee.responseState === 'submitted'}
                  />
                </TableCell>
                <TableCell>
                  <ResponseStatePill state={invitee.responseState} intent={invitee.intent} />
                </TableCell>
                {event.confidentiality && (
                  <TableCell data-testid={`rfi-accepted-${event.id}-${invitee.supplierId}`}>
                    {invitee.confidentialityAcceptedAt ? (
                      <Data>{formatDate(invitee.confidentialityAcceptedAt)}</Data>
                    ) : (
                      <span className="text-xs text-text-tertiary">{t('rfxa.conf.notYet')}</span>
                    )}
                  </TableCell>
                )}
                <TableCell>
                  <input
                    type="checkbox"
                    className="accent-teal"
                    aria-label={invitee.supplierName}
                    checked={only.includes(invitee.supplierId)}
                    onChange={() =>
                      setExtendOnly((prev) => ({
                        ...prev,
                        [event.id]: only.includes(invitee.supplierId)
                          ? only.filter((s) => s !== invitee.supplierId)
                          : [...only, invitee.supplierId]
                      }))
                    }
                  />
                </TableCell>
              </TableRow>
            ))}
          </tbody>
        </Table>
        {/* REQ-E03-02 edge case — extend for everyone, or for the ticked ones. */}
        <div className="flex flex-wrap items-end gap-3 px-4 py-3 border-t border-border-subtle">
          <div>
            <label
              className="block text-xs font-semibold text-text-secondary mb-1"
              htmlFor={`extend-${event.id}`}
            >
              {t('rfx.rfi.extend')}
            </label>
            <input
              id={`extend-${event.id}`}
              type="date"
              value={deadline}
              onChange={(e) => setExtendFor((prev) => ({ ...prev, [event.id]: e.target.value }))}
              className="bg-white border border-border-input rounded-md px-3 h-10 text-sm focus:outline-none focus:border-action"
            />
          </div>
          <Button
            variant="outline"
            disabled={!canPublish || !deadline}
            data-testid={`rfi-extend-${event.id}`}
            onClick={() =>
              run(
                {
                  verb: 'extendRfi',
                  rfiId: event.id,
                  deadline,
                  ...(only.length > 0 ? { supplierIds: only } : {})
                },
                'rfx.toast.extended'
              )
            }
          >
            {only.length > 0 ? t('rfx.rfi.extendSelected') : t('rfx.rfi.extendAll')}
          </Button>
          <Button variant="secondary" onClick={onCreateRfq} data-testid={`rfi-to-rfq-${event.id}`}>
            {t('rfx.rfi.createRfq')}
          </Button>
        </div>
      </div>

      {/* — The answers, side by side. Submitted only. — */}
      <div className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm overflow-x-auto">
        <div className="px-4 py-3 border-b border-border-subtle">
          <span className="text-sm font-semibold text-text-primary">
            {t('rfx.rfi.responses', { count: event.responses.length })}
          </span>
          <p className="text-xs text-text-tertiary mt-1">{t('rfx.rfi.scoreBasis')}</p>
        </div>
        {event.responses.length === 0 ? (
          <p
            className="px-4 py-8 text-center text-sm text-text-tertiary"
            data-testid="rfi-no-responses"
          >
            {t('rfx.rfi.empty')}
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableHeaderCell>{t('rfx.rfi.section')}</TableHeaderCell>
              {event.responses.map((r) => (
                <TableHeaderCell key={r.id}>
                  {r.supplierName}
                  <div className="text-xs font-normal normal-case text-text-tertiary">
                    {t('rfx.rfi.score')}:{' '}
                    {r.score === null ? t('rfx.rfi.noScore') : <Data>{r.score}</Data>}
                  </div>
                </TableHeaderCell>
              ))}
            </TableHeader>
            <tbody>
              {rfxSectionsOf(event.customSections).flatMap((section) =>
                event.questions
                  .filter((q) => q.sectionId === section.id)
                  .map((q) => (
                    <TableRow key={q.id} data-testid={`rfi-answer-row-${q.id}`}>
                      <TableCell className="align-top">
                        <div className="text-xs text-text-tertiary">{sectionTitle(t, section)}</div>
                        <div className="text-sm text-text-primary">{authored(t, q.promptKey)}</div>
                        {q.required && (
                          <StatusPill variant="neutral" className="mt-1">
                            {t('rfx.rfi.required')}
                          </StatusPill>
                        )}
                        {q.type === 'priceRange' && <IndicativePill className="mt-1 ml-1" />}
                      </TableCell>
                      {event.responses.map((r) => {
                        const answer = r.answers.find((a) => a.questionId === q.id);
                        return (
                          <TableCell
                            key={r.id}
                            className="align-top"
                            data-testid={`rfi-answer-${q.id}-${r.supplierId}`}
                          >
                            <div className="text-sm text-text-primary">
                              <AnswerValue
                                q={q}
                                a={answer}
                                testId={`rfi-answer-files-${q.id}-${r.supplierId}`}
                              />
                            </div>
                            {answer?.description && (
                              <div className="text-xs text-text-tertiary mt-1">
                                {answer.description}
                              </div>
                            )}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))
              )}
            </tbody>
          </Table>
        )}
      </div>

      {/* — RFx B5: every supplier file, submitted responses only (NR-1 buyer step 5) — */}
      <SupplierDocumentsPanel
        requests={event.documentRequests}
        responses={event.responses}
        deadlineFor={(supplierId) =>
          event.invitedSuppliers.find((i) => i.supplierId === supplierId)?.deadline ??
          event.responseDeadline
        }
        testId={`rfi-documents-${event.id}`}
      />
    </section>
  );
};

export default BuyerRfi;
