/** @import React from 'react' */
/** @import { TFunction } from 'i18next' */
/** @import { PurchaseOrder } from '@services/data/types' */
/** @import { useNextAct, useVerbAvailability } from '@hooks/useVerbAvailability' */
/** @import { usePurchaseOrderAcceptCounter, usePurchaseOrderRejectCounter } from '@services/query/commandHooks' */
import Button from '@components/ui-v2/Button';
import SidePanel from '@components/ui-v2/SidePanel';
import Timeline from '@components/ui-v2/Timeline';
import { POStatus } from '@services/data/types';
import {
  PoLifecycleSteps,
  PoResponseDetails,
  RespondByLine,
  ShippingNoticeDetails
} from '../../orders/PoCollaboration';
import { FOOTER_ACTION_KEY } from '../const';
import { buildTimeline } from '../utils';
import PoKeyFacts from './PoKeyFacts';
import PoCounterReview from './PoCounterReview';
import PoLineItems from './PoLineItems';
import PoComms from './PoComms';

/**
 * @typedef {object} PoPanelProps
 * @property {PurchaseOrder | null} selectedPO  The PO the panel is open on; `null` closes it.
 * @property {PurchaseOrder | null} livePO  The same PO's live row, so the panel follows a review.
 * @property {() => void} closePanel  Closes the panel and resets its state.
 * @property {string} panelTitle
 * @property {string} nowIso  The orders clock.
 * @property {ReturnType<typeof useNextAct>} nextAct  Who acts next on the PO.
 * @property {(po: PurchaseOrder) => number} asnCountFor  Active ASNs against a PO.
 * @property {ReturnType<typeof useVerbAvailability>} reviewAvailability
 * @property {boolean} reviewRejecting
 * @property {(v: boolean) => void} setReviewRejecting
 * @property {string} reviewComment
 * @property {(v: string) => void} setReviewComment
 * @property {ReturnType<typeof usePurchaseOrderAcceptCounter>} acceptCounter
 * @property {ReturnType<typeof usePurchaseOrderRejectCounter>} rejectCounter
 * @property {(po: PurchaseOrder, titleKey: string) => {
 *   onSuccess: (result: { status: string; reason?: string }) => void;
 *   onError: () => void;
 * }} reviewOutcome  The toast + reset callbacks for a review command.
 * @property {boolean} commsOpen
 * @property {(update: (v: boolean) => boolean) => void} setCommsOpen
 * @property {TFunction} t
 */

/**
 * The PO side panel: footer actions, then key facts, respond-by line,
 * lifecycle steps, response details, the counter-offer review (adjusted POs),
 * shipping notices (confirmed onward), line items, the timeline and the
 * communication history. Moved out of `BuyerOrders.jsx` by the Phase 5 page
 * split (no behaviour change).
 * @type {React.FC<PoPanelProps>}
 */
const PoPanel = ({
  selectedPO,
  livePO,
  closePanel,
  panelTitle,
  nowIso,
  nextAct,
  asnCountFor,
  reviewAvailability,
  reviewRejecting,
  setReviewRejecting,
  reviewComment,
  setReviewComment,
  acceptCounter,
  rejectCounter,
  reviewOutcome,
  commsOpen,
  setCommsOpen,
  t
}) => (
  <SidePanel
    open={selectedPO !== null}
    onClose={closePanel}
    title={panelTitle}
    footerActions={
      selectedPO && (
        <>
          <Button variant="secondary">{t('buyerOrders.footer.viewFullDetails')}</Button>
          {FOOTER_ACTION_KEY[(livePO ?? selectedPO).status] && (
            <Button variant="outline">
              {t(/** @type {string} */ (FOOTER_ACTION_KEY[(livePO ?? selectedPO).status]))}
            </Button>
          )}
        </>
      )
    }
  >
    {selectedPO && (
      <div className="space-y-6">
        <PoKeyFacts
          selectedPO={selectedPO}
          livePO={livePO}
          nowIso={nowIso}
          nextAct={nextAct}
          t={t}
        />

        <RespondByLine po={livePO ?? selectedPO} nowIso={nowIso} />

        <PoLifecycleSteps
          persona="buyer"
          po={livePO ?? selectedPO}
          asnCount={asnCountFor(livePO ?? selectedPO)}
        />

        <PoResponseDetails po={livePO ?? selectedPO} />

        {(livePO ?? selectedPO).status === POStatus.ADJUSTED && (
          <PoCounterReview
            selectedPO={selectedPO}
            livePO={livePO}
            reviewAvailability={reviewAvailability}
            reviewRejecting={reviewRejecting}
            setReviewRejecting={setReviewRejecting}
            reviewComment={reviewComment}
            setReviewComment={setReviewComment}
            acceptCounter={acceptCounter}
            rejectCounter={rejectCounter}
            reviewOutcome={reviewOutcome}
            t={t}
          />
        )}

        {/* `as POStatus[]`: POStatus is a const object now, not an enum, so a literal array of
            its members narrows to those four and `includes` would refuse a wider status. */}
        {
          /** @type {POStatus[]} */ ([
            POStatus.CONFIRMED,
            POStatus.PARTIALLY_DELIVERED,
            POStatus.DELIVERED,
            POStatus.CLOSED
          ]).includes((livePO ?? selectedPO).status) && (
            <section>
              <h3 className="text-label text-text-tertiary uppercase mb-3">
                {t('oc.shipping.title')}
              </h3>
              <ShippingNoticeDetails po={livePO ?? selectedPO} />
            </section>
          )
        }

        <PoLineItems selectedPO={livePO ?? selectedPO} t={t} />

        <section>
          <h3 className="text-label text-text-tertiary uppercase mb-3">
            {t('buyerOrders.panel.lifecycle')}
          </h3>
          <Timeline events={buildTimeline(livePO ?? selectedPO, t)} />
        </section>

        <PoComms
          selectedPO={livePO ?? selectedPO}
          commsOpen={commsOpen}
          setCommsOpen={setCommsOpen}
          t={t}
        />
      </div>
    )}
  </SidePanel>
);

export default PoPanel;
