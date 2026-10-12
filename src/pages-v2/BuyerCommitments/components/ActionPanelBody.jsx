/** @import React from 'react' */
import { useTranslation } from 'react-i18next';
import Data from '@components/ui-v2/Data';
import { formatDateTime } from '@lib/format';
import { labelClass } from '../../inventory/inventoryDisplay';
import { qtyText } from '../../forecasts/forecastDisplay';
import { fieldClass } from '../const';
/** @import { Action } from '../const' */
/** @import { MoveView } from '../utils' */

/**
 * CAP-8 BR-03 — the text for a Move demand the shortfall rule refuses, and
 * whether it is shown (a number the planner typed) or only names what the
 * switched-off confirm waits for (nothing typed yet).
 * @param {NonNullable<MoveView['refused']>} refused
 * @param {MoveView} move
 * @param {string} unit
 * @param {import('i18next').TFunction} t
 * @returns {{ text: string; shown: boolean }}
 */
function moveRefusalText(refused, move, unit, t) {
  switch (refused.refusal) {
    case 'aboveShortfall':
      return {
        text: t('fc.pti.gaps.move.aboveShortfall', { qty: qtyText(move.shortfall), unit }),
        shown: true
      };
    case 'ambiguous':
      return { text: t('fc.upload.reason.ambiguousNumber'), shown: true };
    case 'nothingToMove':
      return { text: t('fc.pti.gaps.move.nothingToMove'), shown: false };
    default:
      return { text: t('fc.pti.gaps.move.badQty'), shown: true };
  }
}

/**
 * The action panel's body: the line it acts on (supplier, material, period,
 * zone; forecast and commitment), the dispute log and the moves already made
 * from this line (CAP-8 BR-05, one entry per allocation), the accept hint, the
 * Move demand rows (reassign only: CAP-8 BR-01..BR-04 — each qualified
 * supplier with a quantity in the material's base unit and its capacity
 * headroom that period, a warning above it, and the shortfall rule's refusal)
 * and the note (revise and reassign; required, BR-06).
 * @type {React.FC<{
 *   action: Action;
 *   note: string;
 *   onNoteChange: (note: string) => void;
 *   move: MoveView | null;
 *   qtys: Readonly<Record<string, string>>;
 *   onQtyChange: (supplierId: string, raw: string) => void;
 *   headroomOf: (supplierId: string) => number | null;
 *   periodLabel: (bucket: string) => string;
 * }>}
 */
