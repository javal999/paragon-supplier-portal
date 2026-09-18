import React, { useMemo, useState } from 'react';
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
import { useToast } from '../hooks/useToast';
import { formatDate } from '../lib/format';
import { useCurrentIdentity } from '../context/CurrentIdentityContext';
import { useRfiEvents, useRfpEvents, useRFQs } from '../services/query/hooks';
import { useRfxCommand } from '../services/query/commandHooks';
import { RFP_TERM_GROUP_ORDER, rfpTerm } from '../services/sourcing/rfxConfig';
import { deviationsWithoutComment, unansweredTerms } from '../services/transitions/rfxRules';
import type { RfpTermAnswer } from '../services/sourcing/types';
import type { RfpEventView } from '../services/sourcing/views';
import RfxTabs from './rfx/RfxTabs';
import { DeadlinePill, rfxNow } from './rfx/rfxDisplay';

// ─────────────────────────────────────────────────────────────────────────────
// SUPPLIER PROPOSAL REQUESTS — REQ-E03-04 (SUP).
//
// One row per term the buyer asked for: PTI's requested value, the supplier's
// proposed value, Comply or Deviate, and — ON DEVIATE — a comment that is
// REQUIRED. The page marks it required and the submit verb refuses without it,
// because a deviation nobody explained changes the deal and says nothing about
// how.
//
// "Other terms" is the free-text box for terms the supplier wants to add that
// PTI did not ask for (the requirement's edge case).
// ─────────────────────────────────────────────────────────────────────────────

