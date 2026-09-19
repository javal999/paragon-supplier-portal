import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { HandoffNotice } from '../components/ui-v2/HandoffNotice';
import { useVerbAvailability } from '../hooks/useVerbAvailability';
import type { VerbAvailability } from '../services/transitions/handoff';
import { useToast } from '../hooks/useToast';
import { formatDate } from '../lib/format';
import { useRfiEvents, useRfpEvents, useRFQs } from '../services/query/hooks';
import { useRfxCommand } from '../services/query/commandHooks';
import { RFI_SECTION_ORDER } from '../services/sourcing/rfxConfig';
import type { RfiEventView } from '../services/sourcing/views';
import RfxTabs from './rfx/RfxTabs';
import RfiCreateWizard from './rfx/RfiCreateWizard';
import { DeadlinePill, EmptyRow, OtifOrNoHistory, ResponseStatePill, rfxNow } from './rfx/rfxDisplay';

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
// field stays editable there.
//
// ⚠️ **THE EVENT IS RAISED HERE TOO (section 3.6a), AND THE LIFECYCLE IS OFFERED
// BY STATE RATHER THAN BY GUESS.** "New RFI" opens the wizard; a Draft offers
// Send and nothing else; an Open event offers Close and Extend; a Closed one
// offers Extend alone, because `t_rfi_extend` legally leaves a Closed event
// (reopening a window somebody asked for) while `t_rfi_close` does not run twice.
// A button the machine would refuse is worse than an absent one: it teaches the
// buyer that the screen does not know the rules.
// ─────────────────────────────────────────────────────────────────────────────

