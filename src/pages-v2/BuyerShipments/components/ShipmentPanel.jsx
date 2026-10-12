/** @import React from 'react' */
/** @import { TFunction } from 'i18next' */
/** @import { Shipment } from '@data/mockShipments' */
/** @import { ASN, Supplier } from '@services/data/types' */
/** @import { ShipmentDisplayState } from '@services/data/shipmentDisplayState' */
/** @import { useModeLabel } from '@hooks/useModeLabel' */
/** @import { useNextAct } from '@hooks/useVerbAvailability' */
import SidePanel from '@components/ui-v2/SidePanel';
import NextActLine from '@components/ui-v2/NextActLine';
import Timeline from '@components/ui-v2/Timeline';
import { buildTimeline } from '../utils';
import ShipmentKeyFacts from './ShipmentKeyFacts';
import ShipmentLineItems from './ShipmentLineItems';

/**
 * @typedef {object} ShipmentPanelProps
 * @property {Shipment | null} selected  The open shipment; the panel is closed when null.
 * @property {Supplier | undefined} selectedSupplier
 * @property {readonly ASN[]} asns  Every ASN, for the tracking link (BL-51).
 * @property {ReturnType<typeof useNextAct>} nextAct  Who acts next, asked of the STORED state (S2a).
 * @property {React.ReactNode} footerActions  The status footer (`footerForStatus`).
 * @property {() => void} onClose
 * @property {(s: Shipment) => ShipmentDisplayState} displayOf  The page's one classification.
 * @property {ReturnType<typeof useModeLabel>} ml  The mode-label translator.
 * @property {TFunction} t
 */

/**
 * The shipment side panel: who acts next, key facts, line items and the
 * lifecycle timeline. Moved out of `BuyerShipments.jsx` by the Phase 5 page
 * split (no behaviour change).
 * @type {React.FC<ShipmentPanelProps>}
 */
const ShipmentPanel = ({
  selected,
  selectedSupplier,
  asns,
  nextAct,
  footerActions,
  onClose,
  displayOf,
  ml,
  t
}) => (
  <SidePanel
    open={!!selected}
    onClose={onClose}
    title={selected ? selected.asnNumber : ''}
    footerActions={footerActions}
  >
    {selected && (
      <div className="flex flex-col gap-6">
        <NextActLine act={nextAct} testId="next-act-buyer-shipment" />
        <ShipmentKeyFacts
          selected={selected}
          selectedSupplier={selectedSupplier}
          asns={asns}
          displayOf={displayOf}
          ml={ml}
          t={t}
        />

        <ShipmentLineItems selected={selected} t={t} />

        <section>
          <div className="text-label text-text-tertiary uppercase mb-2">
            {t('shipments.panel.lifecycle')}
          </div>
          <Timeline events={buildTimeline(selected, t, displayOf)} />
        </section>
      </div>
    )}
  </SidePanel>
);

export default ShipmentPanel;
