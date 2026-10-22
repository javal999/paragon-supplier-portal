/** @import React from 'react' */
/** @import { TFunction } from 'i18next' */
/** @import { RFQ } from '@data/mockRfqs' */
/** @import { VerbAvailability } from '@services/transitions/handoff' */
import { FileText, Plus, FileSpreadsheet } from 'lucide-react';
import PageHeader from '@components/ui-v2/PageHeader';
import PageMetaLine from '@components/ui-v2/PageMetaLine';
import ProvenanceMarker from '@components/ui-v2/ProvenanceMarker';
import BulkActionsBar from '@components/ui-v2/BulkActionsBar';
import { HandoffNotice } from '@components/ui-v2/HandoffNotice';
import Data from '@components/ui-v2/Data';
import { formatDate } from '@lib/format';
import { TODAY } from '../const';

/**
 * @typedef {object} SourcingHeaderProps
 * @property {readonly RFQ[]} rfqs The board's RFQs (count, and the export's scope).
 * @property {number} activeCount Open RFQs, for the meta line.
 * @property {string} nowIso The board's one clock read — the date its day counts are relative to (B-13).
 * @property {VerbAvailability} rfqCreateAvailability `rfq:create` — gates New RFQ and Templates (§73, §84).
 * @property {(scope: readonly RFQ[], filename: string) => void} exportComparison
 * @property {() => void} onNewRfq Opens an empty wizard.
 * @property {() => void} onTemplates Opens the template picker.
 * @property {TFunction} t
 */

/**
 * The page header (title, count, Export / Templates / New RFQ, or the
 * handoff notice) and the meta line under it. Moved out of
 * `BuyerSourcing.jsx` by the Phase 5 page split (no behaviour change).
 * @type {React.FC<SourcingHeaderProps>}
 */
const SourcingHeader = ({
  rfqs,
  activeCount,
  nowIso,
  rfqCreateAvailability,
  exportComparison,
  onNewRfq,
  onTemplates,
  t
}) => (
  <>
    <PageHeader
      // The eyebrow is the menu section alone: "Sourcing". It read
      // "Sourcing · Sourcing & RFQ" — a leftover from the one-module era,
      // naming the section twice (NV-05 replaces the first crumb anyway).
      breadcrumb={[t('hub.nav.section.sourcing')]}
      title={t('sourcing.header.title')}
      count={rfqs.length}
      subtitle={t('sourcing.header.subtitle')}
      actions={
        // §73 — the page-level create, WITHHELD rather than disabled. A seat
        // without `rfq:create` reads whose act it is instead of pressing a
        // button that opens a wizard the dispatcher will refuse at the end.
        // Export is a read holding no atom; it is not gated. TEMPLATES IS NOW
        // AN ENTRANCE TO CREATE — both of its choices open the wizard that
        // ends in `t_rfq_create` — so it is withheld with "New RFQ" rather
        // than offered to a seat the dispatcher will refuse at the end (the
        // entrance is the unit, §84).
        <div className="flex items-center gap-3">
          <HandoffNotice availability={rfqCreateAvailability} testId="handoff-rfq-create" />
          <BulkActionsBar
            actions={[
              {
                label: t('sourcing.action.export'),
                icon: FileSpreadsheet,
                onClick: () => exportComparison(rfqs, `rfq-comparison-${TODAY}.csv`)
              },
              ...(rfqCreateAvailability.kind === 'held'
                ? [
                    {
                      label: t('sourcing.action.templates'),
                      icon: FileText,
                      onClick: onTemplates
                    }
                  ]
                : [])
            ]}
            {...(rfqCreateAvailability.kind === 'held'
              ? {
                  primary: {
                    label: t('sourcing.action.newRfq'),
                    icon: Plus,
                    // ⚠️ WRAPPED, NOT PASSED BARE. `openWizard` now takes an
                    // optional prefill, and a bare handler reference hands it
                    // React's click EVENT as that argument — truthy, so every
                    // "New RFQ" press would prefill the draft from a
                    // SyntheticEvent and blank the fields the parser reads.
                    // Caught by the wizard's own numeric specs, which is why
                    // an optional first parameter on a handler is worth this
                    // comment rather than a silent arrow. (`onNewRfq` is that
                    // wrapper: the workspace passes `() => openWizard()`.)
                    onClick: onNewRfq
                  }
                }
              : {})}
          />
        </div>
      }
    />

    <PageMetaLine className="-mt-6 mb-6">
      {/* RFx UX B-13 — the "As of" line the RFI and RFP pages carry, read from
          the clock every day count on this board uses. It read "last updated"
          with the newest RFQ's creation date, which named no present at all. */}
      <span data-testid="rfq-board-as-of">
        {t('rfx.asOf')} <Data>{formatDate(nowIso)}</Data>
      </span>
      <span className="ml-3">
        {t(activeCount === 1 ? 'sourcing.meta.summary.one' : 'sourcing.meta.summary.other', {
          count: activeCount
        })}
      </span>
      {/* D-CENSUS-8 — MARKER-SCOPE-01. The existing pills here are scoped to the
          commodity / market-intel panels; the RFQ pipeline itself was unmarked.
          PARTLY REAL: award genuinely dispatches through the wired `rfq` target
          and drives the quotation cascade, over a fixture RFQ set. */}
      <ProvenanceMarker capability="rfqs" className="ml-3 align-middle" />
    </PageMetaLine>
  </>
);

export default SourcingHeader;