const BuyerRfi: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const events = useRfiEvents();
  const rfps = useRfpEvents();
  const rfqs = useRFQs();
  const publish = useVerbAvailability('rfi:publish');
  const create = useVerbAvailability('rfi:create');
  const command = useRfxCommand();
  const [wizardOpen, setWizardOpen] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [extendFor, setExtendFor] = useState<Record<string, string>>({});
  const [extendOnly, setExtendOnly] = useState<Record<string, string[]>>({});

  const crumb = [t('hub.nav.section.sourcing'), t('rfx.rfi.title')];
  const items = useMemo(() => events.data?.items ?? [], [events.data]);

  if (events.isPending) return <LoadingState breadcrumb={crumb} />;
  if (events.isError)
    return <ErrorState breadcrumb={crumb} error={events.error} onRetry={() => events.refetch()} />;

  const open = items.find((e) => e.id === openId) ?? null;

  const run = (vars: Parameters<typeof command.mutate>[0], successKey: string) =>
    command.mutate(vars, {
      onSuccess: (res) => {
        if (res.status === 'failed') {
          toast({ variant: 'error', title: t('rfx.toast.refused', { reason: res.reason ?? '' }) });
          return;
        }
        toast({ variant: 'success', title: t(successKey) });
      },
      onError: () => toast({ variant: 'error', title: t('rfx.toast.refused', { reason: '' }) }),
    });

  return (
    <AppShellV2>
      <PageHeader breadcrumb={crumb} title={t('rfx.rfi.title')} subtitle={t('rfx.rfi.subtitle')} />
      <PageMetaLine className="-mt-6 mb-4">
        {t('rfx.asOf')} <Data>{formatDate(rfxNow())}</Data>
        <SampleDataBadge className="ml-3 align-middle" />
      </PageMetaLine>

      <RfxTabs
        persona="buyer"
        active="rfi"
        counts={{ rfi: items.length, rfq: rfqs.data?.items.length ?? 0, rfp: rfps.data?.items.length ?? 0 }}
      />

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

      {open && <RfiDetail event={open} run={run} onCreateRfq={() => navigate(`/buyer/sourcing?rfi=${open.id}`)} extendFor={extendFor} setExtendFor={setExtendFor} extendOnly={extendOnly} setExtendOnly={setExtendOnly} canPublish={publish.kind === 'held'} publishAvailability={publish} />}

      {wizardOpen && (
        <RfiCreateWizard
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

interface DetailProps {
  event: RfiEventView;
  run: (vars: Parameters<ReturnType<typeof useRfxCommand>['mutate']>[0], successKey: string) => void;
  onCreateRfq: () => void;
  extendFor: Record<string, string>;
  setExtendFor: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  extendOnly: Record<string, string[]>;
  setExtendOnly: React.Dispatch<React.SetStateAction<Record<string, string[]>>>;
  canPublish: boolean;
  /** Whose act publishing is, when this seat does not hold it. */
  publishAvailability: VerbAvailability;
}

const RfiDetail: React.FC<DetailProps> = ({
  event,
  run,
  onCreateRfq,
  extendFor,
  setExtendFor,
  extendOnly,
  setExtendOnly,
  canPublish,
  publishAvailability,
}) => {
  const { t } = useTranslation();
  const only = extendOnly[event.id] ?? [];
  const deadline = extendFor[event.id] ?? '';

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
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {publishAvailability.kind !== 'held' && (
              <HandoffNotice availability={publishAvailability} testId={`handoff-rfi-lifecycle-${event.id}`} />
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
            {event.status === 'Open' && (
              <Button
                variant="secondary"
                disabled={!canPublish}
                data-testid={`rfi-close-${event.id}`}
                onClick={() => run({ verb: 'closeRfi', rfiId: event.id }, 'rfx.toast.closed')}
              >
                {t('rfx.rfi.closeEvent')}
              </Button>
            )}
          </div>
        </div>
        {event.description && (
          <div className="mt-3">
            <h4 className="text-xs uppercase tracking-wide text-text-tertiary">{t('rfx.rfi.about')}</h4>
            <p className="text-sm text-text-secondary">{event.description}</p>
          </div>
        )}
        {event.status === 'Draft' && (
          <p className="text-xs text-text-tertiary mt-3" data-testid={`rfi-draft-notice-${event.id}`}>
            {t('rfx.status.draftHiddenFromSuppliers')}
          </p>
        )}
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
            <TableHeaderCell>{t('rfx.rfi.extendSelected')}</TableHeaderCell>
          </TableHeader>
          <tbody>
            {event.invitedSuppliers.map((invitee) => (
              <TableRow key={invitee.supplierId} data-testid={`rfi-invitee-${event.id}-${invitee.supplierId}`}>
                <TableCell>{invitee.supplierName}</TableCell>
                <TableCell>
                  <OtifOrNoHistory otif={invitee.otif} testId={`rfi-otif-${invitee.supplierId}`} />
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  <DeadlinePill deadline={invitee.deadline} done={invitee.responseState === 'submitted'} />
                </TableCell>
                <TableCell>
                  <ResponseStatePill state={invitee.responseState} />
                </TableCell>
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
                          : [...only, invitee.supplierId],
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
            <label className="block text-xs font-semibold text-text-secondary mb-1" htmlFor={`extend-${event.id}`}>
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
                  ...(only.length > 0 ? { supplierIds: only } : {}),
                },
                'rfx.toast.extended',
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
          <p className="px-4 py-8 text-center text-sm text-text-tertiary" data-testid="rfi-no-responses">
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
              {RFI_SECTION_ORDER.flatMap((section) =>
                event.questions
                  .filter((q) => q.sectionId === section)
                  .map((q) => (
                    <TableRow key={q.id} data-testid={`rfi-answer-row-${q.id}`}>
                      <TableCell className="align-top">
                        <div className="text-xs text-text-tertiary">{t(`rfx.section.${section}`)}</div>
                        <div className="text-sm text-text-primary">{t(q.promptKey)}</div>
                        {q.required && (
                          <StatusPill variant="neutral" className="mt-1">
                            {t('rfx.rfi.required')}
                          </StatusPill>
                        )}
                      </TableCell>
                      {event.responses.map((r) => {
                        const answer = r.answers.find((a) => a.questionId === q.id);
                        const value = answer?.value;
                        const text = Array.isArray(value)
                          ? value.map((v) => t(`rfx.opt.${v}`, { defaultValue: String(v) })).join(', ')
                          : value === undefined
                            ? '—'
                            : q.type === 'yesNo' || q.type === 'singleChoice'
                              ? t(`rfx.opt.${value}`, { defaultValue: String(value) })
                              : String(value);
                        return (
                          <TableCell key={r.id} className="align-top">
                            <div className="text-sm text-text-primary">
                              {text}
                              {q.unitKey && value !== undefined ? ` ${t(q.unitKey)}` : ''}
                            </div>
                            {answer?.description && (
                              <div className="text-xs text-text-tertiary mt-1">{answer.description}</div>
                            )}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  )),
              )}
            </tbody>
          </Table>
        )}
      </div>
    </section>
  );
};

export default BuyerRfi;
