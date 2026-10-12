/** @import React from 'react' */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useToast } from '@hooks/useToast';
import { useSuppliers } from '@services/query/hooks';
import { useApplicationSubmit } from '@services/query/commandHooks';
import { useRefusalText, useDataErrorText } from '@hooks/useRefusalText';
/** @import { Supplier } from '@services/data/types' */
/** @import { ApplicationRequestType, ApplicationDeclarationKind } from '@services/transitions/flows/supplierApplication.flow' */
import {
  APPLICATION_DECLARATION_KINDS,
  VENDOR_BEARING_REQUEST_TYPE
} from '@services/transitions/flows/supplierApplication.flow';
import { emptyDeclarations, describeThrown } from '../utils';

/**
 * @typedef {object} RaiseApplication
 * @property {Supplier[]} supplierOptions          the roster the vendor picker offers
 * @property {boolean} raiseOpen                   whether the raise panel is open
 * @property {(open: boolean) => void} setRaiseOpen
 * @property {ApplicationRequestType | ''} raiseType
 * @property {(type: ApplicationRequestType | '') => void} setRaiseType
 * @property {string} raiseCompany                 free-text company (vendor-free types)
 * @property {(company: string) => void} setRaiseCompany
 * @property {string} raiseVendor                  picked `sapBpNumber` (extension type)
 * @property {(vendor: string) => void} setRaiseVendor
 * @property {Record<ApplicationDeclarationKind, string>} raiseDeclarations
 * @property {React.Dispatch<React.SetStateAction<Record<ApplicationDeclarationKind, string>>>} setRaiseDeclarations
 * @property {boolean} raiseConfirming             the confirm step is showing
 * @property {(confirming: boolean) => void} setRaiseConfirming
 * @property {boolean} vendorBearing               the picked type names an existing vendor
 * @property {Supplier | null} pickedVendor        the roster row the vendor value resolves to
 * @property {string} raiseCompanyName             the company the payload will carry
 * @property {{ kind: ApplicationDeclarationKind; reference: string }[]} raiseDeclarationList
 * @property {boolean} raiseComplete               enough is filled to commit
 * @property {boolean} submitPending               `application:submit` is in flight
 * @property {() => void} closeRaise               close the panel and reset the draft
 * @property {() => Promise<void>} raiseApplication dispatch `application:submit`
 */

/**
 * B3 · THE DOOR — state and handlers for raising an application from the page
 * header (`application:submit`). The draft lives here, called from the page,
 * so it survives the panel opening and closing exactly as before. Moved out of
 * `BuyerSupplierApplications` by the Phase 5 page split (no behaviour change:
 * same state, same payload, same toasts).
 * @returns {RaiseApplication}
 */
