/** @import React from 'react' */
/** @import { RfpEventView } from '@services/sourcing/views' */
import { useTranslation } from 'react-i18next';
import Table from '@components/ui-v2/Table';
import TableHeader, { TableHeaderCell } from '@components/ui-v2/TableHeader';
import TableRow from '@components/ui-v2/TableRow';
import TableCell from '@components/ui-v2/TableCell';
import { rfxSectionsOf } from '@services/sourcing/rfxConfig';
import { AnswerValue, authored, sectionTitle } from '../../rfx/rfxAuthoringDisplay';
import { rfpScoringOf } from '../../rfx/rfpScoring';
import { rfpSummaryCards } from '../../rfx/rfxCompare';

/**
 * The RFP's questions section, answers side by side (submitted proposals only).
 * Moved out of `BuyerRfp.jsx` by the Phase 5 page split (no behaviour change).
 * @type {React.FC<{ event: RfpEventView }>}
 */
const RfpQuestionAnswers = ({ event }) => {
  const { t } = useTranslation();
  // BL-221 — supplier columns in the summary cards' order.
  const responses = rfpSummaryCards(event, rfpScoringOf(event)).map((c) => c.response);
  if (responses.length === 0) return null;
  return (
    <div
      className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm overflow-x-auto"
      data-testid={`rfp-answers-${event.id}`}
    >
      <div className="px-4 py-3 border-b border-border-subtle text-sm font-semibold text-text-primary">
        {t('rfxa.step.rfpQuestions')}
      </div>
      <Table>
        <TableHeader>
          <TableHeaderCell>{t('rfx.rfi.section')}</TableHeaderCell>
          {responses.map((r) => (
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
                  {responses.map((r) => (
                    <TableCell key={r.id} className="align-top text-sm">
                      <AnswerValue
                        q={q}
                        a={(r.questionAnswers ?? []).find((a) => a.questionId === q.id)}
                        testId={`rfp-answer-files-${q.id}-${r.supplierId}`}
                      />
                    </TableCell>
                  ))}
                </TableRow>
              ))
          )}
        </tbody>
      </Table>
    </div>
  );
};

export default RfpQuestionAnswers;
