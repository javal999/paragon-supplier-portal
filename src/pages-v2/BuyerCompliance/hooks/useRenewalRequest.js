import { useState } from 'react';
/** @import { TFunction } from 'i18next' */
/** @import { UseToastReturn } from '@hooks/useToast' */
/** @import { Row } from '../const' */
import { useSupplierDocumentRequest } from '@services/query/commandHooks';
import { useVerbAvailability } from '@hooks/useVerbAvailability';
import { CERT_TYPE_TO_CATEGORY, certTypeLabelKey } from '@lib/complianceView';
import { formatDate } from '@lib/format';
import { DataError } from '@services/data/types';

/**
 * UCX-P5 · UCX-F31 — PTI asks for a renewal FROM the expiring row, prefilled.
 *
 * ⚠️ **THE SUPPLIER IS FIXED BY THE ROW, SO THIS PANEL COMMITS IN ONE STEP.**
 * The generic request panel keeps its confirm step for the reason its comment
 * records: the supplier is CHOSEN there, and only a reader can catch the wrong
 * valid tenant. Here the row names the supplier and the kind, both are shown
 * read-only, and the only authored field is the reason — which starts filled.
 * The predicted walk is sidebar → "Ask for a renewal" → "Open the request"
 * (UCX-P5's 3-clicks-to-ask line).
 *
 * The reason is composed through `t()` in the BUYER's locale and stored as the
 * buyer's own words: the supplier reads it verbatim (`i18n-defer` at the ask),
 * exactly as the generic panel's note is read.
 * @param {TFunction} t  The page's translator.
 * @param {(reason: string | undefined) => string | null} refusalText  The page's refusal glossary.
 * @param {(code: string | undefined) => string | null} dataErrorText  The page's thrown-error glossary.
 * @param {UseToastReturn['toast']} toast  The page's toast function.
 */
export function useRenewalRequest(t, refusalText, dataErrorText, toast) {
  const request = useVerbAvailability('supplierdoc:request');
  const requestDoc = useSupplierDocumentRequest();
  const [askRow, setAskRow] = useState(/** @type {Row | null} */ (null));
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  /** @param {Row} row */
  const openAsk = (row) => {
    setAskRow(row);
    setNote(
      t('compliance.renewal.note', {
        certificate: t(certTypeLabelKey(row.entry.certType)),
        date: formatDate(row.entry.expiryDate)
      })
    );
  };

  const closeAsk = () => {
    setAskRow(null);
    setNote('');
  };

  const runAsk = async () => {
    if (!askRow || note.trim() === '') return;
    setBusy(true);
    try {
      const result = await requestDoc.mutateAsync({
        supplierId: askRow.entry.supplierId,
        category: CERT_TYPE_TO_CATEGORY[askRow.entry.certType],
        note: note.trim(),
        requestKind: 'CERTIFICATE'
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
          supplier: askRow.entry.supplierName
        })
      });
      closeAsk();
    } catch (err) {
      // The THROWN half: `SCOPE_DENIED` arrives as a `DataError` whose message
      // is prose, so the CODE is what the glossary is keyed on.
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
      setBusy(false);
    }
  };

  return { request, askRow, note, setNote, busy, openAsk, closeAsk, runAsk };
}
