import { useState } from 'react';
/** @import { TFunction } from 'i18next' */
/** @import { UseToastReturn } from '@hooks/useToast' */
/** @import { SupplierDocumentCategory } from '@services/data/types' */
import { useSuppliers } from '@services/query/hooks';
import { useSupplierDocumentRequest } from '@services/query/commandHooks';
import { useVerbAvailability } from '@hooks/useVerbAvailability';
import { DataError } from '@services/data/types';

/**
 * The buyer's ask (§WAVE E): the `supplierdoc:request` availability, the
 * supplier roster, the request panel's open / confirming / busy state and its
 * three fields, and the runner that dispatches the request and toasts the
 * outcome. Called by the page so the panel's state lives as long as the page
 * does, exactly as it did before the split.
 * @param {TFunction} t  The page's translator, for the toasts.
 * @param {(reason: string | undefined) => string | null} refusalText  The page's refusal glossary (`useRefusalText()`).
 * @param {(code: string | undefined) => string | null} dataErrorText  The page's thrown-error glossary (`useDataErrorText()`).
 * @param {UseToastReturn['toast']} toast  The page's toast function.
 */
export function useDocumentRequest(t, refusalText, dataErrorText, toast) {
  // ── §WAVE E · THE BUYER'S ASK ──────────────────────────────────────────
  //
  // ⚠️ **ITS OWN SLOT, ITS OWN NOTICE (§76).** `supplierdoc:request` is a
  // separate atom from verify/reject and lives in the page HEADER, not on a
  // row — it acts on no document, it creates one. `IMPORTER-PRESENCE-IS-NOT-
  // VERB-COVERAGE-01` is exactly this shape one lane over: `BuyerRequisitions`
  // rendered four notices and still shipped an ungated CREATE verb in its
  // header, because every guarded verb there acted on a selected document.
  const request = useVerbAvailability('supplierdoc:request');
  const requestDoc = useSupplierDocumentRequest();
  const suppliersQuery = useSuppliers();
  const [requestOpen, setRequestOpen] = useState(false);
  const [reqSupplier, setReqSupplier] = useState('');
  const [reqCategory, setReqCategory] = useState(/** @type {SupplierDocumentCategory | ''} */ (''));
  const [reqNote, setReqNote] = useState('');
  const [reqConfirming, setReqConfirming] = useState(false);
  const [reqBusy, setReqBusy] = useState(false);

  const supplierOptions = suppliersQuery.data?.items ?? [];
  const reqSupplierName =
    supplierOptions.find((sup) => sup.id === reqSupplier)?.name ?? reqSupplier;
  // Every field the act commits must be stated before it commits, so all three
  // gate the confirm step — `note` included. It is OPTIONAL AT THE VERB (the
  // machine requires `supplierId` + `category`) and REQUIRED HERE: a demand
  // with no stated reason is the thing the supplier cannot act on.
  const reqComplete = reqSupplier !== '' && reqCategory !== '' && reqNote.trim() !== '';

  const closeRequest = () => {
    setRequestOpen(false);
    setReqConfirming(false);
    setReqSupplier('');
    setReqCategory('');
    setReqNote('');
  };

  /**
   * ⚠️ **THE OUTCOME IS READ FROM THE RESULT, NEVER ASSUMED FROM THE CALL** —
   * the same rule the review half above runs on, and it matters more here
   * because this act has a refusal the operator can actually trigger:
   * `SCOPE_DENIED` when the named supplier does not resolve on the roster
   * (`requireCreationOwner`, C4b). A `DataError` is THROWN rather than returned
   * for that class, so it is caught and rendered instead of escaping as an
   * unhandled rejection that would leave the panel claiming nothing happened.
   */
  const runRequest = async () => {
    if (reqCategory === '') return;
    setReqBusy(true);
    try {
      const result = await requestDoc.mutateAsync({
        supplierId: reqSupplier,
        category: reqCategory,
        note: reqNote.trim()
      });
      if (result.status === 'failed') {
        toast({
          variant: 'error',
          title: t('compliance.request.toast.failed'),
          description: refusalText(result.reason) ?? result.reason
        });
        return;
      }
      toast({
        variant: 'success',
        title: t('compliance.request.toast.sent'),
        description: t('compliance.request.toast.sentDesc', {
          supplier: reqSupplierName
        })
      });
      closeRequest();
    } catch (err) {
      // ⚠️ **THE THROWN HALF, AND IT IS A DIFFERENT VOCABULARY FROM THE
      // RETURNED ONE.** `SCOPE_DENIED` arrives as a `DataError` whose message is
      // prose, so `refusalText` cannot read it — browser QA had an Indonesian
      // operator reading *"creation of supplierDocument denied: unresolved
      // owner"* in English. The CODE is what the glossary is keyed on.
      const code = err instanceof DataError ? err.code : undefined;
      toast({
        variant: 'error',
        title: t('compliance.request.toast.failed'),
        description:
          dataErrorText(code) ??
          (err instanceof Error
            ? (refusalText(err.message) ?? err.message)
            : t('compliance.request.toast.failed'))
      });
    } finally {
      setReqBusy(false);
    }
  };

  return {
    request,
    requestOpen,
    setRequestOpen,
    supplierOptions,
    reqSupplier,
    setReqSupplier,
    reqSupplierName,
    reqCategory,
    setReqCategory,
    reqNote,
    setReqNote,
    reqConfirming,
    setReqConfirming,
    reqBusy,
    reqComplete,
    closeRequest,
    runRequest
  };
}
