/** @import React from 'react' */
import { useTranslation } from 'react-i18next';
import Data from '@components/ui-v2/Data';
/** @import { ASN } from '@services/data/types' */
import { PicCell, PicHeader } from '../../materials/picDisplay';
import { BlockedStockMarker, approvedIntoBlockedStock } from '../../shipments/ShelfLifeParts';
import { fmtDate } from '../utils';
import { qty } from '../../callOffs/callOffDisplay';

/**
 * The expanded ASN's line-items card: material, PIC, ordered and shipped
 * quantity (short shipments in warning text), lot and expiry, with the
 * blocked-stock marker on a line approved into blocked stock.
 * @type {React.FC<{ asn: ASN }>}
 */
const AsnDetailLines = ({ asn }) => {
  const { t } = useTranslation();
  return (
    <div className="bg-bg-surface border border-border-subtle rounded-md p-4">
      <div className="text-label text-text-tertiary uppercase mb-3">
        {t('supplierShipments.detail.lineItems', {
          count: asn.lineItems.length
        })}
      </div>
      {asn.lineItems.length === 0 ? (
        <div className="text-xs text-text-tertiary">
          {t('supplierShipments.detail.noLineItems')}
        </div>
      ) : (
        <table className="w-full text-xs">
          <thead>
            <tr className="text-text-tertiary uppercase">
              <th className="text-left py-1">{t('supplierShipments.lineItems.col.material')}</th>
              <th className="text-left py-1">
                <PicHeader />
              </th>
              <th className="text-right py-1">{t('supplierShipments.lineItems.col.ordered')}</th>
              <th className="text-right py-1">{t('supplierShipments.lineItems.col.shipped')}</th>
              <th className="text-right py-1">{t('supplierShipments.lineItems.col.lot')}</th>
              <th className="text-right py-1">{t('fc.asn.col.expiryShort')}</th>
            </tr>
          </thead>
          <tbody>
            {asn.lineItems.map((li) => {
              const short = li.shippedQty < li.orderedQty;
              return (
                <tr key={li.materialCode} className="border-t border-border-subtle">
                  <td className="py-1.5">
                    <Data as="div" className="text-[length:var(--fs-caption-1)] text-text-tertiary">
                      {li.materialCode}
                    </Data>
                    {/* i18n-defer: mock/sample data (material description) */}
                    <div className="text-text-primary">{li.description}</div>
                  </td>
                  <td className="py-1.5">
                    <PicCell
                      value={li.mrpController}
                      testId={`asn-line-pic-${asn.asnNumber}-${li.materialCode}`}
                    />
                  </td>
                  <td className="py-1.5 text-right text-text-secondary">
                    <Data>{qty(li.orderedQty)}</Data>
                  </td>
                  <td
                    className={`py-1.5 text-right font-semibold ${short ? 'text-warning-hover' : 'text-text-primary'}`}
                  >
                    <Data>{qty(li.shippedQty)}</Data>
                  </td>
                  <td className="py-1.5 text-right text-text-tertiary">
                    <Data>{li.lotNumber}</Data>
                  </td>
                  <td className="py-1.5 text-right text-text-tertiary">
                    <Data>{li.expiryDate ? fmtDate(li.expiryDate) : '—'}</Data>
                    {approvedIntoBlockedStock(asn, li) ? (
                      <div className="mt-1">
                        <BlockedStockMarker
                          testId={`asn-line-blocked-${asn.asnNumber}-${li.materialCode}`}
                        />
                      </div>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default AsnDetailLines;