const ActionPanelBody = ({
  action,
  note,
  onNoteChange,
  move,
  qtys,
  onQtyChange,
  headroomOf,
  periodLabel
}) => {
  const { t } = useTranslation();
  // CAP-D3 — the unit is the material's base unit; the planner does not choose it.
  const unit = action.line.uom;
  const refusal = move?.refused ? moveRefusalText(move.refused, move, unit, t) : null;
  return (
    <div className="space-y-3">
      <p className="text-sm text-text-primary">
        {action.line.supplierName} · <Data>{action.line.materialCode}</Data> ·{' '}
        {periodLabel(action.line.periodBucket)} · {t(`fc.zone.${action.line.zone}`)}
      </p>
      <p className="text-sm text-text-secondary">
        {t('fc.col.forecastShort')} <Data>{qtyText(action.line.forecastQty)}</Data>
        {action.line.committedQty !== null && action.line.state !== 'awaiting' && (
          <>
            {' · '}
            {t('fc.col.commitmentShort')} <Data>{qtyText(action.line.committedQty)}</Data>
          </>
        )}
      </p>
      {(action.line.log.length > 0 || action.line.moves.length > 0) && (
        <ul className="text-xs text-text-secondary space-y-1">
          {/* DisputeEntry has no id and `at` repeats (fixed simulated SDC
              clock); text can repeat too. Rows are stateless text, so a
              positional key cannot carry state to the wrong entry. */}
          {action.line.log.map((e, i) => (
            // eslint-disable-next-line react/no-array-index-key -- no identity field; read-only, stateless rows
            <li key={i}>
              <Data>{formatDateTime(e.at)}</Data> — {e.text}
            </li>
          ))}
          {/* CAP-8 BR-05 — one entry per allocation; the same rules for keys as above. */}
          {action.line.moves.map((m, i) => (
            // eslint-disable-next-line react/no-array-index-key -- no identity field; read-only, stateless rows
            <li key={`move-${i}`} data-testid="fc-move-log">
              <Data>{formatDateTime(m.at)}</Data> —{' '}
              {t('fc.pti.gaps.move.logEntry', {
                qty: qtyText(m.qty),
                unit,
                supplier: m.toSupplierName,
                note: m.note
              })}
            </li>
          ))}
        </ul>
      )}
      {action.kind === 'accept' && (
        <p className="text-sm text-text-secondary">{t('fc.pti.gaps.panel.acceptHint')}</p>
      )}
      {action.kind === 'reassign' && move !== null ? (
        <div data-testid="fc-move">
          <p className="text-sm text-text-primary" data-testid="fc-move-shortfall">
            {t('fc.pti.gaps.move.shortfall')} <Data>{`${qtyText(move.shortfall)} ${unit}`}</Data>
          </p>
          <table className="w-full text-sm mt-2">
            <thead>
              <tr className="text-left text-xs text-text-secondary">
                <th scope="col" className="py-1 pr-2 font-medium">
                  {t('fc.pti.gaps.move.supplier')}
                </th>
                <th scope="col" className="py-1 pr-2 font-medium">
                  {t('fc.pti.gaps.move.qty')}
                </th>
                <th scope="col" className="py-1 font-medium text-right">
                  {t('fc.pti.gaps.move.headroom')}
                </th>
              </tr>
            </thead>
            <tbody>
              {action.line.otherQualifiedSuppliers.map((q) => {
                const headroom = headroomOf(q.supplierId);
                const qty = move.allocations.find((a) => a.supplierId === q.supplierId)?.qty ?? 0;
                // BR-04 — above the headroom warns; it never switches the confirm off.
                const over = headroom !== null && qty > headroom;
                const warnId = `fc-move-warn-${q.supplierId}`;
                return (
                  <tr
                    key={q.supplierId}
                    className="border-t border-border-subtle align-top"
                    data-testid={`fc-move-row-${q.supplierId}`}
                  >
                    <th scope="row" className="py-2 pr-2 font-normal text-text-primary">
                      {q.supplierName}
                    </th>
                    <td className="py-2 pr-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          inputMode="decimal"
                          className={`${fieldClass} w-28`}
                          value={qtys[q.supplierId] ?? ''}
                          onChange={(e) => onQtyChange(q.supplierId, e.target.value)}
                          aria-label={t('fc.pti.gaps.move.qtyFor', { supplier: q.supplierName })}
                          aria-describedby={over ? warnId : undefined}
                          data-testid={`fc-move-qty-${q.supplierId}`}
                        />
                        <span
                          className="text-xs text-text-secondary"
                          data-testid={`fc-move-unit-${q.supplierId}`}
                        >
                          {unit}
                        </span>
                      </div>
                      {over ? (
                        <p
                          id={warnId}
                          className="text-xs text-warning-hover mt-1"
                          data-testid={`fc-move-warn-${q.supplierId}`}
                        >
                          {t('fc.pti.gaps.move.aboveHeadroom', {
                            qty: qtyText(/** @type {number} */ (headroom)),
                            unit
                          })}
                        </p>
                      ) : null}
                    </td>
                    <td
                      className="py-2 text-right"
                      data-testid={`fc-move-headroom-${q.supplierId}`}
                    >
                      <Data>
                        {headroom === null ? t('sdc.empty.dash') : `${qtyText(headroom)} ${unit}`}
                      </Data>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="text-sm text-text-secondary mt-2" data-testid="fc-move-total">
            {t('fc.pti.gaps.move.moving')} <Data>{`${qtyText(move.total)} ${unit}`}</Data> ·{' '}
            {t('fc.pti.gaps.move.remaining')} <Data>{`${qtyText(move.remaining)} ${unit}`}</Data>
          </p>
          {refusal !== null ? (
            <p
              id="fc-reassign-why"
              data-testid="fc-move-refusal"
              className={refusal.shown ? 'text-sm text-danger mt-1' : 'sr-only'}
            >
              {refusal.text}
            </p>
          ) : null}
          <p id="fc-reassign-hint" className="text-xs text-text-tertiary mt-1">
            {t('fc.pti.gaps.panel.reassignHint')}
          </p>
        </div>
      ) : null}
      {action.kind !== 'accept' && (
        <div>
          <label htmlFor="fc-action-note" className={labelClass}>
            {t('fc.pti.gaps.panel.note')}
          </label>
          <textarea
            id="fc-action-note"
            rows={4}
            className={fieldClass}
            value={note}
            onChange={(e) => onNoteChange(e.target.value)}
            aria-describedby="fc-action-note-hint"
          />
          <p id="fc-action-note-hint" className="text-xs text-text-tertiary mt-1">
            {t('fc.pti.gaps.panel.noteHint')}
          </p>
        </div>
      )}
    </div>
  );
};

export default ActionPanelBody;
