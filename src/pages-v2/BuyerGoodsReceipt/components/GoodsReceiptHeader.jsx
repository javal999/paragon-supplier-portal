/** @import React from 'react' */
/** @import { TFunction } from 'i18next' */
/** @import { VerbAvailability } from '@services/transitions/handoff' */
import { FileSpreadsheet, Plus, FlaskConical } from 'lucide-react';
import PageHeader from '@components/ui-v2/PageHeader';
import BulkActionsBar from '@components/ui-v2/BulkActionsBar';
import { HandoffNotice } from '@components/ui-v2/HandoffNotice';

/**
 * @typedef {object} GoodsReceiptHeaderProps
 * @property {TFunction} t
 * @property {VerbAvailability} grChainAvailability The seat's answer for the whole GR
 *   chain (§73); "New GR" renders only when it is held.
 * @property {() => void} onExport
 * @property {() => void} onLabResults
 * @property {() => void} onNewGR Opens the inspection wizard with no ASN chosen.
 */

/**
 * The page header: breadcrumb, title, the GR-chain handoff notice and the
 * Export / Lab results / New GR actions. Moved out of `BuyerGoodsReceipt.jsx`
 * by the Phase 5 page split (no behaviour change).
 * @type {React.FC<GoodsReceiptHeaderProps>}
 */
const GoodsReceiptHeader = ({ t, grChainAvailability, onExport, onLabResults, onNewGR }) => (
  <PageHeader
    breadcrumb={[t('goodsReceipt.crumb.transact'), t('goodsReceipt.crumb.gr')]}
    title={t('goodsReceipt.header.title')}
    subtitle={t('goodsReceipt.header.subtitle')}
    actions={
      // §73 — ONE NOTICE, AT THE ENTRY, AND THE MEASUREMENT IS WHY.
      // "New GR" opens a four-step wizard whose LAST step fires the whole
      // chain in one handler: t_gr_create -> t_gr_start_inspection ->
      // t_gr_post -> settle. There is ONE commit, not four, so there is one
      // place a handoff can honestly sit. Repeating the same string at each
      // step would teach nothing after the first.
      //
      // Guarded on ALL THREE atoms, not on the first: the button starts a
      // flow that cannot finish without every one of them. Today they agree
      // in every case (all three sit in `receiving` and nowhere else), so
      // this renders exactly one behaviour — and `grChainAgrees` in the spec
      // pins that agreement, so the day a bundle splits `gr:inspect` into a
      // QA role the suite says so instead of the button silently admitting
      // a seat the commit will refuse.
      <div className="flex items-center gap-3">
        <HandoffNotice availability={grChainAvailability} testId="handoff-gr-create" />
        <BulkActionsBar
          actions={[
            {
              label: t('goodsReceipt.action.export'),
              icon: FileSpreadsheet,
              onClick: onExport
            },
            {
              label: t('goodsReceipt.action.labResults'),
              icon: FlaskConical,
              onClick: onLabResults
            }
          ]}
          {...(grChainAvailability.kind === 'held'
            ? {
                primary: {
                  label: t('gr.create.action'),
                  icon: Plus,
                  onClick: onNewGR
                }
              }
            : {})}
        />
      </div>
    }
  />
);

export default GoodsReceiptHeader;
