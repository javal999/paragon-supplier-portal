/** @import React from 'react' */
/** @import { POLineItem, PurchaseOrder } from '@services/data/types' */
/** @import { BlanketPoRunOut } from '@services/transitions/blanketPoRules' */
/** @import { CallOffView, umbrellaRemaining } from '@services/transitions/callOffRules' */
/** @import { useRowHighlight } from '@hooks/useRowHighlight' */
/** @import { useVerbAvailability } from '@hooks/useVerbAvailability' */
/** @import { ReasonedMatch } from '@components/ui-v2/MaterialSearch' */
/** @import { LinkedAsn, Panel } from '../utils' */
import { useTranslation } from 'react-i18next';
import Button from '@components/ui-v2/Button';
import Data from '@components/ui-v2/Data';
import { HandoffNotice } from '@components/ui-v2/HandoffNotice';
import { MaterialMatchReason } from '@components/ui-v2/MaterialSearch';
import Table from '@components/ui-v2/Table';
import TableHeader, { TableHeaderCell } from '@components/ui-v2/TableHeader';
import { RunOutFacts } from '../../callOffs/blanketRunOutDisplay';
import { PicCell, PicHeader, ptiPicOf } from '../../materials/picDisplay';
import CallOffRow from './CallOffRow';
import RemainingFacts from './RemainingFacts';

/**
 * @typedef {object} UmbrellaSectionProps
 * @property {PurchaseOrder} po
 * @property {POLineItem} line
 * @property {ReturnType<typeof umbrellaRemaining>} remaining
 * @property {CallOffView[]} rows The line's call-offs the current tab lists.
 * @property {ReasonedMatch | null} match Why the material search matched this line (Material C3).
 * @property {BlanketPoRunOut | undefined} runOut CAP-9 — the line's run-out, if it is a blanket PO line.
 * @property {boolean} planHeld Whether the seat holds `calloff:plan`; otherwise the handoff notice replaces the actions.
 * @property {ReturnType<typeof useVerbAvailability>} planAvailability
 * @property {(next: Panel) => void} open Opens the new call-off, series or call-off panel.
 * @property {ReturnType<typeof useRowHighlight>} highlight
 * @property {Map<string, LinkedAsn[]>} linkedAsns
 */

/**
 * One umbrella PO line (supplier + material): its PO and supplier, material,
 * PIC, remaining quantity and value (CR-04), run-out (CAP-9), the planner's
 * New call-off / Series actions, and its call-offs. Moved out of
 * `BuyerCallOffs.jsx` by the Phase 5 page split (no behaviour change).
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
  open,
  highlight,
  linkedAsns
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
          {/* CR-04 / BL-49 — a line's own basis: quantity by default, value
                    only where the line carries no quantity. */}
          <RemainingFacts line={line} remaining={remaining} />
          <p
            className="mt-1 text-[11px] text-text-tertiary"
            data-testid={`calloff-basis-${line.id}`}
          >
            {t(
              remaining.basis === 'quantity' ? 'co.umbrella.byQuantity' : 'co.umbrella.noQuantity'
            )}
          </p>
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
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableHeaderCell>{t('co.col.callOff')}</TableHeaderCell>
              <TableHeaderCell>{t('co.col.type')}</TableHeaderCell>
              <TableHeaderCell className="text-right">{t('co.col.quantity')}</TableHeaderCell>
              <TableHeaderCell>{t('co.col.needDate')}</TableHeaderCell>
              <TableHeaderCell>{t('co.col.confirmation')}</TableHeaderCell>
              <TableHeaderCell>{t('co.col.delivery')}</TableHeaderCell>
              <TableHeaderCell className="text-right">{t('co.col.action')}</TableHeaderCell>
            </TableHeader>
            <tbody>
              {rows.map((v) => (
                <CallOffRow
                  key={v.callOff.id}
                  v={v}
                  highlight={highlight}
                  linkedAsns={linkedAsns}
                  open={open}
                />
              ))}
            </tbody>
          </Table>
        </div>
      )}
    </section>
  );
};

export default UmbrellaSection;
