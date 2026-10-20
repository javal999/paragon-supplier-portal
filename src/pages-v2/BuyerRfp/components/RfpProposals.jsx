/** @import React from 'react' */
/** @import { RfpEventView, RfpFirmPriceView } from '@services/sourcing/views' */
/** @import { RfpSummaryCard } from '../../rfx/rfxCompare' */
import { useTranslation } from 'react-i18next';
import Data from '@components/ui-v2/Data';
import StatusPill from '@components/ui-v2/StatusPill';
import Table from '@components/ui-v2/Table';
import TableHeader, { TableHeaderCell } from '@components/ui-v2/TableHeader';
import TableRow from '@components/ui-v2/TableRow';
import TableCell from '@components/ui-v2/TableCell';
import { RFP_TERM_GROUP_ORDER, rfpTermGroupOf } from '@services/sourcing/rfxConfig';
import { EligibilityMarker } from '../../rfx/eligibilityDisplay';
import { moneyIn, termLabel, termValueText } from '../../rfx/rfxAuthoringDisplay';
import { RfpPricingComparison } from '../../rfx/RfpPricing';
import { SupplierDocumentsPanel } from '../../rfx/SupplierDocumentsPanel';
import { AnswersBySection } from '../../rfx/RfxProposalViews';
import { SummaryCard, SupplierStepper, VersionHistory } from '../../rfx/RfxEventTabs';

// ─────────────────────────────────────────────────────────────────────────────
// RFx UX 2G — the RFP's proposals on the Compare and By supplier tabs: the
// summary strip (one card per submitted proposal, best scored first, by the
// CR-15 composite the page already computes) and one proposal laid out as the
// supplier sent it. Display only: no score is made here.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The Compare tab's summary strip.
 * @type {React.FC<{ event: RfpEventView; cards: readonly RfpSummaryCard[]; onView: (supplierId: string) => void }>}
 */
export const RfpSummaryStrip = ({ event, cards, onView }) => {
  const { t } = useTranslation();
  const leadRow = event.terms.find((row) => row.termId === 'leadTime');
  return (
    <ol className="flex flex-wrap gap-3" data-testid={`rfp-summary-${event.id}`}>
      {cards.map((c) => {
        const r = c.response;
        const facts = [
          {
            key: 'deviations',
            label: t('rfx.card.deviations'),
            value: <Data>{c.deviations}</Data>
          },
          ...c.lowestPrices.map((p) => ({
            key: `price-${p.option.id}`,
            label: t('rfx.card.lowestPrice', { option: p.option.title }),
            value: <Data>{moneyIn(p.unitPrice, event.currency)}</Data>
          })),
          ...(leadRow && c.leadTime !== undefined
            ? [
                {
                  key: 'lead',
                  label: termLabel(t, leadRow),
                  value: <Data>{termValueText(t, leadRow, c.leadTime)}</Data>
                }
              ]
            : [])
        ];
        return (
          <SummaryCard
            key={r.id}
            supplierName={r.supplierName}
            scoreLabel={t('rfx.rfp.scored')}
            score={c.score}
            facts={facts}
            eligibility={
              event.invitedSuppliers.find((i) => i.supplierId === r.supplierId)?.eligibility
            }
            version={c.version}
            submittedAt={c.submittedAt}
            linkLabel={t('rfx.card.viewProposal')}
            onView={() => onView(r.supplierId)}
            testId={`rfp-card-${r.supplierId}`}
          />
        );
      })}
    </ol>
  );
};

/**
 * By supplier: one proposal as the supplier sent it — each term with what PTI
 * asks for, what is proposed, comply or deviate and the comment; other terms;
 * the indicative prices with the sample offer, timeline and validity; the
 * answers to the RFP's questions; the files; the versions.
 * @type {React.FC<{
 *   event: RfpEventView;
 *   cards: readonly RfpSummaryCard[];
 *   supplierId: string;
 *   onPick: (supplierId: string) => void;
 *   firmPrices: readonly RfpFirmPriceView[];
 * }>}
 */