export const useRaiseApplication = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const refusalText = useRefusalText();
  const dataErrorText = useDataErrorText();

  const submit = useApplicationSubmit();

  // ── B3 · THE DOOR ─────────────────────────────────────────────────────────
  const suppliersQuery = useSuppliers();
  const supplierOptions = suppliersQuery.data?.items ?? [];

  const [raiseOpen, setRaiseOpen] = useState(false);
  const [raiseType, setRaiseType] = useState(/** @type {ApplicationRequestType | ''} */ (''));
  const [raiseCompany, setRaiseCompany] = useState('');
  const [raiseVendor, setRaiseVendor] = useState('');
  const [raiseDeclarations, setRaiseDeclarations] = useState(emptyDeclarations);
  const [raiseConfirming, setRaiseConfirming] = useState(false);

  /** Only ONE request type names an existing vendor. Read from the flow. */
  const vendorBearing = raiseType === VENDOR_BEARING_REQUEST_TYPE;

  /**
   * ⚠️ THE RESOLUTION, PERFORMED HERE THE WAY THE DISPATCHER PERFORMS IT.
   * The control's value is a `sapBpNumber` off the roster the seam returned, so
   * every value it can produce is one `creationOwner` matches — the refusal
   * exists for a payload this control cannot construct.
   */
  const pickedVendor = supplierOptions.find((s) => s.sapBpNumber === raiseVendor) ?? null;

  /**
   * ⚠️ FOR AN EXTENSION THE COMPANY IS DERIVED, NOT TYPED, and that is the
   * whole reason the picker is worth more than a text box: a buyer who picks
   * `BP-10001234` and types a different legal name would produce a record that
   * disagrees with itself, and nothing downstream could say which half is
   * wrong. The two vendor-free types name no identifier space at all, so they
   * keep free text — as ruled.
   */
  const raiseCompanyName = vendorBearing ? (pickedVendor?.name ?? '') : raiseCompany.trim();

  const raiseDeclarationList = APPLICATION_DECLARATION_KINDS.filter(
    (k) => raiseDeclarations[k].trim() !== ''
  ).map((k) => ({ kind: k, reference: raiseDeclarations[k].trim() }));

  const raiseComplete =
    raiseType !== '' && raiseCompanyName !== '' && (!vendorBearing || pickedVendor !== null);

  const closeRaise = () => {
    setRaiseOpen(false);
    setRaiseConfirming(false);
    setRaiseType('');
    setRaiseCompany('');
    setRaiseVendor('');
    setRaiseDeclarations(emptyDeclarations());
  };

  const raiseApplication = async () => {
    // ⚠️ THE EMPTY CHECK COMES FIRST, and it is not redundant with
    // `raiseComplete`: TypeScript narrows `raiseType` through that const, so the
    // other order compiles to a comparison the checker calls impossible — a
    // guard the compiler has already decided cannot fire. Explicit first.
    if (raiseType === '' || !raiseComplete || submit.isPending) return;
    try {
      const result = await submit.mutateAsync({
        payload: {
          requestType: raiseType,
          companyName: raiseCompanyName,
          // Absent rather than empty for the two vendor-free types: the target
          // stores `null` when nobody was asked, and `''` would read as
          // "they were asked and left it blank".
          ...(vendorBearing ? { s4Vendor: raiseVendor } : {}),
          ...(raiseDeclarationList.length > 0 ? { declarations: raiseDeclarationList } : {})
        }
      });
      if (result.status === 'failed') {
        toast({
          variant: 'error',
          title: t('applications.toast.raiseFailed.title'),
          description:
            refusalText(result.reason) ?? result.reason ?? t('applications.toast.actionFailed.desc')
        });
        return;
      }
      // ⚠️ THE TOAST NAMES THE COMPANY, NOT THE NUMBER, AND THE OMISSION IS
      // DELIBERATE. `CommandResult` carries `entityId`; the APPLICATION NUMBER
      // is minted inside the store and is not returned. Deriving it here would
      // mean a second copy of `numberFor` — a number computed on the surface,
      // which is the exact defect the other half of this PR deletes from
      // `/register`. The row below carries the real one.
      toast({
        variant: 'success',
        title: t('applications.toast.raised.title', { company: raiseCompanyName }),
        description: t('applications.toast.raised.desc')
      });
      closeRaise();
    } catch (e) {
      toast({
        variant: 'error',
        title: t('applications.toast.raiseFailed.title'),
        description: describeThrown(dataErrorText, e, t('applications.toast.actionFailed.desc'))
      });
    }
  };

  return {
    supplierOptions,
    raiseOpen,
    setRaiseOpen,
    raiseType,
    setRaiseType,
    raiseCompany,
    setRaiseCompany,
    raiseVendor,
    setRaiseVendor,
    raiseDeclarations,
    setRaiseDeclarations,
    raiseConfirming,
    setRaiseConfirming,
    vendorBearing,
    pickedVendor,
    raiseCompanyName,
    raiseDeclarationList,
    raiseComplete,
    submitPending: submit.isPending,
    closeRaise,
    raiseApplication
  };
};
