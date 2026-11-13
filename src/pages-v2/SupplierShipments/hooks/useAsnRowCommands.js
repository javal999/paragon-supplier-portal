/** @import React from 'react' */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '@hooks/useToast';
import { useRefusalText } from '@hooks/useRefusalText';
/** @import { PurchaseOrder } from '@services/data/types' */
/** @import { useAdvanceShipNoticeCancel, useAdvanceShipNoticeCreate } from '@services/query/commandHooks' */
/** @import { StatusFilter, TabKey } from '../const' */

/**
 * The list's two row-level commands: create an ASN from a confirmed PO in the
 * "awaiting ASN" panel (`t_asn_create`), and cancel one through its confirm
 * drawer (`t_asn_cancel`, with the drawer's `cancelTarget` state). A created
 * ASN clears the status filter and returns to the list tab.
 * @param {object} args
 * @param {readonly PurchaseOrder[]} args.confirmedPos  The confirmed POs the create row offers.
 * @param {React.Dispatch<React.SetStateAction<StatusFilter>>} args.setStatusFilter
 * @param {React.Dispatch<React.SetStateAction<TabKey>>} args.setTab
 * @param {ReturnType<typeof useAdvanceShipNoticeCreate>} args.createAsnMutation
 * @param {ReturnType<typeof useAdvanceShipNoticeCancel>} args.cancelAsnMutation
 */
export function useAsnRowCommands({
  confirmedPos,
  setStatusFilter,
  setTab,
  createAsnMutation,
  cancelAsnMutation
}) {
  const { t } = useTranslation();
  const refusalText = useRefusalText();
  const { toast } = useToast();
  const [cancelTarget, setCancelTarget] = useState(/** @type {string | null} */ (null));

  // t_asn_cancel — a Draft or Submitted ASN withdrawn before receipt.
  const doCancelAsn = () => {
    if (!cancelTarget) return;
    const asnNumber = cancelTarget;
    cancelAsnMutation.mutate(
      { asnNumber },
      {
        onSuccess: (res) => {
          if (res.status === 'failed') {
            toast({
              variant: 'warning',
              title: t('fc.asn.cancel.failed', { asnNumber }),
              description: refusalText(res.reason) ?? res.reason ?? ''
            });
            return;
          }
          setCancelTarget(null);
          toast({ variant: 'success', title: t('fc.asn.cancel.success', { asnNumber }) });
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

  // t_asn_create (creation) from a confirmed PO. Store assigns the number; the
  // list + "awaiting ASN" panel re-derive from the invalidated query.
  /** @param {string} poId */
  const createAsnForPO = (poId) => {
    const po = confirmedPos.find((p) => p.id === poId);
    if (!po) return;
    createAsnMutation.mutate(
      { poReference: po.poNumber },
      {
        onSuccess: (res) => {
          if (res.status === 'failed') {
            toast({
              variant: 'error',
              title: t('asn.create.failed.title'),
              description:
                refusalText(res.reason) ?? t('asn.create.failed.desc', { reason: res.reason ?? '' })
            });
            return;
          }
          toast({
            variant: 'success',
            title: t('asn.create.success.title', { asnNumber: res.entityId ?? '' }),
            description: t('asn.create.success.desc', { poNumber: po.poNumber })
          });
          setStatusFilter('All');
          setTab('shipments');
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

  return { cancelTarget, setCancelTarget, doCancelAsn, createAsnForPO };
}
