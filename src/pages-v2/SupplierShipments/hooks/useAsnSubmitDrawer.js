import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '@hooks/useToast';
import { useRefusalText } from '@hooks/useRefusalText';
import { refusalDetailOf } from '@services/transitions/refusalMessage';
/** @import { ASN, PurchaseOrder } from '@services/data/types' */
/** @import { GoodsReceipt } from '@data/mockGoodsReceipts' */
/** @import { AvailableBatch } from '@services/transitions/fulfilmentRules' */
/** @import { useAdvanceShipNoticeRequestException, useAdvanceShipNoticeSubmit } from '@services/query/commandHooks' */
/** @import { LineEntry } from '../../shipments/asnLines' */
/** @import { AsnSubmitForm } from '../const' */
import { readLines } from '../../shipments/asnLines';
import { carrierFor } from '../../shipments/CarrierPicker';
import { submitLinesFor } from '../utils';

/**
 * The Submit drawer's state and its one commit: which Draft is open, the form
 * filled from it, the drawer's lines through the one line rule, and
 * `doSubmitAsn` — `t_asn_submit`, or the shelf-life exception request when
 * shelf life is the one thing wrong. The mutations are the page's own
 * instances, passed in so the page holds one of each.
 * @param {object} args
 * @param {readonly ASN[]} args.asns  Every ASN the supplier holds.
 * @param {readonly PurchaseOrder[]} args.shippablePos  The POs an ASN may ship against.
 * @param {Readonly<Record<string, readonly AvailableBatch[]>>} args.declaredBatches  Batch picker options by material.
 * @param {readonly Pick<GoodsReceipt, 'poNumber' | 'asnNumber' | 'inspectionResults' | 'status'>[]} [args.receipts]  GR-1 / BL-71 — kept-open receipts.
 * @param {ReturnType<typeof useAdvanceShipNoticeSubmit>} args.submitAsnMutation
 * @param {ReturnType<typeof useAdvanceShipNoticeRequestException>} args.requestExceptionMutation
 */
