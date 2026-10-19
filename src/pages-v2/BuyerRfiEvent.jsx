/** @import React from 'react' */
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
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
import NotFound from './NotFound';
import { useVerbAvailability } from '@hooks/useVerbAvailability';
/** @import { VerbAvailability } from '@services/transitions/handoff' */
import { useToast } from '@hooks/useToast';
import { formatDate } from '@lib/format';
import { useRfiEvents } from '@services/query/hooks';
import { useRfxCommand } from '@services/query/commandHooks';
/** @import { RfxCommandVars } from '@services/query/commandHooks' */
import { rfxFamilyForCategory, rfxSectionsOf } from '@services/sourcing/rfxConfig';
import { rfiTemplateStore } from '@services/sourcing/rfxTemplates';
import { daysToDeadline, isPastDeadline } from '@services/transitions/rfxRules';
/** @import { RfiEventView } from '@services/sourcing/views' */
import SessionAttachments from '@components/ui-v2/SessionAttachments';
import EventSectionNav from './BuyerSourcingEvent/components/EventSectionNav';
import RfiCreateWizard from './rfx/RfiCreateWizard';
import RfxSaveTemplate from './rfx/RfxSaveTemplate';
import RfxMoreMenu from './rfx/RfxMoreMenu';
import RfxStageBar from './rfx/RfxStageBar';
import { RFI_STAGE_STEPS, rfiStageOf } from './rfx/rfxEventStage';
import { DeadlinePill, OtifOrNoHistory, ResponseStatePill, rfxNow } from './rfx/rfxDisplay';
import { AnswerValue, IndicativePill, authored, sectionTitle } from './rfx/rfxAuthoringDisplay';
import { DraftRevisionNote } from './rfx/draftEdit';
import { SupplierDocumentsPanel } from './rfx/SupplierDocumentsPanel';
import { ConfirmSheet, closeEffects } from './rfx/ConfirmSheet';

// ─────────────────────────────────────────────────────────────────────────────
// ONE INFORMATION REQUEST — REQ-E03-02 (BUY), on its own page.
//
// RFx UX 2A (B-09, owner ruling Q2 2026-10-19): the RFI detail used to render
// under the list, below the fold, so the first click seemed to do nothing. It
// is now this page at `/buyer/rfi/:rfiId`, shaped like the RFQ event page: a
// header with the status and the deadline with days left, a stage bar, and a
// sticky "Jump to" nav with counts beside the sections. The list's rows open
// it; `/buyer/rfi?open=<id>` redirects here.
//
// RFx UX 2A (B-10): the acts sit in ONE actions row — Edit, Send and Discard
// on a Draft, Close on an Open event, Extend, Create RFQ, Create RFP — and
// "Save as a template" is an item in its "More actions" menu instead of a
// prefilled input on every detail. The invitee table on a live event reads
// "Invited suppliers": nobody can be added here (the wizard still invites).
//
// Everything the inline detail held is kept, and the rules it carried hold
// as they were:
//
//   · A DRAFT ANSWER IS NOT HERE. The read hides it (REQ-E03-02 edge case), so
//     the comparison below cannot accidentally show a supplier's unsent work.
//   · THE RESPONSE SCORE SHORTLISTS AND NOTHING ELSE. It is printed beside the
//     supplier with the sentence that says so; no button on this page acts on it.
//   · THE DEADLINE CAN BE EXTENDED FOR ALL OR FOR SELECTED INVITEES, and the
//     per-invitee deadline is what the submit verb actually enforces.
//   · THE LIFECYCLE IS OFFERED BY STATE (section 3.6a): a Draft offers Send,
//     Discard and Edit (BL-93, `rfi:create`); an Open event offers Close; the
//     close is dispatched only from its confirmation sheet (B-05). A seat
//     without the atom reads whose act it is in the button's own slot.
//   · "Create a quotation request from this" opens the RFQ wizard with the
//     event named (REQ-E03-03 AC-02); "Create a proposal request from this"
//     (spec D3) opens the RFP wizard (`/buyer/rfp?rfi=…`), on an Open or Closed
//     RFI only — a Draft has no responders to carry, a Cancelled one no standing.
// ─────────────────────────────────────────────────────────────────────────────

