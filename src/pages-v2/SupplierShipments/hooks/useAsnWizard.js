/** @import React from 'react' */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '@hooks/useToast';
import { useRefusalText } from '@hooks/useRefusalText';
/** @import { ASN, PurchaseOrder } from '@services/data/types' */
/** @import { useAdvanceShipNoticeCreate, useAdvanceShipNoticeRequestException, useAdvanceShipNoticeSubmit } from '@services/query/commandHooks' */
/** @import { AsnLinesRead, LineEntry } from '../../shipments/asnLines' */
/** @import { AsnForm, TabKey } from '../const' */
import { EMPTY_LINE } from '../../shipments/asnLines';
import { draftForm, newAsnForm } from '../utils';

/**
 * The Create-ASN wizard's state and its commit. Holds the step and the form;
 * `completeWizard` drafts a detailed ASN then submits it (`t_asn_create` →
 * `t_asn_submit`), or asks Quality for a shelf-life exception instead, and
 * always resets the wizard and returns to the list tab. The mutations are the
 * page's own instances, passed in so the page holds one of each.
 *
 * UCX-P3 (BL-364) — `startFromDraft` opens the same wizard on an ASN the
 * call-off drawer's "Mark as shipped" step already drafted: the form fills
 * from the draft and `completeWizard` SUBMITS that draft instead of creating a
 * second one, so one shipment is reported once (UCX-F10).
 * @param {object} args
 * @param {React.Dispatch<React.SetStateAction<TabKey>>} args.setTab
 * @param {ReturnType<typeof useAdvanceShipNoticeCreate>} args.createAsnMutation
 * @param {ReturnType<typeof useAdvanceShipNoticeSubmit>} args.submitAsnMutation
 * @param {ReturnType<typeof useAdvanceShipNoticeRequestException>} args.requestExceptionMutation
 */
