import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import AppShellV2 from '../components/layout-v2/AppShellV2';
import PageHeader from '../components/ui-v2/PageHeader';
import PageMetaLine from '../components/ui-v2/PageMetaLine';
import SampleDataBadge from '../components/ui-v2/SampleDataBadge';
import Button from '../components/ui-v2/Button';
import Data from '../components/ui-v2/Data';
import StatusPill from '../components/ui-v2/StatusPill';
import LoadingState from '../components/ui-v2/LoadingState';
import ErrorState from '../components/ui-v2/ErrorState';
import { HandoffNotice } from '../components/ui-v2/HandoffNotice';
import { useVerbAvailability } from '../hooks/useVerbAvailability';
import { useToast } from '../hooks/useToast';
import { formatDate } from '../lib/format';
import { BASE_CURRENCY } from '../lib/currencyPolicy';
import { useCurrentIdentity } from '../context/CurrentIdentityContext';
import { useAwards, useNegotiationRounds, useQuotations, useRFQs } from '../services/query/hooks';
import { useRfxCommand } from '../services/query/commandHooks';
import { documentsOf } from '../services/transitions/rfxDocumentRules';
import { DeadlinePill, money, rfxNow } from './rfx/rfxDisplay';
import TieredRevisionFields, { readRevision, revisionPricesFrom, type RevisionPrices } from './rfqs/TieredRevisionFields';

// ─────────────────────────────────────────────────────────────────────────────
// SUPPLIER REVISED QUOTES — REQ-E03-05 (SUP).
//
// A supplier's own negotiation thread and nothing else (BR-05). The row it reads
// is already narrowed by the read model: it carries this supplier's
// participation, not the other invitees' names, prices or answer counts — so
// there is no rival's bid on this page to leak even by accident.
//
// The outcome lives here too (AC-05): a supplier sees ITS OWN share when it is
// awarded and "Not awarded" when it is not, never anybody else's split.
// ─────────────────────────────────────────────────────────────────────────────

