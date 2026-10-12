/** @import React from 'react' */
/** @import { TFunction } from 'i18next' */
/** @import { useEnumLabel } from '@hooks/useEnumLabel' */
/** @import { NextAct } from '@services/transitions/nextAct' */
/** @import { GoodsReceipt, Supplier } from '@services/data/types' */
import StatusPill from '@components/ui-v2/StatusPill';
import Data from '@components/ui-v2/Data';
import NextActLine from '@components/ui-v2/NextActLine';
import { COUNTRY_FLAG, STATUS_VARIANT } from '../const';
import { formatDate } from '../utils';

/**
 * @typedef {object} GrKeyFactsProps
 * @property {GoodsReceipt} selected The GR open in the side panel.
 * @property {Supplier | undefined} selectedSupplier Its supplier, for the country.
 * @property {NextAct | null} nextAct Who acts next on this GR (S2a).
 * @property {TFunction} t
 * @property {ReturnType<typeof useEnumLabel>} el Localizes the disposition token.
 */

/**
 * The side panel's key facts: GR, ASN, PO, SAP material document, supplier,
 * received date and receiver, status with the next-act line, disposition.
 * Moved out of `BuyerGoodsReceipt.jsx` by the Phase 5 page split (no
 * behaviour change).
 * @type {React.FC<GrKeyFactsProps>}
 */
const GrKeyFacts = ({ selected, selectedSupplier, nextAct, t, el }) => (
  <section>
    <div className="text-label text-text-tertiary uppercase mb-2">
      {t('goodsReceipt.panel.keyFacts')}
    </div>
    <div className="grid grid-cols-2 gap-3 text-sm">
      <div>
        <div className="text-xs text-text-tertiary">{t('goodsReceipt.panel.field.gr')}</div>
        <div className="font-semibold text-text-primary">
          <Data>{selected.grNumber}</Data>
        </div>
      </div>
      <div>
        <div className="text-xs text-text-tertiary">{t('goodsReceipt.panel.field.asn')}</div>
        <Data as="div" className="text-text-primary">
          {selected.asnNumber}
        </Data>
      </div>
      <div>
        <div className="text-xs text-text-tertiary">{t('goodsReceipt.panel.field.po')}</div>
        <Data as="div" className="text-text-primary">
          {selected.poNumber}
        </Data>
      </div>
      <div>
        <div className="text-xs text-text-tertiary">
          {t('goodsReceipt.panel.field.sapMaterialDoc')}
        </div>
        <Data as="div" className="text-text-primary">
          {selected.sapMaterialDoc ?? '—'}
        </Data>
      </div>
      <div className="col-span-2">
        <div className="text-xs text-text-tertiary">{t('goodsReceipt.panel.field.supplier')}</div>
        <div className="text-text-primary">
          {selected.supplierName}{' '}
          {selectedSupplier && (
            <span className="text-xs text-text-tertiary">
              · {COUNTRY_FLAG[selectedSupplier.country] ?? selectedSupplier.country}
            </span>
          )}
        </div>
      </div>
      <div>
        <div className="text-xs text-text-tertiary">
          {t('goodsReceipt.panel.field.receivedDate')}
        </div>
        <div className="text-text-primary">
          <Data>{formatDate(selected.receivedDate)}</Data>
        </div>
      </div>
      <div>
        <div className="text-xs text-text-tertiary">{t('goodsReceipt.panel.field.receivedBy')}</div>
        <div className="text-text-primary">{selected.receivedBy}</div>
      </div>
      <div>
        <div className="text-xs text-text-tertiary">{t('goodsReceipt.panel.field.status')}</div>
        <StatusPill variant={STATUS_VARIANT[selected.status]}>{selected.status}</StatusPill>
        <span className="mt-1 block">
          <NextActLine act={nextAct} testId="next-act-buyer-gr" />
        </span>
      </div>
      <div>
        <div className="text-xs text-text-tertiary">
          {t('goodsReceipt.panel.field.disposition')}
        </div>
        <div className="text-text-primary">{el(selected.disposition)}</div>
      </div>
    </div>
  </section>
);

export default GrKeyFacts;