export const RfpSupplierView = ({ event, cards, supplierId, onPick, firmPrices }) => {
  const { t } = useTranslation();
  const card = cards.find((c) => c.response.supplierId === supplierId) ?? cards[0];
  if (!card) return null;
  const r = card.response;
  const sid = r.supplierId;
  return (
    <div className="space-y-6" data-testid={`rfp-supplier-${event.id}`}>
      <SupplierStepper
        options={cards.map((c) => ({ id: c.response.supplierId, name: c.response.supplierName }))}
        current={sid}
        onChange={onPick}
        testId="rfp-supplier-step"
      />
      <div
        id="rfp-supplier-terms"
        className="scroll-mt-4 bg-bg-surface border border-border-subtle rounded-lg shadow-sm"
        data-testid={`rfp-supplier-terms-${sid}`}
      >
        <div className="px-4 py-3 border-b border-border-subtle space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-text-primary">{r.supplierName}</h3>
            <EligibilityMarker
              eligibility={event.invitedSuppliers.find((i) => i.supplierId === sid)?.eligibility}
              compact
              testId={`rfp-supplier-elig-${sid}`}
            />
          </div>
          <p className="text-xs text-text-tertiary">
            {t('rfx.rfp.scored')}{' '}
            {card.score === null ? t('rfx.rfi.noScore') : <Data>{card.score}</Data>}
            {' · '}
            {t('rfx.rfp.deviations', { count: card.deviations })}
          </p>
        </div>
        <Table>
          <TableHeader>
            <TableHeaderCell>{t('rfx.rfp.col.term')}</TableHeaderCell>
            <TableHeaderCell>{t('rfx.rfp.col.requested')}</TableHeaderCell>
            <TableHeaderCell>{t('rfx.rfp.col.proposed')}</TableHeaderCell>
            <TableHeaderCell>{t('rfx.bySupplier.stance')}</TableHeaderCell>
            <TableHeaderCell>{t('rfx.bySupplier.comment')}</TableHeaderCell>
          </TableHeader>
          <tbody>
            {RFP_TERM_GROUP_ORDER.flatMap((group) =>
              event.terms
                .filter((row) => rfpTermGroupOf(row) === group)
                .map((row, index) => {
                  const a = r.answers.find((x) => x.termId === row.termId);
                  const deviates = a?.stance === 'deviate';
                  return (
                    <TableRow key={row.termId} data-testid={`rfp-supplier-term-${row.termId}`}>
                      <TableCell className="align-top">
                        {index === 0 && (
                          <div className="text-xs uppercase tracking-wide text-text-tertiary">
                            {t(`rfx.group.${group}`)}
                          </div>
                        )}
                        <div className="text-sm text-text-primary">{termLabel(t, row)}</div>
                      </TableCell>
                      <TableCell className="align-top text-sm text-text-secondary">
                        <Data>{termValueText(t, row, row.requestedValue)}</Data>
                      </TableCell>
                      <TableCell className={`align-top ${deviates ? 'bg-warning-soft' : ''}`}>
                        <Data>{termValueText(t, row, a?.proposedValue)}</Data>
                      </TableCell>
                      <TableCell className="align-top">
                        {a ? (
                          <StatusPill variant={deviates ? 'warning' : 'success'}>
                            {t(`rfx.stance.${a.stance}`)}
                          </StatusPill>
                        ) : (
                          '—'
                        )}
                      </TableCell>
                      <TableCell className="align-top text-xs text-text-secondary">
                        {a?.comment ?? '—'}
                      </TableCell>
                    </TableRow>
                  );
                })
            )}
            <TableRow data-testid={`rfp-supplier-other-${sid}`}>
              <TableCell className="align-top text-sm text-text-primary">
                {t('rfx.rfp.otherTerms')}
              </TableCell>
              <TableCell className="align-top text-sm text-text-tertiary">—</TableCell>
              <TableCell className="align-top text-sm text-text-secondary">
                {r.otherTerms ?? '—'}
              </TableCell>
              <TableCell className="align-top">{''}</TableCell>
              <TableCell className="align-top">{''}</TableCell>
            </TableRow>
          </tbody>
        </Table>
      </div>
      {event.pricing ? (
        <div id="rfp-supplier-pricing" className="scroll-mt-4">
          <RfpPricingComparison
            request={event.pricing}
            currency={event.currency}
            responses={[r]}
            testId={`rfp-supplier-pricing-${sid}`}
            firmPrices={firmPrices.filter((p) => p.supplierId === sid)}
          />
        </div>
      ) : null}
      {(event.questions ?? []).length > 0 ? (
        <div id="rfp-supplier-questions" className="scroll-mt-4">
          <AnswersBySection
            title={t('rfxa.step.rfpQuestions')}
            questions={event.questions ?? []}
            customSections={event.customSections}
            answers={r.questionAnswers ?? []}
            testId={`rfp-supplier-answers-${sid}`}
          />
        </div>
      ) : null}
      <div id="rfp-supplier-documents" className="scroll-mt-4">
        <SupplierDocumentsPanel
          requests={event.documentRequests}
          responses={[r]}
          deadlineFor={(id) =>
            event.invitedSuppliers.find((i) => i.supplierId === id)?.deadline ??
            event.responseDeadline
          }
          testId={`rfp-supplier-docs-${sid}`}
        />
      </div>
      <div id="rfp-supplier-versions" className="scroll-mt-4">
        <VersionHistory versions={r.versions} testId={`rfp-supplier-versions-${sid}`} />
      </div>
    </div>
  );
};
