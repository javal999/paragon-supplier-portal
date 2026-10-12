import { useTranslation } from 'react-i18next';
import { useToast } from '@hooks/useToast';
import { useRfxCommand } from '@services/query/commandHooks';
/** @import { rfxCategoryFamily } from '@services/sourcing/rfxConfig' */
/** @import { RfpEvent } from '@services/sourcing/types' */
import { draftEditRefusal } from '../../draftEdit';
/** @import { Draft } from '../const' */
import { termRowsOf } from '../utils';

/**
 * @typedef {object} RfpSubmitArgs
 * @property {Draft} draft  the wizard's draft, sent as the command payload
 * @property {ReturnType<typeof rfxCategoryFamily>} family  the picked family, whose supplier category is sent
 * @property {RfpEvent} [editing]  BL-93 — set: the draft revises this RFP (`reviseRfp`); absent: `createRfp`
 * @property {boolean} hasTc  the draft carries T&C text or a T&C file
 * @property {(rfpId: string) => void} onCreated
 * @property {() => void} onCancel
 */

/**
 * The wizard's two acts (CE-06): save the draft, or save and send it. One RFx
 * command — `createRfp`, or `reviseRfp` when editing a Draft RFP — with the
 * outcome toasted; a created or revised RFP hands its id to `onCreated`.
 * `isPending` disables the save button while the command runs.
 * @param {RfpSubmitArgs} args
 */
export const useRfpSubmit = ({ draft, family, editing, hasTc, onCreated, onCancel }) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const command = useRfxCommand();

  /** @param {boolean} publish */
  const create = (publish) =>
    command.mutate(
      {
        ...(editing
          ? { verb: /** @type {const} */ ('reviseRfp'), rfpId: editing.id }
          : { verb: /** @type {const} */ ('createRfp') }),
        title: draft.title.trim(),
        scope: draft.scope.trim(),
        materialCategory: family?.supplierCategory ?? '',
        ...(draft.purchasingGroup ? { purchasingGroup: draft.purchasingGroup } : {}),
        responseDeadline: draft.responseDeadline,
        currency: draft.currency,
        invitedSupplierIds: draft.invitedSupplierIds,
        terms: termRowsOf(draft),
        ...(draft.questions.length > 0 ? { questions: draft.questions } : {}),
        ...(draft.customSections.length > 0 ? { customSections: draft.customSections } : {}),
        ...(draft.pricing ? { pricing: draft.pricing } : {}),
        ...(draft.attachments.length > 0 ? { attachments: draft.attachments } : {}),
        ...(draft.documentRequests.length > 0 ? { documentRequests: draft.documentRequests } : {}),
        ...(draft.confidential
          ? {
              confidentiality: draft.confidentialityTerms.trim()
                ? { terms: draft.confidentialityTerms.trim() }
                : {}
            }
          : {}),
        ...(hasTc
          ? {
              termsDocument: {
                ...(draft.termsText.trim() ? { text: draft.termsText.trim() } : {}),
                ...(draft.termsFile[0] ? { attachment: draft.termsFile[0] } : {})
              }
            }
          : {}),
        ...(draft.sourceRfiId ? { sourceRfiId: draft.sourceRfiId } : {}),
        ...(publish ? { publish: true } : {})
      },
      {
        onSuccess: (res) => {
          if (res.status === 'failed') {
            toast({
              variant: 'error',
              title:
                draftEditRefusal(t, res.reason) ??
                t('rfx.toast.refused', { reason: res.reason ?? '' })
            });
            return;
          }
          toast({
            variant: 'success',
            title: t(
              editing
                ? publish
                  ? 'rfxEdit.toast.sent'
                  : 'rfxEdit.toast.saved'
                : publish
                  ? 'rfx.toast.published'
                  : 'rfx.toast.draftCreated'
            )
          });
          if (res.entityId) onCreated(res.entityId);
          else onCancel();
        },
        onError: () => toast({ variant: 'error', title: t('rfx.toast.refused', { reason: '' }) })
      }
    );

  return { create, isPending: command.isPending };
};
