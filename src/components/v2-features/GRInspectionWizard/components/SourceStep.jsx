/** @import * as React from 'react' */
import { useTranslation } from 'react-i18next';
import Data from '../../../ui-v2/Data';
import { labelFor, inputCls } from './fieldParts';
/** @import { ASN } from '@services/data/types' */
/** @import { GrSource, LineDraft, SourceMode } from '../utils' */

/**
 * @typedef {object} SourceStepProps
 * @property {SourceMode} sourceMode
 * @property {(mode: SourceMode) => void} setSourceMode
 * @property {GrSource[]} sources -  Receivable sources: shipments at dock ∪ live receivable ASNs.
 * @property {string} selectedSourceId
 * @property {(id: string) => void} setSelectedSourceId
 * @property {(lines: LineDraft[]) => void} setLines -  Picking a dock source replaces the drafted lines with that source's.
 * @property {string} manualASN
 * @property {(value: string) => void} setManualASN
 * @property {boolean} manualNotFound
 * @property {ASN | undefined} manualAsnMatch
 */

/**
 * Step 1 — pick the GR source: a shipment at the dock, or an ASN number typed
 * by hand and resolved against the live ASNs.
 * @type {React.FC<SourceStepProps>}
 */
const SourceStep = ({
  sourceMode,
  setSourceMode,
  sources,
  selectedSourceId,
  setSelectedSourceId,
  setLines,
  manualASN,
  setManualASN,
  manualNotFound,
  manualAsnMatch
}) => {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setSourceMode('shipment')}
          className={`flex-1 rounded-md border px-4 py-3 text-sm font-medium transition-colors ${
            sourceMode === 'shipment'
              ? 'border-action bg-action-soft text-action-hover'
              : 'border-border-input text-text-secondary hover:bg-bg-hover'
          }`}
        >
          {t('goodsReceipt.wizard.source.selectDock')}
        </button>
        <button
          type="button"
          onClick={() => setSourceMode('manual')}
          className={`flex-1 rounded-md border px-4 py-3 text-sm font-medium transition-colors ${
            sourceMode === 'manual'
              ? 'border-action bg-action-soft text-action-hover'
              : 'border-border-input text-text-secondary hover:bg-bg-hover'
          }`}
        >
          {t('goodsReceipt.wizard.source.enterAsn')}
        </button>
      </div>

      {sourceMode === 'shipment' ? (
        <div className="border border-border-subtle rounded-lg divide-y divide-border-subtle">
          {sources.length === 0 && (
            <div className="p-4 text-sm text-text-tertiary">
              {t('goodsReceipt.wizard.source.empty')}
            </div>
          )}
          {sources.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                setSelectedSourceId(s.id);
                setLines(s.lines);
              }}
              className={`w-full flex items-center justify-between gap-4 px-4 py-3 text-left transition-colors ${
                selectedSourceId === s.id ? 'bg-action-soft' : 'hover:bg-bg-hover'
              }`}
            >
              <div>
                <div className="font-semibold text-text-primary">
                  <Data>{s.asnNumber}</Data>
                </div>
                <div className="text-xs text-text-tertiary">
                  <Data>{s.poNumber}</Data> · {s.supplierName}
                </div>
              </div>
              <div className="text-right text-xs text-text-secondary">
                <div>{s.dockLabel}</div>
                <div className="text-text-tertiary">{s.dockTime}</div>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <label className="block">
            {labelFor(t('goodsReceipt.wizard.field.asnNumber'))}
            <input
              type="text"
              value={manualASN}
              onChange={(e) => setManualASN(e.target.value)}
              placeholder="ASN-2026-XXX"
              className={inputCls}
            />
          </label>
          {manualNotFound && (
            <p className="text-xs text-danger">{t('goodsReceipt.wizard.source.notFound')}</p>
          )}
          {manualAsnMatch && (
            <p className="text-xs text-success">
              {manualAsnMatch.asnNumber} · {manualAsnMatch.poReference} — {manualAsnMatch.status}.{' '}
              {t('goodsReceipt.wizard.source.readyToReceive')}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default SourceStep;
