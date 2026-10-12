/** @import React from 'react' */
/** @import { TFunction } from 'i18next' */
/** @import { PurchaseRequisition } from '@services/data/types' */
import Data from '@components/ui-v2/Data';

/**
 * @typedef {object} SourceAndJustificationProps
 * @property {PurchaseRequisition} selectedPR The live row the detail panel shows.
 * @property {TFunction} t
 */

/**
 * The last two sections of the detail panel: source of supply (whether a
 * purchasing info record exists, plus the linked document when there is one)
 * and the requester's justification. Moved out of `BuyerRequisitions.jsx` by
 * the Phase 5 page split (no behaviour change).
 * @type {React.FC<SourceAndJustificationProps>}
 */
const SourceAndJustification = ({ selectedPR, t }) => (
  <>
    <section>
      <h3 className="text-label text-text-tertiary uppercase mb-3">
        {t('requisitions.panel.source.title')}
      </h3>
      <div
        className={`border-l-2 rounded px-3 py-3 text-sm ${
          selectedPR.sourceOfSupply === 'PIR exists'
            ? 'bg-success-soft border-success text-success'
            : 'bg-warning-soft border-warning text-warning-hover'
        }`}
      >
        <div className="font-semibold">
          {selectedPR.sourceOfSupply === 'PIR exists'
            ? t('requisitions.panel.source.found')
            : t('requisitions.panel.source.none')}
        </div>
        <div className="text-text-secondary mt-1">
          {selectedPR.sourceOfSupply === 'PIR exists'
            ? t('requisitions.panel.source.pirExists', { material: selectedPR.material })
            : t('requisitions.panel.source.noPir', { material: selectedPR.material })}
        </div>
      </div>
      {selectedPR.linkedDoc && (
        <div className="mt-3 text-sm text-text-secondary">
          {t('requisitions.panel.linkedDocument')}{' '}
          <Data className="text-text-primary">{selectedPR.linkedDoc}</Data>
        </div>
      )}
    </section>

    <section>
      <h3 className="text-label text-text-tertiary uppercase mb-2">
        {t('requisitions.panel.justification')}
      </h3>
      <p className="text-sm text-text-secondary leading-relaxed">{selectedPR.justification}</p>
    </section>
  </>
);

export default SourceAndJustification;
