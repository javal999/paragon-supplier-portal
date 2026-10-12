/** @import React from 'react' */
import { useTranslation } from 'react-i18next';

import Button from '@components/ui-v2/Button';
/** @import { ApplicationRequestType } from '@services/transitions/flows/supplierApplication.flow' */
import {
  APPLICATION_REQUEST_TYPES,
  APPLICATION_DECLARATION_KINDS
} from '@services/transitions/flows/supplierApplication.flow';
/** @import { RaiseApplication } from '../hooks/useRaiseApplication' */

/**
 * @typedef {object} RaiseFormProps
 * @property {RaiseApplication} raise the draft being edited and its setters
 */

/**
 * The raise panel's form step: request type, then either the vendor picker
 * (extension type) or a free-text company, then the optional declarations,
 * then Next / Cancel. Moved out of `BuyerSupplierApplications` by the Phase 5
 * page split.
 * @type {React.FC<RaiseFormProps>}
 */
const RaiseForm = ({ raise }) => {
  const { t } = useTranslation();
  const {
    supplierOptions,
    raiseType,
    setRaiseType,
    raiseCompany,
    setRaiseCompany,
    raiseVendor,
    setRaiseVendor,
    raiseDeclarations,
    setRaiseDeclarations,
    setRaiseConfirming,
    vendorBearing,
    raiseComplete,
    closeRaise
  } = raise;

  return (
    <div className="space-y-5" data-testid="application-raise-form">
      <p className="text-sm text-text-secondary">{t('applications.raise.panel.lead')}</p>

      <label className="block">
        <span className="block text-label text-text-tertiary uppercase mb-1">
          {t('applications.raise.field.type')}
        </span>
        <select
          data-testid="application-raise-type"
          className="w-full px-3 py-2 text-sm text-text-primary bg-white border border-border-input rounded-md focus:outline-none focus:border-action"
          value={raiseType}
          onChange={(e) => {
            setRaiseType(/** @type {ApplicationRequestType | ''} */ (e.target.value));
            // Switching away from the extension type must drop the
            // vendor: a stale `s4Vendor` would ride along on a payload
            // that never asked for one.
            setRaiseVendor('');
          }}
        >
          <option value="">{t('applications.raise.field.typePlaceholder')}</option>
          {/* Derived from the flow's closed set — the same constant the
              verb proves membership against, so this control can never
              offer a type the dispatcher would refuse. */}
          {APPLICATION_REQUEST_TYPES.map((rt) => (
            <option key={rt} value={rt}>
              {t(`applications.raise.type.${rt}`)}
            </option>
          ))}
        </select>
      </label>

      {vendorBearing ? (
        <label className="block">
          <span className="block text-label text-text-tertiary uppercase mb-1">
            {t('applications.raise.field.vendor')}
          </span>
          <select
            data-testid="application-raise-vendor"
            className="w-full px-3 py-2 text-sm text-text-primary bg-white border border-border-input rounded-md focus:outline-none focus:border-action"
            value={raiseVendor}
            onChange={(e) => setRaiseVendor(e.target.value)}
          >
            <option value="">{t('applications.raise.field.vendorPlaceholder')}</option>
            {/* THE ROSTER THROUGH THE SEAM, keyed on the identifier the
                dispatcher resolves — `sapBpNumber`. This is the whole of
                the reconciliation: one space, chosen from, never typed. */}
            {supplierOptions.map((sup) => (
              <option key={sup.id} value={sup.sapBpNumber}>
                {/* i18n-defer: mock/sample data (supplier name) */}
                {sup.name} — {sup.sapBpNumber}
              </option>
            ))}
          </select>
          <span className="block text-xs text-text-tertiary mt-1">
            {t('applications.raise.field.vendorHint')}
          </span>
        </label>
      ) : (
        <label className="block">
          <span className="block text-label text-text-tertiary uppercase mb-1">
            {t('applications.raise.field.company')}
          </span>
          <input
            data-testid="application-raise-company"
            className="w-full px-3 py-2 text-sm text-text-primary bg-white border border-border-input rounded-md focus:outline-none focus:border-action"
            value={raiseCompany}
            onChange={(e) => setRaiseCompany(e.target.value)}
            placeholder={t('applications.raise.field.companyPlaceholder')}
          />
        </label>
      )}

      <div>
        <span className="block text-label text-text-tertiary uppercase mb-1">
          {t('applications.raise.field.declarations')}{' '}
          <span className="normal-case text-text-tertiary">
            ({t('applications.raise.field.declarationsOptional')})
          </span>
        </span>
        <div className="space-y-2">
          {APPLICATION_DECLARATION_KINDS.map((kind) => (
            <label key={kind} className="flex items-center gap-3">
              <span className="uppercase text-xs text-text-tertiary w-14 shrink-0">{kind}</span>
              <input
                data-testid={`application-raise-declaration-${kind}`}
                className="flex-1 px-3 py-2 text-sm text-text-primary bg-white border border-border-input rounded-md focus:outline-none focus:border-action"
                value={raiseDeclarations[kind]}
                onChange={(e) => setRaiseDeclarations((d) => ({ ...d, [kind]: e.target.value }))}
                placeholder={t('applications.raise.declaration.placeholder')}
              />
            </label>
          ))}
        </div>
        <p className="text-xs text-text-tertiary mt-2">
          {t('applications.raise.field.declarationsHint')}
        </p>
      </div>

      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          onClick={() => setRaiseConfirming(true)}
          disabled={!raiseComplete}
          data-testid="application-raise-next"
        >
          {t('applications.raise.next')}
        </Button>
        <Button variant="secondary" onClick={closeRaise}>
          {t('applications.action.cancel')}
        </Button>
      </div>
    </div>
  );
};

export default RaiseForm;
