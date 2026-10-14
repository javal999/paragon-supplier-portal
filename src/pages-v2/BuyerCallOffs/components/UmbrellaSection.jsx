/** @import React from 'react' */
/** @import { POLineItem, PurchaseOrder } from '@services/data/types' */
/** @import { CallOffView, umbrellaRemaining } from '@services/transitions/callOffRules' */
/** @import { useVerbAvailability } from '@hooks/useVerbAvailability' */
/** @import { LinkedAsn, Panel } from '../utils' */
import { useTranslation } from 'react-i18next';
import Button from '@components/ui-v2/Button';
import Data from '@components/ui-v2/Data';
import { HandoffNotice } from '@components/ui-v2/HandoffNotice';
import { MaterialMatchReason } from '@components/ui-v2/MaterialSearch';
import { RunOutFacts } from '../../callOffs/blanketRunOutDisplay';
import { PicCell, PicHeader, ptiPicOf } from '../../materials/picDisplay';
import CallOffRowsTable from './CallOffRowsTable';
import RemainingFacts from './RemainingFacts';

/**
 * @typedef {object} UmbrellaSectionProps
 * @property {PurchaseOrder} po  The umbrella (blanket) PO.
 * @property {POLineItem} line  The PO line this section is for (supplier + material).
 * @property {ReturnType<typeof umbrellaRemaining>} remaining  The line's remaining quantity and value (CR-04).
 * @property {CallOffView[]} rows  The line's call-offs, filtered and sorted by the page.
 * @property {React.ComponentProps<typeof MaterialMatchReason>['match']} match  Why the material search matched this line (C3).
 * @property {React.ComponentProps<typeof RunOutFacts>['row']} runOut  The line's CAP-9 run-out, if any.
 * @property {boolean} planHeld  The seat holds `calloff:plan`.
 * @property {ReturnType<typeof useVerbAvailability>} planAvailability  Shown as a handoff notice when not held.
 * @property {Map<string, LinkedAsn[]>} linkedAsns  Each call-off's ASNs with the current comparison.
 * @property {(next: Panel) => void} open  Opens a side panel (the page's `open`).
 */

/**
 * One umbrella PO line: its header (PO, supplier, material, PIC, remaining
 * figures, CAP-9 run-out facts, and the series / new call-off actions) and its
 * call-offs table.
 * @type {React.FC<UmbrellaSectionProps>}
 */
const UmbrellaSection = ({
  po,
  line,
  remaining,
  rows,
  match,
  runOut,
  planHeld,
  planAvailability,
  linkedAsns,
  open
}) => {
  const { t } = useTranslation();
  return (
    <section
      data-testid={`calloff-umbrella-${po.id}-${line.id}`}
      className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm"
    >
      <header className="px-4 py-3 border-b border-border-subtle flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div
            id={`calloff-umbrella-title-${po.id}-${line.id}`}
            className="flex items-center gap-2 flex-wrap"
          >
            <Data className="text-sm font-bold text-text-primary">{po.poNumber}</Data>
            <span className="text-sm text-text-primary">{po.supplierName}</span>
          </div>
          <div className="text-xs text-text-secondary mt-0.5">
            <Data className="text-text-tertiary">{line.materialCode}</Data> · {line.description}
          </div>
          <MaterialMatchReason match={match} testId={`calloff-match-${line.id}`} />
          <div className="text-xs text-text-secondary mt-1 flex flex-wrap items-center gap-2">
            <PicHeader />
            <PicCell value={ptiPicOf(line.materialCode)} testId={`calloff-pic-${line.id}`} />
          </div>
          <RemainingFacts line={line} remaining={remaining} />
          <RunOutFacts row={runOut} />
        </div>
        <div className="flex gap-2 shrink-0">
          {planHeld ? (
            <>
              {/* BL-31 (WCAG 2.4.6): these two buttons repeat on every agreement line;
                  describedby ties each to its PO and supplier. */}
              <Button
                variant="secondary"
                aria-describedby={`calloff-umbrella-title-${po.id}-${line.id}`}
                onClick={() => open({ kind: 'series', poId: po.id, lineId: line.id })}
              >
                {t('co.action.series')}
              </Button>
              <Button
                variant="outline"
                aria-describedby={`calloff-umbrella-title-${po.id}-${line.id}`}
                onClick={() => open({ kind: 'new', poId: po.id, lineId: line.id })}
              >
                {t('co.action.new')}
              </Button>
            </>
          ) : (
            <HandoffNotice availability={planAvailability} testId="handoff-calloff-plan" />
          )}
        </div>
      </header>
      {rows.length === 0 ? (
        <p className="px-4 py-4 text-sm text-text-tertiary">{t('co.umbrella.none')}</p>
      ) : (
        <CallOffRowsTable rows={rows} linkedAsns={linkedAsns} open={open} />
      )}
    </section>
  );
};

export default UmbrellaSection;