const SupplierNegotiations: React.FC = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { identity } = useCurrentIdentity();
  const rounds = useNegotiationRounds();
  const quotes = useQuotations();
  const awards = useAwards();
  const submit = useVerbAvailability('quotation:submit');
  const command = useRfxCommand();
  const [price, setPrice] = useState<Record<string, string>>({});
  const [lead, setLead] = useState<Record<string, string>>({});
  // RFx spec 2026-09-21 — on a tiered RFQ the revision re-prices per break.
  const rfqs = useRFQs();
  const [tierPrices, setTierPrices] = useState<Record<string, RevisionPrices>>({});

  const crumb = [t('hub.nav.section.sourcing'), t('rfx.neg.supplier.title')];
  const items = useMemo(() => rounds.data?.items ?? [], [rounds.data]);

  if (rounds.isPending) return <LoadingState breadcrumb={crumb} />;
  if (rounds.isError)
    return <ErrorState breadcrumb={crumb} error={rounds.error} onRetry={() => rounds.refetch()} />;

  const supplierId = identity.supplierId ?? '';
  const myQuotes = (quotes.data?.items ?? []).filter((q) => q.supplierId === supplierId);

  /** Dispatch a revision and report what the verb actually decided. */
  const revise = (vars: Parameters<typeof command.mutate>[0]) =>
    command.mutate(vars, {
      onSuccess: (res) =>
        toast(
          res.status === 'failed'
            ? { variant: 'error', title: t('rfx.toast.refused', { reason: res.reason ?? '' }) }
            : { variant: 'success', title: t('rfx.toast.sent') },
        ),
      onError: () => toast({ variant: 'error', title: t('rfx.toast.refused', { reason: '' }) }),
    });

  return (
    <AppShellV2>
      <PageHeader
        breadcrumb={crumb}
        title={t('rfx.neg.supplier.title')}
        subtitle={t('rfx.neg.supplier.subtitle')}
      />
      <PageMetaLine className="-mt-6 mb-4">
        {t('rfx.asOf')} <Data>{formatDate(rfxNow())}</Data>
        <SampleDataBadge className="ml-3 align-middle" />
      </PageMetaLine>

      {submit.kind !== 'held' && (
        <div className="mb-4">
          <HandoffNotice availability={submit} testId="handoff-quotation-revise" />
        </div>
      )}

      {items.length === 0 && (
        <p className="py-10 text-center text-sm text-text-tertiary" data-testid="supplier-rounds-empty">
          {t('rfx.neg.supplier.empty')}
        </p>
      )}

      <div className="space-y-4">
        {items.map((round) => {
          // The latest version of this supplier's bid on this event — what the
          // revision starts from and what stands if it never answers.
          const versions = myQuotes
            .filter((q) => q.rfqId === round.rfqId)
            .slice()
            .sort((a, b) => (a.roundNumber ?? 0) - (b.roundNumber ?? 0));
          const last = versions[versions.length - 1] ?? null;
          const already = versions.find((q) => q.roundNumber === round.roundNumber) ?? null;
          const currency = last?.currency ?? BASE_CURRENCY;
          const locked = submit.kind !== 'held' || round.closed || already !== null;
          const rfq = (rfqs.data?.items ?? []).find((r) => r.id === round.rfqId);
          const tiered = Boolean(rfq && (rfq.items ?? []).length > 0 && last?.itemQuotes);
          const typedTiers = tierPrices[round.id] ?? revisionPricesFrom(last);
          const revision = tiered && rfq && last ? readRevision(rfq, last, typedTiers) : null;

          return (
            <section
              key={round.id}
              className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm"
              data-testid={`supplier-round-${round.id}`}
            >
              <header className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-border-subtle">
                <div>
                  <Data className="font-semibold">{round.rfqNumber}</Data>
                  <div className="text-sm text-text-primary">{round.rfqTitle}</div>
                  <div className="text-xs text-text-tertiary">
                    {t('rfx.cmp.round', { round: round.roundNumber })}
                    {round.bestAndFinal ? ` · ${t('rfx.neg.bestAndFinal')}` : ''}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <DeadlinePill deadline={round.deadline} done={round.closed || already !== null} />
                  <StatusPill variant={already ? 'success' : 'warning'}>
                    {t(already ? 'rfx.neg.revised' : 'rfx.neg.notRevised')}
                  </StatusPill>
                </div>
              </header>

              <div className="px-4 py-4 space-y-3">
                {round.message && <p className="text-sm text-text-secondary">{round.message}</p>}
                {round.targetUnitPrice !== undefined && (
                  <p className="text-sm text-text-secondary">
                    {t('rfx.neg.target')}: <Data>{money(round.targetUnitPrice, currency)}</Data>
                  </p>
                )}
                {last && (
                  <p className="text-sm text-text-tertiary">
                    {t('rfx.neg.yourLastQuote')}: <Data>{money(last.unitPrice, currency)}</Data> ·{' '}
                    <Data>
                      {last.leadTimeDays} {t('rfx.unit.days')}
                    </Data>
                  </p>
                )}

                <div className="flex flex-wrap items-end gap-3">
                  {tiered && rfq && (
                    <TieredRevisionFields
                      rfq={rfq}
                      roundId={round.id}
                      prices={typedTiers}
                      disabled={locked}
                      onChange={(next) => setTierPrices((prev) => ({ ...prev, [round.id]: next }))}
                    />
                  )}
                  {!tiered && (
                  <>
                  <div>
                    <label className="block text-xs font-semibold text-text-secondary mb-1" htmlFor={`price-${round.id}`}>
                      {t('rfx.cmp.row.unitPrice')}
                    </label>
                    <input
                      id={`price-${round.id}`}
                      type="number"
                      disabled={locked}
                      value={price[round.id] ?? ''}
                      onChange={(e) => setPrice((prev) => ({ ...prev, [round.id]: e.target.value }))}
                      className="bg-white border border-border-input rounded-md px-3 h-10 text-sm focus:outline-none focus:border-action disabled:bg-bg-hover"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-text-secondary mb-1" htmlFor={`lead-${round.id}`}>
                      {t('rfx.cmp.row.leadTime')}
                    </label>
                    <input
                      id={`lead-${round.id}`}
                      type="number"
                      disabled={locked}
                      value={lead[round.id] ?? (last ? String(last.leadTimeDays) : '')}
                      onChange={(e) => setLead((prev) => ({ ...prev, [round.id]: e.target.value }))}
                      className="bg-white border border-border-input rounded-md px-3 h-10 text-sm focus:outline-none focus:border-action disabled:bg-bg-hover"
                    />
                  </div>
                  </>
                  )}
                  <Button
                    variant="outline"
                    disabled={locked || (tiered ? revision === null : !price[round.id])}
                    data-testid={`supplier-round-submit-${round.id}`}
                    onClick={() =>
                      tiered && revision && last
                        ? revise({
                            verb: 'reviseQuote',
                            roundId: round.id,
                            rfqId: round.rfqId,
                            supplierId,
                            roundNumber: round.roundNumber,
                            supersedesQuotationId: last.id,
                            unitPrice: revision.unitPrice,
                            leadTimeDays: revision.leadTimeDays,
                            currency,
                            itemQuotes: revision.itemQuotes,
                            ...(last.alternatives ? { alternatives: last.alternatives } : {}),
                            ...(last.answers ? { answers: last.answers } : {}),
                            ...(last.sampleOffer ? { sampleOffer: last.sampleOffer } : {}),
                            // NR-1 — the files carry forward as documents (legacy
                            // `attachments` read through `documentsOf`).
                            ...(documentsOf(last).length > 0 ? { documents: documentsOf(last) } : {}),
                            ...(last.paymentTermsOffered ? { paymentTermsOffered: last.paymentTermsOffered } : {}),
                            ...(last.validUntil ? { validUntil: last.validUntil } : {}),
                            ...(round.bestAndFinal ? { bestAndFinal: true } : {}),
                          })
                        : revise({
                        verb: 'reviseQuote',
                        roundId: round.id,
                        rfqId: round.rfqId,
                        supplierId,
                        roundNumber: round.roundNumber,
                        ...(last ? { supersedesQuotationId: last.id } : {}),
                        ...(last && documentsOf(last).length > 0 ? { documents: documentsOf(last) } : {}),
                        unitPrice: Number(price[round.id]),
                        leadTimeDays: Number(lead[round.id] ?? last?.leadTimeDays ?? 0),
                        currency,
                        ...(last?.paymentTermsOffered ? { paymentTermsOffered: last.paymentTermsOffered } : {}),
                        ...(last?.validUntil ? { validUntil: last.validUntil } : {}),
                        ...(round.bestAndFinal ? { bestAndFinal: true } : {}),
                      })
                    }
                  >
                    {t('rfx.neg.submitRevision')}
                  </Button>
                </div>
              </div>
            </section>
          );
        })}
      </div>

      {/* AC-05 — this supplier's own outcome, and nobody else's share. */}
      <section className="mt-6">
        <h2 className="text-sm font-semibold text-text-primary mb-2">{t('rfx.award.title')}</h2>
        {(awards.data?.items ?? []).length === 0 ? (
          <p className="text-sm text-text-tertiary" data-testid="supplier-awards-empty">
            {t('rfx.award.empty')}
          </p>
        ) : (
          <ul className="space-y-2">
            {(awards.data?.items ?? []).map((award) => {
              const mine = award.lines.find((l) => l.supplierId === supplierId) ?? null;
              return (
                <li
                  key={award.id}
                  className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm px-4 py-3 text-sm"
                  data-testid={`supplier-award-${award.id}`}
                >
                  <Data className="font-semibold">{award.rfqNumber}</Data> {award.rfqTitle}
                  <div className="mt-1">
                    {mine ? (
                      <StatusPill variant="success">
                        {t('rfx.award.yourShare', { share: mine.sharePct, qty: mine.quantity })}
                      </StatusPill>
                    ) : (
                      <StatusPill variant="neutral">{t('rfx.award.notAwarded')}</StatusPill>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </AppShellV2>
  );
};

export default SupplierNegotiations;
