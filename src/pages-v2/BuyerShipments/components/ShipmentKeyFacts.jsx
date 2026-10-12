/** @import React from 'react' */
/** @import { TFunction } from 'i18next' */
/** @import { Shipment } from '@data/mockShipments' */
/** @import { ASN, Supplier } from '@services/data/types' */
/** @import { ShipmentDisplayState } from '@services/data/shipmentDisplayState' */
/** @import { useModeLabel } from '@hooks/useModeLabel' */
import Data from '@components/ui-v2/Data';
import TrackingNumber from '@components/ui-v2/TrackingNumber';
import { COUNTRY_FLAG } from '../const';
import { formatDate, formatNumber } from '../utils';

/**
 * @typedef {object} ShipmentKeyFactsProps
 * @property {Shipment} selected  The open shipment.
 * @property {Supplier | undefined} selectedSupplier  Its supplier, for the country.
 * @property {readonly ASN[]} asns  Every ASN, to find the 3PL link the shipment's ASN earns (BL-51).
 * @property {(s: Shipment) => ShipmentDisplayState} displayOf  The page's one classification.
 * @property {ReturnType<typeof useModeLabel>} ml  The mode-label translator.
 * @property {TFunction} t
 */

/**
 * The side panel's key-facts grid: ASN, PO, supplier, carrier, tracking,
 * mode, container, route, dates, packages, weight, dock. Moved out of
 * `BuyerShipments.jsx` by the Phase 5 page split (no behaviour change).
 * @type {React.FC<ShipmentKeyFactsProps>}
 */
const ShipmentKeyFacts = ({ selected, selectedSupplier, asns, displayOf, ml, t }) => (
  <section>
    <div className="text-label text-text-tertiary uppercase mb-2">
      {t('shipments.panel.keyFacts')}
    </div>
    <div className="grid grid-cols-2 gap-3 text-sm">
      <div>
        <div className="text-xs text-text-tertiary">{t('shipments.panel.asnNumber')}</div>
        <Data as="div" className="font-semibold text-text-primary">
          {selected.asnNumber}
        </Data>
      </div>
      <div>
        <div className="text-xs text-text-tertiary">{t('shipments.panel.poNumber')}</div>
        <Data as="div" className="text-text-primary">
          {selected.poNumber}
        </Data>
      </div>
      <div className="col-span-2">
        <div className="text-xs text-text-tertiary">{t('shipments.panel.supplier')}</div>
        {/* i18n-defer: mock/sample data — supplier proper noun */}
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
        <div className="text-xs text-text-tertiary">{t('shipments.panel.carrier')}</div>
        {/* i18n-defer: mock/sample data — carrier proper noun */}
        <div className="text-text-primary">{selected.carrier}</div>
      </div>
      <div>
        <div className="text-xs text-text-tertiary">{t('shipments.panel.trackingNumber')}</div>
        {/* BL-51 — a shipment carries no 3PL of its own: the link is the
            one its ASN earns, and only for the SAME tracking number. */}
        <div className="text-text-primary">
          <TrackingNumber
            threePlId={
              asns.find(
                (a) =>
                  a.asnNumber === selected.asnNumber && a.trackingNumber === selected.trackingNumber
              )?.threePlId
            }
            trackingNumber={selected.trackingNumber}
            testId="shipment-panel-tracking"
          />
        </div>
      </div>
      <div>
        <div className="text-xs text-text-tertiary">{t('shipments.panel.mode')}</div>
        <div className="text-text-primary">{ml(selected.mode)}</div>
      </div>
      <div>
        <div className="text-xs text-text-tertiary">{t('shipments.panel.containerNumber')}</div>
        <Data as="div" className="text-text-primary">
          {selected.containerNumber ?? '—'}
        </Data>
      </div>
      <div>
        <div className="text-xs text-text-tertiary">{t('shipments.panel.origin')}</div>
        {/* i18n-defer: mock/sample data — city proper noun */}
        <div className="text-text-primary">{selected.origin}</div>
      </div>
      <div>
        <div className="text-xs text-text-tertiary">{t('shipments.panel.destination')}</div>
        <div className="text-text-primary">{selected.destination}</div>
      </div>
      <div>
        <div className="text-xs text-text-tertiary">{t('shipments.panel.shipDate')}</div>
        <Data as="div" className="text-text-primary">
          {formatDate(selected.shipDate)}
        </Data>
      </div>
      <div>
        <div className="text-xs text-text-tertiary">{t('shipments.panel.eta')}</div>
        <Data
          as="div"
          className={
            displayOf(selected) === 'Delayed' ? 'text-danger font-semibold' : 'text-text-primary'
          }
        >
          {formatDate(selected.estimatedArrival)}
        </Data>
      </div>
      <div>
        <div className="text-xs text-text-tertiary">{t('shipments.panel.actualArrival')}</div>
        <Data as="div" className="text-text-primary">
          {formatDate(selected.actualArrival)}
        </Data>
      </div>
      <div>
        <div className="text-xs text-text-tertiary">{t('shipments.panel.packages')}</div>
        <Data as="div" className="text-text-primary">
          {formatNumber(selected.packageCount)}
        </Data>
      </div>
      <div>
        <div className="text-xs text-text-tertiary">{t('shipments.panel.totalWeight')}</div>
        <Data as="div" className="text-text-primary">
          {formatNumber(selected.totalWeight)} kg
        </Data>
      </div>
      <div className="col-span-2">
        <div className="text-xs text-text-tertiary">{t('shipments.panel.dock')}</div>
        <div className="text-text-primary">
          {selected.dockAssignment ?? t('shipments.panel.notScheduled')}
          {selected.dockTime ? ` · ${selected.dockTime}` : ''}
        </div>
      </div>
    </div>
  </section>
);

export default ShipmentKeyFacts;
