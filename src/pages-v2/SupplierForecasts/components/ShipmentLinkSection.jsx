/** @import React from 'react' */
import { useTranslation } from 'react-i18next';
import FormSection from '@components/ui-v2/FormSection';
import Data from '@components/ui-v2/Data';
/** @import { ASN } from '@services/data/types' */
/** @import { ShipmentForm } from '../const' */
import { inputClass, labelClass } from '../const';

/**
 * The direction-dependent part of the shipment report panel. A to-paragon leg
 * links one of the supplier's OWN ASNs (selected, never free-typed) and echoes
 * the AWB it carries; a principal-to-distributor leg takes an optional carrier
 * AWB and no ASN. Renders nothing until a direction is chosen.
 *
 * `onSelectAsn` sets the link and the echoed AWB; `form` / `setForm` are the
 * workspace's shipment form.
 * @type {React.FC<{ form: ShipmentForm; setForm: React.Dispatch<React.SetStateAction<ShipmentForm>>; ownAsns: readonly ASN[]; onSelectAsn: (asnNumber: string) => void; }>}
 */
const ShipmentLinkSection = ({ form: shipForm, setForm: setShipForm, ownAsns, onSelectAsn }) => {
  const { t } = useTranslation();
  return (
    <>
      {/* to-paragon: link an OWN ASN (asnRef resolves server-side, never
          free-typed). p2d: an optional carrier AWB, no ASN. */}
      {shipForm.direction === 'to-paragon' && (
        <FormSection
          eyebrow={t('sdcSup.ship.panel.link.eyebrow')}
          title={t('sdcSup.ship.panel.link.title')}
          description={t('sdcSup.ship.panel.link.desc')}
        >
          <div>
            <label className={labelClass} htmlFor="sdcsup-ship-asn">
              {t('sdcSup.ship.panel.asnLabel')}
            </label>
            {ownAsns.length === 0 ? (
              <p className="text-xs italic text-text-tertiary">{t('sdcSup.ship.panel.noAsns')}</p>
            ) : (
              <select
                id="sdcsup-ship-asn"
                value={shipForm.asnRef}
                onChange={(e) => onSelectAsn(e.target.value)}
                className={inputClass}
              >
                <option value="">{t('sdcSup.ship.panel.asnSelect')}</option>
                {ownAsns.map((a) => (
                  <option key={a.asnNumber} value={a.asnNumber}>
                    {a.asnNumber} · {a.status} · {a.trackingNumber}
                  </option>
                ))}
              </select>
            )}
          </div>
          {shipForm.awb && (
            <div className="text-xs text-text-secondary">
              {t('sdcSup.ship.panel.awbEcho')}{' '}
              <Data as="strong" className="text-text-primary">
                {shipForm.awb}
              </Data>
            </div>
          )}
        </FormSection>
      )}
      {shipForm.direction === 'principal-to-distributor' && (
        <FormSection
          eyebrow={t('sdcSup.ship.panel.link.eyebrow')}
          title={t('sdcSup.ship.panel.awbTitle')}
          description={t('sdcSup.ship.panel.awbDesc')}
        >
          <div>
            <label className={labelClass} htmlFor="sdcsup-ship-awb">
              {t('sdcSup.ship.panel.awbLabel')}
            </label>
            <input
              id="sdcsup-ship-awb"
              type="text"
              placeholder="e.g. AWB-88231145"
              value={shipForm.awb}
              onChange={(e) => setShipForm({ ...shipForm, awb: e.target.value })}
              className={inputClass}
            />
          </div>
        </FormSection>
      )}
    </>
  );
};

export default ShipmentLinkSection;
