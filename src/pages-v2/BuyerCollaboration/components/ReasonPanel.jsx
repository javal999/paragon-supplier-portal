/** @import React from 'react' */
/** @import { VerbAvailability } from '@services/transitions/handoff' */
/** @import { CoverageRow } from '../const' */
import { useTranslation } from 'react-i18next';
import SidePanel from '@components/ui-v2/SidePanel';
import Button from '@components/ui-v2/Button';
import { HandoffNotice } from '@components/ui-v2/HandoffNotice';
import Data from '@components/ui-v2/Data';
import { responseOf, supplierName } from '../utils';
import DisputeExchange from './DisputeExchange';

/**
 * The words a verb requires, and the exchange they land in.
 *
 * ⚠️ **ONE PANEL FOR BOTH REASON-CARRYING VERBS, AND THAT IS THE INSTRUCTED
 * SHAPE RATHER THAN A TIDINESS PREFERENCE.** `t_requirementresponse_dispute`
 * and `_resolve` require the same thing of a planner — authored words, proven
 * non-blank by the SAME policy hook (`rr_dispute_text_authored`), appended to
 * the SAME ledger. Authoring a second panel beside a proven one is how the two
 * drift, and the half that drifts is never the visible half: it is the blank
 * guard, or the availability gate below.
 *
 * ⚠️ **THE COMMIT IS GATED ON AVAILABILITY, NOT ONLY THE CTA THAT OPENED IT
 * (§84).** A panel is component state and component state OUTLIVES THE SEAT: a
 * seat narrowed while this is open still has a live commit button under the old
 * render. Gating only the entrance would be guarding one door of a mode reached
 * more than one way.
 *
 * ⚠️ **AND IT IS BELT, NOT A LAYER — SAID PLAINLY RATHER THAN COUNTED AS
 * COVERAGE.** No spec in this tree reaches it: the CTA gate closes the only
 * entrance, so a withheld seat cannot open the panel to be asked about the
 * commit, and the narrowing-while-open case needs an identity change between
 * two renders that jsdom cannot stage here. A mutation probe therefore does NOT
 * kill this line, and claiming it as a guarded path would be claiming coverage
 * that does not exist — the same honesty the resolve commit's own comment keeps
 * about its blank check. It is kept as what catches a future edit that removes
 * the CTA gate, which is a real edit somebody will make.
 */
/**
 * @typedef {{
 *     readonly title: string;
 *     readonly heading: string;
 *     readonly srLabel: string;
 *     readonly placeholder: string;
 *     readonly note: string;
 *     readonly cancel: string;
 *     readonly commit: string;
 *   }} ReasonPanelCopy
 */

/**
 * The side panel both reason-carrying verbs share (resolve and dispute): the
 * seat's handoff notice, the exchange so far, the supplier's own words, and the
 * authored text box, with cancel + commit in the footer. The commit is disabled
 * while pending, while the text is blank, and while the seat does not hold the
 * verb. `copy` and `testIds` are the only things that differ per verb.
 *
 * Moved out of `BuyerCollaboration.jsx` by the Phase 5 page split (no behaviour
 * change).
 */
/** @type {React.FC<{ row: CoverageRow | null; answer: string; onAnswer: (v: string) => void; pending: boolean; onCancel: () => void; onCommit: () => void; copy: ReasonPanelCopy; availability: VerbAvailability; testIds: { input: string; commit: string }; }>} */
const ReasonPanel = ({
  row,
  answer,
  onAnswer,
  pending,
  onCancel,
  onCommit,
  copy,
  availability,
  testIds
}) => {
  const { t } = useTranslation();
  const response = row ? responseOf(row.state) : null;
  const blank = answer.trim() === '';
  const withheld = availability.kind !== 'held';

  return (
    <SidePanel
      open={row !== null}
      onClose={onCancel}
      title={copy.title}
      footerActions={
        <>
          <Button variant="secondary" onClick={onCancel}>
            {copy.cancel}
          </Button>
          <Button
            variant="outline"
            data-testid={testIds.commit}
            disabled={pending || blank || withheld}
            onClick={onCommit}
          >
            {copy.commit}
          </Button>
        </>
      }
    >
      {response && row && (
        <div className="flex flex-col gap-6">
          {/* The seat, restated where the act is — a notice on the list is not a
              notice on a panel a narrowing can leave standing open. */}
          <HandoffNotice availability={availability} testId={`${testIds.commit}-handoff`} />
          <section>
            <h3 className="text-label mb-2 uppercase text-text-tertiary">
              {t('sdc.resolve.section.exchange')}
            </h3>
            <div className="mb-2 text-xs text-text-tertiary">
              <Data>{response.id}</Data> · {supplierName(response.supplierId)} ·{' '}
              <Data>{row.line.periodBucket}</Data>
            </div>
            <DisputeExchange entries={response.disputeResponse ?? []} />
          </section>

          <section>
            <h3 className="text-label mb-2 uppercase text-text-tertiary">
              {t('sdc.resolve.section.supplierSaid')}
            </h3>
            {/* The supplier's own words, unedited and untranslated - a record,
                not copy. An HONEST BLANK when they stated none: this lane never
                fabricates a cause on a supplier's behalf. */}
            <p className="text-xs text-text-secondary" data-testid="sdc-resolve-rootcause">
              {response.rootCause?.note ??
                response.forecastConfirmation?.capacityConstraint ??
                t('sdc.resolve.noRootCause')}
            </p>
          </section>

          <section>
            <h3 className="text-label mb-2 uppercase text-text-tertiary">{copy.heading}</h3>
            <label htmlFor={testIds.input} className="sr-only">
              {copy.srLabel}
            </label>
            <textarea
              id={testIds.input}
              data-testid={testIds.input}
              className="w-full rounded-md border border-border-subtle bg-bg-surface px-3 py-2 text-sm text-text-primary"
              rows={4}
              placeholder={copy.placeholder}
              value={answer}
              onChange={(e) => onAnswer(e.target.value)}
            />
            <div className="mt-2 text-xs text-text-tertiary">{copy.note}</div>
          </section>
        </div>
      )}
    </SidePanel>
  );
};

export default ReasonPanel;
