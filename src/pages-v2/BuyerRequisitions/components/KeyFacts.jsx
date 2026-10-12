/** @import React from 'react' */
/** @import { TFunction } from 'i18next' */
/** @import { PurchaseRequisition } from '@services/data/types' */
/** @import { ActorAttribution, UnattributedReason } from '@lib/enforcement' */
/** @import { NextAct } from '@services/transitions/nextAct' */
import Data from '@components/ui-v2/Data';
import StatusPill from '@components/ui-v2/StatusPill';
import NextActLine from '@components/ui-v2/NextActLine';
import { useEnumLabel } from '@hooks/useEnumLabel';
import { formatNumber, formatIDR, formatDate } from '@lib/format';
import { STATUS_VARIANT } from '../const';

// ⚠️ §68 — HOW AN ATTRIBUTION READS, AND WHY IT IS A TOTAL RECORD OVER THE
// CLOSED UNION. `UNATTRIBUTED_REASONS` has exactly two members and no `SYSTEM`
// one, deliberately — *"'the system did it' is the comfortable label that makes
// an unattributed act look answered"* (C10 §6.4). Keying the copy off a
// `Record<UnattributedReason, string>` means the day a third reason is added
// the BUILD says so, rather than a surface quietly rendering a raw enum token.
//
// The two are NOT interchangeable and the copy must not merge them:
// NO_PERSON_IN_SESSION is a MISSING capability, IDENTITY_PROVIDER_UNAVAILABLE
// is a FAILING one, and collapsing them would hide the day the first was fixed.
/** @type {Record<UnattributedReason, string>} */
const UNATTRIBUTED_KEY = {
  NO_PERSON_IN_SESSION: 'requisitions.panel.unattributed.noPerson',
  IDENTITY_PROVIDER_UNAVAILABLE: 'requisitions.panel.unattributed.idpDown'
};

/**
 * @typedef {object} KeyFactsProps
 * @property {PurchaseRequisition} selectedPR The live row the detail panel shows.
 * @property {NextAct | null} nextAct Who acts next on this document (S2a), read off the live row.
 * @property {TFunction} t
 */

/**
 * The detail panel's "Key facts" list: material, category, quantity, required
 * date, value, priority, requestor, cost centre, the authored approval band
 * with its provenance line, who approved (once somebody has), and the status
 * with the next-act line. Moved out of `BuyerRequisitions.jsx` by the Phase 5
 * page split (no behaviour change).
 * @type {React.FC<KeyFactsProps>}
 */