const SupplierRfp: React.FC = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { identity } = useCurrentIdentity();
  const events = useRfpEvents();
  const rfis = useRfiEvents();
  const rfqs = useRFQs();
  const answerVerb = useVerbAvailability('rfpresponse:answer');
  const command = useRfxCommand();
  const [openId, setOpenId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Record<string, RfpTermAnswer[]>>({});
  const [other, setOther] = useState<Record<string, string>>({});

  const crumb = [t('hub.nav.section.sourcing'), t('rfx.rfp.supplier.title')];
  const items = useMemo(() => events.data?.items ?? [], [events.data]);

  if (events.isPending) return <LoadingState breadcrumb={crumb} />;
  if (events.isError)
    return <ErrorState breadcrumb={crumb} error={events.error} onRetry={() => events.refetch()} />;

  const supplierId = identity.supplierId ?? '';

  const answersFor = (event: RfpEventView): RfpTermAnswer[] =>
    draft[event.id] ?? [...(event.responses[0]?.answers ?? [])];

  const setAnswer = (event: RfpEventView, termId: string, patch: Partial<RfpTermAnswer>) => {
    const current = answersFor(event);
    const next = current.some((a) => a.termId === termId)
      ? current.map((a) => (a.termId === termId ? { ...a, ...patch } : a))
      : [...current, { termId, proposedValue: '', stance: 'comply' as const, ...patch }];
    setDraft((prev) => ({ ...prev, [event.id]: next }));
  };

  const send = (event: RfpEventView, draftOnly: boolean) =>
    command.mutate(
      {
        verb: 'answerRfp',
        rfpId: event.id,
        supplierId,
        answers: answersFor(event),
        otherTerms: other[event.id] ?? event.responses[0]?.otherTerms ?? '',
        ...(draftOnly ? { draftOnly: true } : {}),
      },
      {
        onSuccess: (res) =>
          toast(
            res.status === 'failed'
              ? { variant: 'error', title: t('rfx.toast.refused', { reason: res.reason ?? '' }) }
              : { variant: 'success', title: t(draftOnly ? 'rfx.toast.saved' : 'rfx.toast.sent') },
          ),
        onError: () => toast({ variant: 'error', title: t('rfx.toast.refused', { reason: '' }) }),
      },
    );

  return (
    <AppShellV2>
      <PageHeader
        breadcrumb={crumb}
        title={t('rfx.rfp.supplier.title')}
        subtitle={t('rfx.rfp.supplier.subtitle')}
      />
      <PageMetaLine className="-mt-6 mb-4">
        {t('rfx.asOf')} <Data>{formatDate(rfxNow())}</Data>
        <SampleDataBadge className="ml-3 align-middle" />
      </PageMetaLine>

      <RfxTabs
        persona="supplier"
        active="rfp"
        counts={{ rfi: rfis.data?.items.length ?? 0, rfq: rfqs.data?.items.length ?? 0, rfp: items.length }}
      />

      {answerVerb.kind !== 'held' && (
        <div className="mb-4">
          <HandoffNotice availability={answerVerb} testId="handoff-rfp-answer" />
        </div>
      )}

      {items.length === 0 && (
        <p className="py-10 text-center text-sm text-text-tertiary" data-testid="supplier-rfp-empty">
          {t('rfx.rfp.supplier.empty')}
        </p>
      )}

      <div className="space-y-4">
        {items.map((event) => {
          const mine = event.responses[0] ?? null;
          const answers = answersFor(event);
          const missing = unansweredTerms(event.terms, answers);
          const uncommented = deviationsWithoutComment(answers);
          const opened = openId === event.id;
          const locked = mine?.status === 'Submitted' || answerVerb.kind !== 'held';
          return (
            <section
              key={event.id}
              className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm"
              data-testid={`supplier-rfp-${event.id}`}
            >
              <header className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-border-subtle">
                <div>
                  <Data className="font-semibold">{event.eventNumber}</Data>
                  <div className="text-sm text-text-primary">{event.title}</div>
                </div>
                <div className="flex items-center gap-3">
                  <DeadlinePill
                    deadline={
                      event.invitedSuppliers.find((i) => i.supplierId === supplierId)?.deadline ??
                      event.responseDeadline
                    }
                    done={mine?.status === 'Submitted'}
                  />
                  <StatusPill variant={mine?.status === 'Submitted' ? 'success' : mine ? 'info' : 'neutral'}>
                    {t(`rfx.response.${mine?.status === 'Submitted' ? 'submitted' : mine ? 'draft' : 'notStarted'}`)}
                  </StatusPill>
                  <Button
                    variant="secondary"
                    onClick={() => setOpenId(opened ? null : event.id)}
                    data-testid={`supplier-rfp-open-${event.id}`}
                  >
                    {opened ? t('rfx.close') : t('rfx.rfp.answer')}
                  </Button>
                </div>
              </header>

              {opened && (
                <div className="px-4 py-4 space-y-4">
                  <p className="text-sm text-text-secondary">{event.scope}</p>
                  {mine?.status === 'Draft' && (
                    <p
                      className="text-sm text-action-hover bg-action-soft rounded px-3 py-2"
                      data-testid={`supplier-rfp-draft-${event.id}`}
                    >
                      {t('rfx.draftHidden')}
                    </p>
                  )}

                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableHeaderCell>{t('rfx.rfp.col.term')}</TableHeaderCell>
                        <TableHeaderCell>{t('rfx.rfp.col.requested')}</TableHeaderCell>
                        <TableHeaderCell>{t('rfx.rfp.col.proposed')}</TableHeaderCell>
                        <TableHeaderCell>{t('rfx.stance.comply')}</TableHeaderCell>
                        <TableHeaderCell>{t('rfx.rfp.comment')}</TableHeaderCell>
                      </TableHeader>
                      <tbody>
                        {RFP_TERM_GROUP_ORDER.flatMap((group) =>
                          event.terms
                            .filter((row) => rfpTerm(row.termId)?.group === group)
                            .map((row) => {
                              const a = answers.find((x) => x.termId === row.termId);
                              const deviates = a?.stance === 'deviate';
                              const needsComment = deviates && uncommented.includes(row.termId);
                              return (
                                <TableRow key={row.termId} data-testid={`supplier-rfp-term-${row.termId}`}>
                                  <TableCell className="align-top">
                                    <div className="text-xs uppercase tracking-wide text-text-tertiary">
                                      {t(`rfx.group.${group}`)}
                                    </div>
                                    <div className="text-sm text-text-primary">
                                      {t(rfpTerm(row.termId)!.labelKey)}
                                    </div>
                                  </TableCell>
                                  <TableCell className="align-top text-sm text-text-secondary">
                                    <Data>{row.requestedValue}</Data>
                                  </TableCell>
                                  <TableCell className="align-top">
                                    <input
                                      type="text"
                                      disabled={locked}
                                      aria-label={t(rfpTerm(row.termId)!.labelKey)}
                                      value={a?.proposedValue ?? ''}
                                      onChange={(e) => setAnswer(event, row.termId, { proposedValue: e.target.value })}
                                      className="w-full bg-white border border-border-input rounded-md px-3 h-9 text-sm focus:outline-none focus:border-action disabled:bg-bg-hover"
                                    />
                                  </TableCell>
                                  <TableCell className="align-top">
                                    <select
                                      disabled={locked}
                                      aria-label={`${t(rfpTerm(row.termId)!.labelKey)} — ${t('rfx.stance.comply')}`}
                                      value={a?.stance ?? 'comply'}
                                      onChange={(e) =>
                                        setAnswer(event, row.termId, {
                                          stance: e.target.value as RfpTermAnswer['stance'],
                                        })
                                      }
                                      className="bg-white border border-border-input rounded-md px-2 h-9 text-sm focus:outline-none focus:border-action disabled:bg-bg-hover"
                                    >
                                      <option value="comply">{t('rfx.stance.comply')}</option>
                                      <option value="deviate">{t('rfx.stance.deviate')}</option>
                                    </select>
                                  </TableCell>
                                  <TableCell className="align-top">
                                    <input
                                      type="text"
                                      disabled={locked || !deviates}
                                      aria-label={`${t(rfpTerm(row.termId)!.labelKey)} — ${t('rfx.rfp.comment')}`}
                                      value={a?.comment ?? ''}
                                      onChange={(e) => setAnswer(event, row.termId, { comment: e.target.value })}
                                      className={`w-full bg-white border rounded-md px-3 h-9 text-sm focus:outline-none focus:border-action disabled:bg-bg-hover ${
                                        needsComment ? 'border-danger' : 'border-border-input'
                                      }`}
                                    />
                                    {needsComment && (
                                      <div
                                        className="text-xs text-danger mt-1"
                                        data-testid={`supplier-rfp-comment-required-${row.termId}`}
                                      >
                                        {t('rfx.rfp.commentRequired')}
                                      </div>
                                    )}
                                  </TableCell>
                                </TableRow>
                              );
                            }),
                        )}
                      </tbody>
                    </Table>
                  </div>

                  <div>
                    <label
                      className="block text-sm font-semibold text-text-primary mb-1"
                      htmlFor={`other-${event.id}`}
                    >
                      {t('rfx.rfp.otherTerms')}
                    </label>
                    <p className="text-xs text-text-tertiary mb-1">{t('rfx.rfp.otherTermsHint')}</p>
                    <textarea
                      id={`other-${event.id}`}
                      rows={2}
                      disabled={locked}
                      value={other[event.id] ?? mine?.otherTerms ?? ''}
                      onChange={(e) => setOther((prev) => ({ ...prev, [event.id]: e.target.value }))}
                      className="w-full bg-white border border-border-input rounded-md px-3 py-2 text-sm focus:outline-none focus:border-action disabled:bg-bg-hover"
                    />
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <Button
                      variant="secondary"
                      disabled={locked}
                      onClick={() => send(event, true)}
                      data-testid={`supplier-rfp-save-${event.id}`}
                    >
                      {t('rfx.save')}
                    </Button>
                    <Button
                      variant="outline"
                      disabled={locked || missing.length > 0 || uncommented.length > 0}
                      onClick={() => send(event, false)}
                      data-testid={`supplier-rfp-submit-${event.id}`}
                    >
                      {t('rfx.rfp.submit')}
                    </Button>
                  </div>
                </div>
              )}
            </section>
          );
        })}
      </div>
    </AppShellV2>
  );
};

export default SupplierRfp;
