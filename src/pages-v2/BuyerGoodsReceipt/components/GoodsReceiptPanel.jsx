/** @import React from 'react' */
/** @import { TFunction } from 'i18next' */
/** @import { useEnumLabel } from '@hooks/useEnumLabel' */
/** @import { compareReceipt } from '@services/transitions/fulfilmentRules' */
/** @import { NextAct } from '@services/transitions/nextAct' */
/** @import { GoodsReceipt, Supplier } from '@services/data/types' */
import SidePanel from '@components/ui-v2/SidePanel';
import Timeline from '@components/ui-v2/Timeline';
import { buildTimeline } from '../utils';
import GrKeyFacts from './GrKeyFacts';
import GrLineItems from './GrLineItems';

/**
 * @typedef {object} GoodsReceiptPanelProps
 * @property {GoodsReceipt | null} selected The open GR; the panel is closed when null.
 * @property {Supplier | undefined} selectedSupplier
 * @property {ReturnType<typeof compareReceipt>} selectedChecks
 * @property {NextAct | null} nextAct
 * @property {React.ReactNode} footerActions The status footer (`footerForStatus`).
 * @property {() => void} onClose
 * @property {TFunction} t
 * @property {ReturnType<typeof useEnumLabel>} el
 */

/**
 * The GR side panel: key facts, line items with quantity checks, inspection
 * notes when there are any, and the disposition workflow timeline. Moved out
 * of `BuyerGoodsReceipt.jsx` by the Phase 5 page split (no behaviour change).
 * @type {React.FC<GoodsReceiptPanelProps>}
 */
const GoodsReceiptPanel = ({
  selected,
  selectedSupplier,
  selectedChecks,
  nextAct,
  footerActions,
  onClose,
  t,
  el
}) => (
  <SidePanel
    open={!!selected}
    onClose={onClose}
    title={selected ? selected.grNumber : ''}
    footerActions={footerActions}
  >
    {selected && (
      <div className="flex flex-col gap-6">
        <GrKeyFacts
          selected={selected}
          selectedSupplier={selectedSupplier}
          nextAct={nextAct}
          t={t}
          el={el}
        />

        <GrLineItems selected={selected} selectedChecks={selectedChecks} t={t} />

        {selected.notes && (
          <section>
            <div className="text-label text-text-tertiary uppercase mb-2">
              {t('goodsReceipt.panel.inspectionNotes')}
            </div>
            <p className="text-sm text-text-secondary border border-border-subtle rounded-md p-3 bg-bg-hover">
              {selected.notes}
            </p>
          </section>
        )}

        <section>
          <div className="text-label text-text-tertiary uppercase mb-2">
            {t('goodsReceipt.panel.dispositionWorkflow')}
          </div>
          <Timeline events={buildTimeline(selected, t, el)} />
        </section>
      </div>
    )}
  </SidePanel>
);

export default GoodsReceiptPanel;