/** @type {React.FC} */
const BuyerRfiEvent = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { rfiId = '' } = useParams();
  const [params] = useSearchParams();
  const events = useRfiEvents();
  const publish = useVerbAvailability('rfi:publish');
  const create = useVerbAvailability('rfi:create');
  const createRfp = useVerbAvailability('rfp:create');
  const command = useRfxCommand();
  // BL-93 — the edit wizard; the event is re-read from the live store.
  const [editing, setEditing] = useState(false);

  const crumb = [t('hub.nav.section.sourcing')];
  const event = (events.data?.items ?? []).find((e) => e.id === rfiId) ?? null;

  // `?section=<id>` lands on one section, as the RFQ page's `?section=award` does.
  const section = params.get('section');
  useEffect(() => {
    if (event && section) document.getElementById(section)?.scrollIntoView?.({ block: 'start' });
  }, [event, section]);

  if (events.isPending) return <LoadingState breadcrumb={crumb} />;
  if (events.isError)
    return <ErrorState breadcrumb={crumb} error={events.error} onRetry={() => events.refetch()} />;
  if (!event) return <NotFound />;

  /**
   * @param {RfxCommandVars} vars
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

  const now = rfxNow();
  const daysLeft = daysToDeadline(event.responseDeadline, now);
  const invited = event.invitedSuppliers.length;
  const responded = event.responses.length;
  const stage = rfiStageOf({
    status: event.status,
    invited,
    responded,
    deadlinePassed: isPastDeadline(event.responseDeadline, now)
  });
  /** @type {Record<(typeof RFI_STAGE_STEPS)[number], string>} */
  const stageDetail = {
    sent: t('rfx.stage.d.suppliers', { count: invited }),
    answersIn: t('rfx.stage.d.quoted', { quoted: responded, invited }),
    closed: event.status === 'Closed' ? t(`rfx.status.${event.status}`) : ''
  };
  const docCount = event.responses.reduce((n, r) => n + (r.documents ?? []).length, 0);
  const navEntries = [
    { id: 'rfi-event-about', labelKey: 'rfx.nav.about', count: '' },
    { id: 'rfi-event-invitees', labelKey: 'rfx.nav.invited', count: String(invited) },
    { id: 'rfi-event-answers', labelKey: 'rfx.nav.answers', count: String(responded) },
    { id: 'rfi-event-documents', labelKey: 'rfx.nav.documents', count: String(docCount) }
  ];

  return (
    <AppShellV2>
      <PageHeader breadcrumb={crumb} title={event.title} subtitle={event.eventNumber} />
      <PageMetaLine className="-mt-6 mb-4">
        {t('rfx.asOf')} <Data>{formatDate(now)}</Data>
        <span className="ml-3">
          {t('rfx.deadline')} <Data>{formatDate(event.responseDeadline)}</Data>
          {event.status === 'Open' && (
            <span className="ml-1" data-testid="rfi-event-days-left">
              ·{' '}
              {daysLeft >= 0 ? t('rfx.stage.daysLeft', { count: daysLeft }) : t('rfx.stage.passed')}
            </span>
          )}
        </span>
        <SampleDataBadge className="ml-3 align-middle" />
      </PageMetaLine>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Link
          to="/buyer/rfi"
          className="text-sm text-action-hover hover:underline"
          data-testid="rfi-event-back"
        >
          {t('rfx.event.backRfi')}
        </Link>
        <span data-testid="rfi-event-status">
          <StatusPill variant={event.closed ? 'neutral' : 'info'}>
            {t(`rfx.status.${event.status}`)}
          </StatusPill>
        </span>
      </div>

      <RfxStageBar
        steps={RFI_STAGE_STEPS.map((key) => ({
          key,
          labelKey: `rfx.stage.${key}`,
          detail: stageDetail[key]
        }))}
        current={stage.current}
        next={stage.next}
        testId="rfi-event-stage"
      />

      <div className="lg:grid lg:grid-cols-[200px_minmax(0,1fr)] lg:gap-6">
        <EventSectionNav entries={navEntries} />
        <div className="min-w-0">
          <RfiDetail
            event={event}
            run={run}
            onCreateRfq={() => navigate(`/buyer/rfq?rfi=${event.id}`)}
            onCreateRfp={() => navigate(`/buyer/rfp?rfi=${event.id}`)}
            createRfpAvailability={createRfp}
            canPublish={publish.kind === 'held'}
            publishAvailability={publish}
            createAvailability={create}
            onEdit={() => setEditing(true)}
          />
        </div>
      </div>

      {!!editing && event.status === 'Draft' && create.kind === 'held' && (
        <RfiCreateWizard
          key={event.id}
          editing={event}
          canPublish={publish.kind === 'held'}
          onCancel={() => setEditing(false)}
          onCreated={() => setEditing(false)}
        />
      )}
    </AppShellV2>
  );
};

