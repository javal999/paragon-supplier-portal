/** @import React from 'react' */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '@hooks/useToast';
import { useRefusalText } from '@hooks/useRefusalText';
/** @import { PurchaseOrder } from '@services/data/types' */
/** @import { useAdvanceShipNoticeCreate, useAdvanceShipNoticeRequestException, useAdvanceShipNoticeSubmit } from '@services/query/commandHooks' */
/** @import { AsnLinesRead, LineEntry } from '../../shipments/asnLines' */
/** @import { AsnForm, TabKey } from '../const' */
import { EMPTY_LINE } from '../../shipments/asnLines';
import { newAsnForm } from '../utils';

/**
 * The Create-ASN wizard's state and its commit. Holds the step and the form;
 * `completeWizard` drafts a detailed ASN then submits it (`t_asn_create` →
 * `t_asn_submit`), or asks Quality for a shelf-life exception instead, and
 * always resets the wizard and returns to the list tab. The mutations are the
 * page's own instances, passed in so the page holds one of each.
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

  /** @param {Partial<AsnForm>} patch */
  const updateForm = (patch) => setForm((f) => ({ ...f, ...patch }));

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
    setTab('shipments');
  };

  // The wizard drafts a DETAILED ASN then submits it — create (t_asn_create,
  // store-assigned number) → submit (t_asn_submit). No fabricated document id;
  // honest outcome from the real command result.
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
      // MR-6 BR-08 — shelf life is the one thing wrong: ask Quality instead.
      if (wizardRead.onlyShelfLife) {
        const requestRes = await requestExceptionMutation.mutateAsync({
          asnNumber: createRes.entityId,
          ...detail,
          reason: form.exceptionReason.trim()
        });
        toast(
          requestRes.status === 'failed'
            ? {
                variant: 'warning',
                title: t('fc.asn.shelfLife.request.failed', { asnNumber: createRes.entityId }),
                description: refusalText(requestRes.reason) ?? requestRes.reason ?? ''
              }
            : {
                variant: 'success',
                title: t('fc.asn.shelfLife.request.success', { asnNumber: createRes.entityId })
              }
        );
        return;
      }
      const submitRes = await submitAsnMutation.mutateAsync({
        asnNumber: createRes.entityId,
        ...detail
      });
      if (submitRes.status === 'failed') {
        toast({
          variant: 'warning',
          title: t('asn.submit.failed.title', { asnNumber: createRes.entityId }),
          description:
            refusalText(submitRes.reason) ??
            t('asn.submit.failed.desc', { reason: submitRes.reason ?? '' })
        });
      } else {
        toast({
          variant: 'success',
          title: t('asn.submit.success.title', { asnNumber: createRes.entityId })
        });
      }
    } catch {
      toast({ variant: 'error', title: t('asn.denied.title'), description: t('asn.denied.desc') });
    } finally {
      setStep(0);
      setForm(newAsnForm());
      setTab('shipments');
    }
  };

  return { step, setStep, form, updateForm, setLine, resetWizard, completeWizard };
}
