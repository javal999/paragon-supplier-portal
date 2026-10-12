/** @import React from 'react' */
/** @import { TFunction } from 'i18next' */
/** @import { useDocumentRequest } from '../hooks/useDocumentRequest' */
import Button from '@components/ui-v2/Button';

/**
 * @typedef {object} RequestPanelFooterProps
 * @property {ReturnType<typeof useDocumentRequest>} requester The request panel's confirming / busy /
 *   complete state, its setter and `runRequest`.
 * @property {TFunction} t
 */

/**
 * The request panel's footer: Review (enabled once every field is stated) on
 * the form, then Back and Send on the confirm step. Moved out of
 * `BuyerCompliance.jsx` by the Phase 5 page split (no behaviour change).
 * @type {React.FC<RequestPanelFooterProps>}
 */
const RequestPanelFooter = ({ requester, t }) => {
  const { reqConfirming, setReqConfirming, reqBusy, reqComplete, runRequest } = requester;
  return reqConfirming ? (
    <>
      <Button variant="secondary" onClick={() => setReqConfirming(false)} disabled={reqBusy}>
        {t('compliance.request.action.back')}
      </Button>
      <Button
        variant="outline"
        data-testid="doc-request-commit"
        disabled={!reqComplete || reqBusy}
        onClick={() => {
          void runRequest();
        }}
      >
        {t('compliance.request.action.send')}
      </Button>
    </>
  ) : (
    <Button
      variant="outline"
      data-testid="doc-request-review"
      disabled={!reqComplete}
      onClick={() => setReqConfirming(true)}
    >
      {t('compliance.request.action.review')}
    </Button>
  );
};

export default RequestPanelFooter;