const KeyFacts = ({ selectedPR, nextAct, t }) => {
  const el = useEnumLabel();

  // RESOLVED renders the person; UNATTRIBUTED renders WHICH failure, never a
  // bare "unknown" — the reason is the part somebody can act on. No `RESOLVED`
  // value can exist in this tree yet (C10 §2.3); the arm is here because the
  // union has two, and a surface that handles one arm is a surface that will
  // render `[object Object]` on the day the other appears.
  /**
   * @param {ActorAttribution} actor
   * @returns {string}
   */
  const renderAttribution = (actor) =>
    actor.kind === 'RESOLVED' ? actor.person.displayName : t(UNATTRIBUTED_KEY[actor.reason]);

  return (
    <section>
      <h3 className="text-label text-text-tertiary uppercase mb-3">
        {t('requisitions.panel.keyFacts')}
      </h3>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
        <div>
          <dt className="text-text-tertiary">{t('requisitions.panel.field.material')}</dt>
          <dd className="text-text-primary font-medium">{selectedPR.material}</dd>
        </div>
        <div>
          <dt className="text-text-tertiary">{t('requisitions.panel.field.category')}</dt>
          <dd className="text-text-primary font-medium">{selectedPR.category}</dd>
        </div>
        <div>
          <dt className="text-text-tertiary">{t('requisitions.panel.field.quantity')}</dt>
          <Data as="dd" className="text-text-primary font-medium">
            {formatNumber(selectedPR.quantity)} {selectedPR.uom}
          </Data>
        </div>
        <div>
          <dt className="text-text-tertiary">{t('requisitions.panel.field.requiredDate')}</dt>
          <Data as="dd" className="text-text-primary font-medium">
            {formatDate(selectedPR.requiredDate)}
          </Data>
        </div>
        <div>
          <dt className="text-text-tertiary">{t('requisitions.panel.field.estValue')}</dt>
          <Data as="dd" className="text-text-primary font-semibold">
            {formatIDR(selectedPR.estimatedValue, { compact: true })}
          </Data>
        </div>
        <div>
          <dt className="text-text-tertiary">{t('requisitions.panel.field.priority')}</dt>
          <dd className="text-text-primary font-medium">{el(selectedPR.priority)}</dd>
        </div>
        <div>
          <dt className="text-text-tertiary">{t('requisitions.panel.field.requestor')}</dt>
          <dd className="text-text-primary font-medium">{selectedPR.requestor}</dd>
        </div>
        <div>
          <dt className="text-text-tertiary">{t('requisitions.panel.field.costCenter')}</dt>
          <dd className="text-text-primary font-medium">{selectedPR.costCenter}</dd>
        </div>
        {/* ⚠️ §68 LABELLED IT A DESTINATION; §69 SAYS WHERE THE
            DESTINATION CAME FROM, BECAUSE THE ROW STILL LOOKED
            COMPUTED. The values track `estimatedValue` closely enough
            to read as a derived band — 43M → Section Head, 79M/105M →
            Procurement Head, 210M → VP Procurement — and NOTHING
            DERIVES THEM. Measured at §69: zero relational or arithmetic
            reads of `estimatedValue` exist anywhere in the tree, and no
            threshold number is written anywhere in `src/` or `docs/`.

            Deriving one here was the alternative and was REFUSED: the
            fixture constrains only ≤43M, [67M,105M] and ≥210M, so the
            intervals (43,67) and (105,210) would have to be INVENTED —
            a computed-looking band with invented numbers is strictly
            worse than an authored one, and putting the numbers in code
            is C10 §4.1's second cost (a Tuesday decision becomes a
            deploy) taken in a hook instead of in a state. */}
        <div>
          <dt className="text-text-tertiary">{t('requisitions.panel.field.approvalLevel')}</dt>
          <dd className="text-text-primary font-medium" data-testid="pr-approval-level">
            {selectedPR.approvalLevel || t('requisitions.panel.approvalLevel.unassigned')}
          </dd>
          {/* On EVERY row, including the unassigned one: the claim is
              about the FIELD's provenance, not about the value it
              happens to hold. A note that appeared only when a band was
              present would read as a caveat on that band. */}
          <dd
            className="mt-1 text-[11px] text-text-tertiary"
            data-testid="pr-approval-level-provenance"
          >
            {t('requisitions.panel.approvalLevel.authored')}
          </dd>
        </div>
        {/* And WHO decided, present only once somebody has. Absent
            before the act rather than pre-filled — which is the whole
            difference between this row and the one above it. */}
        {selectedPR.approvedBy && (
          <div>
            <dt className="text-text-tertiary">{t('requisitions.panel.field.approvedBy')}</dt>
            <dd className="text-text-primary font-medium" data-testid="pr-approved-by">
              {renderAttribution(selectedPR.approvedBy)}
            </dd>
          </div>
        )}
        <div>
          <dt className="text-text-tertiary">{t('requisitions.panel.field.status')}</dt>
          <dd>
            <StatusPill variant={STATUS_VARIANT[selectedPR.status]}>{selectedPR.status}</StatusPill>
            <span className="mt-1 block">
              <NextActLine act={nextAct} testId="next-act-buyer-pr" />
            </span>
          </dd>
        </div>
      </dl>
    </section>
  );
};

export default KeyFacts;
