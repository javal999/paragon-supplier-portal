/** @import React from 'react' */
/** @import { TFunction } from 'i18next' */
/** @import { useRenewalRequest } from '../hooks/useRenewalRequest' */
import Data from '@components/ui-v2/Data';
import { certTypeLabelKey } from '@lib/complianceView';

/**
 * @typedef {object} RenewalAskPanelProps
 * @property {ReturnType<typeof useRenewalRequest>} renewal The ask's row, note and setter.
 * @property {TFunction} t
 */

/**
 * UCX-P5 · UCX-F31 — the renewal ask's body: the supplier and the kind taken
 * from the EXPIRING ROW and shown read-only, then the reason, which starts
 * composed from the row and stays editable. The footer (Cancel / Open the
 * request) is mounted by the page, inside the same authority guard as the
 * generic request panel.
 * @type {React.FC<RenewalAskPanelProps>}
 */
const RenewalAskPanel = ({ renewal, t }) => {
  const { askRow, note, setNote } = renewal;
  if (!askRow) return null;
  const { entry } = askRow;
  return (
    <div className="space-y-5" data-testid="renewal-ask">
      <p className="text-sm text-text-secondary">{t('compliance.renewal.lead')}</p>

      <div>
        <span className="block text-label text-text-tertiary uppercase mb-1">
          {t('compliance.request.field.supplier')}
        </span>
        <div className="text-sm text-text-primary font-semibold" data-testid="renewal-supplier">
          {/* i18n-defer: mock/sample data (supplier name) */}
          {entry.supplierName}{' '}
          <Data className="text-xs text-text-tertiary">{entry.supplierId}</Data>
        </div>
        <span className="block text-xs text-text-tertiary mt-1">
          {t('compliance.renewal.fromRow')}
        </span>
      </div>

      <div>
        <span className="block text-label text-text-tertiary uppercase mb-1">
          {t('compliance.request.field.category')}
        </span>
        <div className="text-sm text-text-primary" data-testid="renewal-kind">
          {t(certTypeLabelKey(entry.certType))}
        </div>
        <span className="block text-xs text-text-tertiary mt-1">
          {t('compliance.renewal.fromRow')}
        </span>
      </div>

      <label className="block">
        <span className="block text-label text-text-tertiary uppercase mb-1">
          {t('compliance.request.field.note')}
        </span>
        <textarea
          rows={3}
          data-testid="renewal-note"
          className="w-full px-3 py-2 text-sm text-text-primary bg-white border border-border-input rounded-md focus:outline-none focus:border-action placeholder:text-text-tertiary"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <span className="block text-xs text-text-tertiary mt-1">
          {t('compliance.request.field.noteHint')}
        </span>
      </label>
    </div>
  );
};

export default RenewalAskPanel;
