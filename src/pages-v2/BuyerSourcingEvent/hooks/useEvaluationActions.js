/** @import { RFQ } from '@data/mockRfqs' */
/** @import { PinDraft } from '../../BuyerSourcing/const' */
import { useTranslation } from 'react-i18next';
import { useToast } from '@hooks/useToast';
import { useRefusalText } from '@hooks/useRefusalText';
import { useRfqFxPin, useQuotationReview } from '@services/query/commandHooks';
import { readFxRate, readFxVintage } from '../../sourcing/fxRateInput';

/**
 * RFx UX B-02 (owner ruling 2026-10-19) — the evaluation acts the board's side
 * panel used to carry, moved to the event page with their verbs and toasts
 * unchanged: record or supersede an FX pin (`t_rfq_fx_pin`) and move a quote to
 * review (`t_quotation_review`). Moved out of `useRfqPanelActions`.
 * @param {{
 *   selectedRfq: RFQ | null;
 *   pinDraft: PinDraft | null;
 *   setPinDraft: (d: PinDraft | null) => void;
 * }} args
 */
export const useEvaluationActions = ({ selectedRfq, pinDraft, setPinDraft }) => {
  const { toast } = useToast();
  const { t } = useTranslation();
  const refusalText = useRefusalText();
  const reviewMutation = useQuotationReview();
  const fxPinMutation = useRfqFxPin();

  // 2e-c-4 — record (or supersede) the FX basis. The rate and the vintage are
  // both read ONCE here, through the pure gates, and the parsed values are what
  // the dispatch carries: the number the buyer confirmed is the number that
  // lands on the ledger, with no second reading to disagree with it.
  const handlePinConfirm = () => {
    if (!selectedRfq || !pinDraft) return;
    const rate = readFxRate(pinDraft.rate);
    const vintage = readFxVintage(pinDraft.asOf);
    // The dialog's own button is already disabled on a refusal; this is the
    // structural twin, so a keyboard or a future caller cannot route around it.
    if (!rate.ok || !vintage.ok) return;
    const currency = pinDraft.currency;
    const superseding = Boolean(pinDraft.superseding);
    fxPinMutation.mutate(
      {
        rfqId: selectedRfq.id,
        quote: currency,
        rate: rate.value,
        asOf: vintage.value,
        source: pinDraft.source,
        ...(pinDraft.rateType.trim() ? { rateType: pinDraft.rateType.trim() } : {})
      },
      {
        onSuccess: (result) => {
          if (result.status === 'failed') {
            toast({
              variant: 'error',
              title: t('sourcing.toast.fxPinFailed.title'),
              description:
                refusalText(result.reason) ??
                result.reason ??
                t('sourcing.toast.fxPinFailed.default')
            });
            return;
          }
          setPinDraft(null);
          // Two distinct messages, because they are two distinct acts. A
          // supersede says the prior basis is KEPT — the buyer has not erased
          // anything, and the trail will show both.
          toast({
            variant: 'success',
            title: t(
              superseding ? 'sourcing.toast.fxSuperseded.title' : 'sourcing.toast.fxPinned.title',
              { currency }
            ),
            description: t(
              superseding ? 'sourcing.toast.fxSuperseded.desc' : 'sourcing.toast.fxPinned.desc'
            )
          });
        },
        onError: () =>
          toast({
            variant: 'error',
            title: t('sourcing.toast.fxPinFailed.title'),
            description: t('sourcing.toast.fxPinFailed.default')
          })
      }
    );
  };

  // Move a submitted quote into evaluation (fires t_quotation_review, Submitted →
  // Under Review). No cascade, no artifact — a buyer-side lifecycle advance. On a
  // non-failed outcome the quotation reads re-derive and the pill flips in place.
  /** @param {string} quotationId */
  const handleReview = (quotationId) => {
    reviewMutation.mutate(
      { quotationId },
      {
        onSuccess: (result) => {
          if (result.status === 'failed') {
            toast({
              variant: 'error',
              title: t('sourcing.toast.reviewFailed.title'),
              description:
                refusalText(result.reason) ??
                result.reason ??
                t('sourcing.toast.reviewFailed.default')
            });
            return;
          }
          toast({
            variant: 'success',
            title: t('sourcing.toast.reviewed.title'),
            description: t('sourcing.toast.reviewed.desc')
          });
        },
        onError: () =>
          toast({
            variant: 'error',
            title: t('sourcing.toast.reviewFailed.title'),
            description: t('sourcing.toast.reviewFailed.default')
          })
      }
    );
  };

  return { handlePinConfirm, handleReview, reviewMutation, fxPinMutation };
};