export function useAsnSubmitDrawer({
  asns,
  shippablePos,
  declaredBatches,
  receipts = [],
  submitAsnMutation,
  requestExceptionMutation
}) {
  const { t } = useTranslation();
  const refusalText = useRefusalText();
  const { toast } = useToast();
  const [submitTarget, setSubmitTarget] = useState(/** @type {ASN | null} */ (null));
  const [submitForm, setSubmitForm] = useState(
    /** @type {AsnSubmitForm} */ ({
      // BL-51 — replaced from the draft when the drawer opens (`carrierFor`).
      threePlId: '',
      carrier: '',
      trackingNumber: '',
      eta: '',
      shipDate: '',
      lines: /** @type {Record<string, LineEntry>} */ ({}),
      overShipReason: '',
      callOffFinal: false,
      /** MR-6 BR-08 — the supplier's reason when shelf life blocks the submission. */
      exceptionReason: ''
    })
  );

  // The lines a draft is submitted with: its PO's lines (open quantity leaving
  // this draft out), plus any stored line whose material the PO does not carry.
  /** @param {ASN} asn */
  const submitLinesForAsn = (asn) => submitLinesFor(asn, shippablePos, asns, receipts);

  // Open the submit drawer for a Draft ASN — the required fields (carrier,
  // tracking, ETA) are collected here before dispatch. Fixture drafts store '—'
  // placeholders; normalize those to empty so the form starts genuinely blank.
  /** @param {string} asnNumber */
  const openSubmitForm = (asnNumber) => {
    const asn = asns.find((a) => a.asnNumber === asnNumber);
    if (!asn) return;
    /** @param {string} v */
    const real = (v) => (v && v !== '—' ? v : '');
    setSubmitTarget(asn);
    /** @type {Record<string, LineEntry>} */
    const entries = Object.fromEntries(
      submitLinesForAsn(asn).map((l) => {
        const stored = asn.lineItems.find((li) => li.materialCode === l.materialCode);
        return [
          l.materialCode,
          {
            qty: stored ? String(stored.shippedQty) : l.open > 0 ? String(l.open) : '',
            batch: stored ? real(stored.lotNumber) : '',
            expiry: stored?.expiryDate ?? '',
            // MR-6 BR-04 — a stored batch keeps how it was entered; a line stored
            // before the rule existed, with a batch, reads as typed.
            batchSource:
              stored?.batchSource ?? (stored && real(stored.lotNumber) ? 'typed' : 'declared')
          }
        ];
      })
    );
    setSubmitForm({
      ...carrierFor(asn),
      trackingNumber: real(asn.trackingNumber),
      eta: real(asn.eta),
      shipDate: asn.shipDate ?? '',
      lines: entries,
      overShipReason: asn.overShipReason ?? '',
      callOffFinal: asn.callOffFinal === true,
      exceptionReason: ''
    });
  };

  // The drawer's lines read by the one line rule (AR-11), leaving the draft
  // out of its own open quantity.
  /** @param {ASN} asn */
  const readSubmitLines = (asn) =>
    readLines(submitForm.lines, submitLinesForAsn(asn), {
      po: shippablePos.find((p) => p.poNumber === asn.poReference),
      asns,
      excludeAsn: asn.asnNumber,
      eta: submitForm.eta,
      overShipReason: submitForm.overShipReason,
      batches: declaredBatches,
      receipts
    });

  // t_asn_submit (Draft → Submitted) with the collected fields. The dispatcher
  // is the source of truth: an incomplete form is honestly rejected (the
  // requiredFields enforcement), surfaced as a human-readable message.
  const doSubmitAsn = () => {
    if (!submitTarget) return;
    const asnNumber = submitTarget.asnNumber;
    const read = readSubmitLines(submitTarget);
    const vars = {
      asnNumber,
      carrier: submitForm.carrier,
      // BL-51 — '' clears a 3PL the draft named (a carrier typed by name).
      threePlId: submitForm.threePlId,
      trackingNumber: submitForm.trackingNumber,
      eta: submitForm.eta,
      ...(submitForm.shipDate ? { shipDate: submitForm.shipDate } : {}),
      ...(read.lines.length > 0 ? { lines: read.lines.map((l) => l.input) } : {}),
      ...(submitForm.overShipReason.trim()
        ? { overShipReason: submitForm.overShipReason.trim() }
        : {})
    };
    // MR-6 BR-08 — the second submit path: when shelf life is the one thing
    // wrong, the drawer asks Quality instead of submitting.
    if (read.onlyShelfLife) {
      requestExceptionMutation.mutate(
        { ...vars, reason: submitForm.exceptionReason.trim() },
        {
          onSuccess: (res) => {
            if (res.status === 'failed') {
              toast({
                variant: 'warning',
                title: t('fc.asn.shelfLife.request.failed', { asnNumber }),
                description: refusalText(res.reason) ?? res.reason ?? ''
              });
              return;
            }
            setSubmitTarget(null);
            toast({
              variant: 'success',
              title: t('fc.asn.shelfLife.request.success', { asnNumber })
            });
          },
          onError: () =>
            toast({
              variant: 'error',
              title: t('asn.denied.title'),
              description: t('asn.denied.desc')
            })
        }
      );
      return;
    }
    submitAsnMutation.mutate(
      { ...vars, ...(submitTarget.callOffId ? { callOffFinal: submitForm.callOffFinal } : {}) },
      {
        onSuccess: (res) => {
          if (res.status === 'failed') {
            const missing = (res.reason ?? '').startsWith('MISSING_FIELDS');
            const incomplete = (res.reason ?? '').includes('INCOMPLETE_ASN');
            toast({
              variant: 'warning',
              title: t('asn.submit.failed.title', { asnNumber }),
              description: missing
                ? t('asn.submit.missingFields', { code: refusalDetailOf(res.reason) })
                : incomplete
                  ? `${t('fc.asn.submit.required')} (${refusalDetailOf(res.reason)})`
                  : (refusalText(res.reason) ??
                    t('asn.submit.failed.desc', { reason: res.reason ?? '' }))
            });
            return;
          }
          setSubmitTarget(null);
          toast({
            variant: 'success',
            title: t('asn.submit.success.title', { asnNumber })
          });
        },
        onError: () =>
          toast({
            variant: 'error',
            title: t('asn.denied.title'),
            description: t('asn.denied.desc')
          })
      }
    );
  };

  return {
    submitTarget,
    setSubmitTarget,
    submitForm,
    setSubmitForm,
    openSubmitForm,
    submitLinesForAsn,
    readSubmitLines,
    doSubmitAsn
  };
}
