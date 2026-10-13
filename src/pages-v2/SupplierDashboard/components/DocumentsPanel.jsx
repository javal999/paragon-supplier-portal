/** @import React from 'react' */
/** @import { TFunction } from 'i18next' */
/** @import { useToast } from '@hooks/useToast' */
/** @import { SupplierDocument } from '@services/data/types' */
import { FileText, ChevronRight } from 'lucide-react';
import StatusPill from '@components/ui-v2/StatusPill';
import Button from '@components/ui-v2/Button';
import {
  documentDisplayState,
  DISPLAY_STATE_LABEL_KEY,
  DISPLAY_STATE_TONE,
  DISPLAY_STATE_ACTION_KEY
} from '@services/data/documentDisplayState';
import { fmtDate } from '../utils';

// ⚠️ **`DOC_STATUS_TONE` AND `DOC_STATUS_ACTION_KEY` ARE BOTH GONE, AND THE
// ACTION MAP IS THE ONE THAT MATTERED.** A badge that computes beside a label
// that does not is the same split one field over: this page would have shown
// a computed state next to a stored verb, and the verb is the half a supplier
// acts on. Both now come from `documentDisplayState`'s maps.
//
// ⚠️ **ONE TONE CHANGED, DELIBERATELY, AND IT IS NOT A DP-2 DECISION.**
// `'Awaiting Upload'` was `danger` here and `neutral` on
// `/supplier/documents` — the same state, two colours, one persona. The
// shared map cannot hold both, so the page's reading wins: a document nobody
// has supplied yet is not a failure, and `Rejected` is what red is for on
// this surface.
//
// ⚠️ **AND IT IS LATENT, NOT VISIBLE — A FIRST DRAFT OF THIS NOTE CLAIMED
// THE A/B WOULD SHOW IT, AND THE BROWSER PASS SAID OTHERWISE.** The tile
// below slices to the first four documents and the only `Awaiting Upload`
// row in the fixture is the sixth, so the changed tone renders nowhere
// today. It becomes visible the moment the slice, the ordering or the
// fixture moves. Recorded as latent because a colour change nobody can see
// is still a colour change, and the next person to widen that slice should
// not discover it as a surprise.

/**
 * @typedef {object} DocumentsPanelProps
 * @property {SupplierDocument[]} documents  The first four documents (sliced by the page).
 * @property {string} nowIso  The page's single clock instant for the display state.
 * @property {ReturnType<typeof useToast>['toast']} toast
 * @property {TFunction} t
 */

/**
 * The documents tile: each document's computed display state, expiry line and
 * the state's action button (toast only). Moved out of `SupplierDashboard.jsx`
 * by the Phase 5 page split (no behaviour change).
 * @type {React.FC<DocumentsPanelProps>}
 */
const DocumentsPanel = ({ documents, nowIso, toast, t }) => (
  <section className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm p-5">
    <h2 className="text-section text-text-primary mb-4">{t('supplierDashboard.docs.title')}</h2>
    <div className="flex flex-col">
      {documents.map((doc, idx) => {
        const display = documentDisplayState(doc, nowIso);
        const action = t(DISPLAY_STATE_ACTION_KEY[display]);
        return (
          <div
            key={doc.id}
            className={`flex items-center justify-between gap-3 py-3 ${
              idx < documents.length - 1 ? 'border-b border-border-subtle' : ''
            }`}
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                <FileText size={12} className="text-text-tertiary" />
                <span className="text-sm font-semibold text-text-primary">{doc.name}</span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <StatusPill variant={DISPLAY_STATE_TONE[display]}>
                  {t(DISPLAY_STATE_LABEL_KEY[display])}
                </StatusPill>
                <span className="text-xs text-text-tertiary">
                  {doc.expiryDate
                    ? t('supplierDashboard.docs.exp', {
                        date: fmtDate(doc.expiryDate)
                      })
                    : t('supplierDashboard.docs.noExpiry')}
                </span>
              </div>
            </div>
            <Button
              variant="secondary"
              onClick={() =>
                toast({
                  title: t('supplierDashboard.docs.toast.title', {
                    action,
                    name: doc.name
                  }),
                  description: t('supplierDashboard.docs.toast.desc')
                })
              }
            >
              {action}
              <ChevronRight size={14} />
            </Button>
          </div>
        );
      })}
    </div>
  </section>
);

export default DocumentsPanel;
