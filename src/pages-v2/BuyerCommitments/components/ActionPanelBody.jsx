/** @import React from 'react' */
import { useTranslation } from 'react-i18next';
import Data from '@components/ui-v2/Data';
import { formatDateTime } from '@lib/format';
import { labelClass } from '../../inventory/inventoryDisplay';
import { qtyText } from '../../forecasts/forecastDisplay';
import { fieldClass } from '../const';
/** @import { Action } from '../const' */

/**
 * The action panel's body: the line it acts on (supplier, material, period,
 * zone; forecast and commitment), the dispute log, the accept hint, the
 * reassignment target picker (reassign only) and the note (revise and
 * reassign).
 * @type {React.FC<{
 *   action: Action;
 *   note: string;
 *   onNoteChange: (note: string) => void;
 *   toSupplier: string;
 *   onToSupplierChange: (id: string) => void;
 *   periodLabel: (bucket: string) => string;
 * }>}
 */
const ActionPanelBody = ({
  action,
  note,
  onNoteChange,
  toSupplier,
  onToSupplierChange,
  periodLabel
}) => {
  const { t } = useTranslation();
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
      {action.line.log.length > 0 && (
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
        </ul>
      )}
      {action.kind === 'accept' && (
        <p className="text-sm text-text-secondary">{t('fc.pti.gaps.panel.acceptHint')}</p>
      )}
      {action.kind === 'reassign' && (
        <div>
          <label htmlFor="fc-reassign-to" className={labelClass}>
            {t('fc.pti.gaps.panel.toSupplier')}
          </label>
          <select
            id="fc-reassign-to"
            className={fieldClass}
            value={toSupplier}
            onChange={(e) => onToSupplierChange(e.target.value)}
            aria-describedby="fc-reassign-hint"
          >
            <option value="">{t('fc.pti.gaps.panel.chooseSupplier')}</option>
            {action.line.otherQualifiedSuppliers.map((q) => (
              <option key={q.supplierId} value={q.supplierId}>
                {q.supplierName}
              </option>
            ))}
          </select>
          <p id="fc-reassign-hint" className="text-xs text-text-tertiary mt-1">
            {t('fc.pti.gaps.panel.reassignHint')}
          </p>
          {toSupplier === '' ? (
            <span id="fc-reassign-why" className="sr-only">
              {t('fc.pti.gaps.panel.chooseSupplier')}
            </span>
          ) : null}
        </div>
      )}
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