/**
 * @typedef {object} DetailProps
 * @property {RfiEventView} event
 * @property {(vars: RfxCommandVars, successKey: string) => void} run
 * @property {() => void} onCreateRfq
 * @property {() => void} onCreateRfp
 * @property {VerbAvailability} createRfpAvailability -  Whose act raising an RFP is, when this seat does not hold `rfp:create`.
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
  canPublish,
  publishAvailability,
  createAvailability,
  onEdit
}) => {
  const { t } = useTranslation();
  const [only, setOnly] = useState(/** @type {string[]} */ ([]));
  const [deadline, setDeadline] = useState('');
  // RFx UX 1C (B-05) — "Close the event" opens a confirmation sheet; the
  // close is dispatched only from the sheet.
  const [confirmClose, setConfirmClose] = useState(false);
  // RFx UX 2A (B-10) — "Save as a template" is opened from the menu.
  const [saveTemplate, setSaveTemplate] = useState(false);

  return (
    <section className="space-y-6" data-testid={`rfi-detail-${event.id}`}>
      {/* — The event itself, and the acts its STATE allows. — */}
      <div
        id="rfi-event-about"
        className="scroll-mt-4 bg-bg-surface border border-border-subtle rounded-lg shadow-sm p-4"
      >
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

        {/* RFx UX 2A (B-10) — ONE actions row. */}
        <div
          className="flex flex-wrap items-end gap-3 mt-4 pt-4 border-t border-border-subtle"
          data-testid={`rfi-actions-${event.id}`}
        >
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
              onClick={() => setConfirmClose(true)}
            >
              {t('rfx.rfi.closeEvent')}
            </Button>
          )}
          {/* REQ-E03-02 edge case — extend for everyone, or for the suppliers
              ticked in "Invited suppliers" below. */}
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
              onChange={(e) => setDeadline(e.target.value)}
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
          {/* D3 — RFI → RFP. Offered on an Open or Closed event: a Draft has no
              responders to carry forward, and a Cancelled one no standing. */}
          {(event.status === 'Open' || event.status === 'Closed') &&
            (createRfpAvailability.kind === 'held' ? (
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
            ))}
          <RfxMoreMenu
            testId={`rfi-more-${event.id}`}
            items={[
              {
                key: 'template',
                label: t('rfx.actions.saveTemplate'),
                onSelect: () => setSaveTemplate(true)
              }
            ]}
          />
        </div>
        {!!confirmClose && event.status === 'Open' && (
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
                setConfirmClose(false);
                run({ verb: 'closeRfi', rfiId: event.id }, 'rfx.toast.closed');
              }}
              onBack={() => setConfirmClose(false)}
              testId={`rfi-close-sheet-${event.id}`}
              confirmTestId={`rfi-close-confirm-${event.id}`}
            />
          </div>
        )}
        {!!saveTemplate && (
          <div className="mt-3">
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
        )}
        {!!event.description && (
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
        {!!event.confidentiality && (
          <p
            className="text-xs text-text-tertiary mt-3"
            data-testid={`rfi-confidential-${event.id}`}
          >
            {t('rfxa.conf.buyerNote')}
          </p>
        )}
      </div>

      {/* — Invitees, their OTIF and where their answer stands — */}
      <div
        id="rfi-event-invitees"
        className="scroll-mt-4 bg-bg-surface border border-border-subtle rounded-lg shadow-sm overflow-x-auto"
      >
        <div
          className="px-4 py-3 border-b border-border-subtle text-sm font-semibold text-text-primary"
          data-testid={`rfi-invitees-title-${event.id}`}
        >
          {t('rfx.invited.title')}
        </div>
        <Table>
          <TableHeader>
            <TableHeaderCell>{t('rfx.invite.col.supplier')}</TableHeaderCell>
            <TableHeaderCell>{t('rfx.invite.col.otif')}</TableHeaderCell>
            <TableHeaderCell>{t('rfx.deadline.own')}</TableHeaderCell>
            <TableHeaderCell>{t('rfx.response.submitted')}</TableHeaderCell>
            {!!event.confidentiality && <TableHeaderCell>{t('rfxa.conf.col')}</TableHeaderCell>}
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
                  <ResponseStatePill state={invitee.responseState} />
                </TableCell>
                {!!event.confidentiality && (
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
                      setOnly((prev) =>
                        prev.includes(invitee.supplierId)
                          ? prev.filter((s) => s !== invitee.supplierId)
                          : [...prev, invitee.supplierId]
                      )
                    }
                  />
                </TableCell>
              </TableRow>
            ))}
          </tbody>
        </Table>
      </div>

      {/* — The answers, side by side. Submitted only. — */}
      <div
        id="rfi-event-answers"
        className="scroll-mt-4 bg-bg-surface border border-border-subtle rounded-lg shadow-sm overflow-x-auto"
      >
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
                        {!!q.required && (
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
                            {!!answer?.description && (
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
      <div id="rfi-event-documents" className="scroll-mt-4">
        <SupplierDocumentsPanel
          requests={event.documentRequests}
          responses={event.responses}
          deadlineFor={(supplierId) =>
            event.invitedSuppliers.find((i) => i.supplierId === supplierId)?.deadline ??
            event.responseDeadline
          }
          testId={`rfi-documents-${event.id}`}
        />
      </div>
    </section>
  );
};

export default BuyerRfiEvent;