export function useAsnWizard({
  setTab,
  createAsnMutation,
  submitAsnMutation,
  requestExceptionMutation
}) {
  const { t } = useTranslation();
  const refusalText = useRefusalText();
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(/** @type {() => AsnForm} */ (newAsnForm));
  /** The draft ASN this wizard completes, or null for the create path. */
  const [draftAsn, setDraftAsn] = useState(/** @type {string | null} */ (null));

  /** @param {Partial<AsnForm>} patch */
  const updateForm = (patch) => setForm((f) => ({ ...f, ...patch }));

  /**
   * Open the wizard on an existing draft ASN, at the delivery-details step.
   * @param {ASN} asn
   * @param {PurchaseOrder | undefined} po
   * @param {string} [sequence]  The prefilled next free number, when the draft holds none.
   */
  const startFromDraft = (asn, po, sequence) => {
    setDraftAsn(asn.asnNumber);
    setForm({ ...newAsnForm(), ...draftForm(asn, po, sequence) });
    setStep(1);
  };

  /**
   * One line's entry patched, keyed by material code.
   * @param {string} code
   * @param {Partial<LineEntry>} patch
   */
  const setLine = (code, patch) =>
    setForm((f) => ({
      ...f,
      lines: {
        ...f.lines,
        [code]: { ...(f.lines[code] ?? EMPTY_LINE), ...patch }
      }
    }));

  /** Back to step one with a fresh form, on the list tab. */
  const resetWizard = () => {
    setStep(0);
    setForm(newAsnForm());
    setDraftAsn(null);
    setTab('shipments');
  };

  // The wizard drafts a DETAILED ASN then submits it — create (t_asn_create,
  // store-assigned number) → submit (t_asn_submit). No fabricated document id;
  // honest outcome from the real command result. In DRAFT MODE (UCX-P3) the
  // ASN already exists: only t_asn_submit fires, on that draft.
  /**
   * @param {PurchaseOrder | undefined} selectedPO  The PO picked at step 1.
   * @param {AsnLinesRead} wizardRead  The form's lines through the one line rule.
   */
  const completeWizard = async (selectedPO, wizardRead) => {
    if (!selectedPO) return;
    const detail = {
      carrier: form.carrier,
      ...(form.threePlId ? { threePlId: form.threePlId } : {}),
      trackingNumber: form.trackingNumber,
      eta: form.eta,
      shipDate: form.shipDate,
      // AIB-1 BR-03 / BR-04 (BL-348) — the sequence and the Surat Jalan.
      sequence: form.sequence.trim(),
      externalId: form.externalId.trim()
    };
    try {
      // UCX-P3 — an existing draft is completed, never re-created.
      /** @type {string | null} */
      let createdNumber = draftAsn;
      if (createdNumber === null) {
        const createRes = await createAsnMutation.mutateAsync({
          poReference: selectedPO.poNumber,
          ...detail,
          lines: wizardRead.lines.map((l) => l.input),
          ...(form.packingList ? { packingListFile: form.packingList } : {}),
          ...(form.overShipReason.trim() ? { overShipReason: form.overShipReason.trim() } : {}),
          ...(form.callOffId ? { callOffId: form.callOffId, callOffFinal: form.callOffFinal } : {})
        });
        if (createRes.status === 'failed' || !createRes.entityId) {
          toast({
            variant: 'error',
            title: t('asn.create.failed.title'),
            description:
              refusalText(createRes.reason) ??
              t('asn.create.failed.desc', { reason: createRes.reason ?? '' })
          });
          return;
        }
        createdNumber = createRes.entityId;
      }
      // MR-6 BR-08 — shelf life is the one thing wrong: ask Quality instead.
      if (wizardRead.onlyShelfLife) {
        const requestRes = await requestExceptionMutation.mutateAsync({
          asnNumber: createdNumber,
          ...detail,
          ...(draftAsn && wizardRead.lines.length > 0
            ? { lines: wizardRead.lines.map((l) => l.input) }
            : {}),
          reason: form.exceptionReason.trim()
        });
        toast(
          requestRes.status === 'failed'
            ? {
                variant: 'warning',
                title: t('fc.asn.shelfLife.request.failed', { asnNumber: createdNumber }),
                description: refusalText(requestRes.reason) ?? requestRes.reason ?? ''
              }
            : {
                variant: 'success',
                title: t('fc.asn.shelfLife.request.success', { asnNumber: createdNumber })
              }
        );
        return;
      }
      const submitRes = await submitAsnMutation.mutateAsync({
        asnNumber: createdNumber,
        ...detail,
        // UCX-P3 — a completed draft carries the details the supplier typed on
        // step 2 (batch, quantity, expiry); the create path already stored them.
        ...(draftAsn
          ? {
              ...(wizardRead.lines.length > 0
                ? { lines: wizardRead.lines.map((l) => l.input) }
                : {}),
              ...(form.overShipReason.trim() ? { overShipReason: form.overShipReason.trim() } : {}),
              callOffFinal: form.callOffFinal
            }
          : {})
      });
      if (submitRes.status === 'failed') {
        toast({
          variant: 'warning',
          title: t('asn.submit.failed.title', { asnNumber: createdNumber }),
          description:
            refusalText(submitRes.reason) ??
            t('asn.submit.failed.desc', { reason: submitRes.reason ?? '' })
        });
      } else {
        toast({
          variant: 'success',
          title: t('asn.submit.success.title', { asnNumber: createdNumber })
        });
      }
    } catch {
      toast({ variant: 'error', title: t('asn.denied.title'), description: t('asn.denied.desc') });
    } finally {
      setStep(0);
      setForm(newAsnForm());
      setDraftAsn(null);
      setTab('shipments');
    }
  };

  return {
    step,
    setStep,
    form,
    updateForm,
    setLine,
    resetWizard,
    startFromDraft,
    draftAsn,
    completeWizard
  };
}
