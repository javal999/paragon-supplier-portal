/** @import React from 'react' */
import { useTranslation } from 'react-i18next';

import Data from '@components/ui-v2/Data';
import Button from '@components/ui-v2/Button';
/** @import { RaiseApplication } from '../hooks/useRaiseApplication' */

/**
 * @typedef {object} RaiseConfirmProps
 * @property {RaiseApplication} raise the draft being confirmed and its commit handler
 */

/**
 * The raise panel's confirm step: reads the draft back (type, company, the
 * resolved vendor, declarations) and offers commit or back. Moved out of
 * `BuyerSupplierApplications` by the Phase 5 page split.
 * @type {React.FC<RaiseConfirmProps>}
 */
const RaiseConfirm = ({ raise }) => {
  const { t } = useTranslation();
  const {
    raiseType,
    raiseCompanyName,
    vendorBearing,
    pickedVendor,
    raiseDeclarationList,
    raiseComplete,
    submitPending,
    raiseApplication,
    setRaiseConfirming
  } = raise;

  return (
    <div className="space-y-4" data-testid="application-raise-confirm">
      <div className="text-sm font-bold text-text-primary">
        {t('applications.raise.confirm.title')}
      </div>
      <p className="text-sm text-text-secondary">{t('applications.raise.confirm.lead')}</p>
      <dl className="bg-bg-hover rounded px-4 py-3 space-y-3 text-sm">
        <div>
          <dt className="text-label text-text-tertiary uppercase">
            {t('applications.raise.field.type')}
          </dt>
          <dd className="text-text-primary">{t(`applications.raise.type.${raiseType}`)}</dd>
        </div>
        <div>
          <dt className="text-label text-text-tertiary uppercase">
            {t('applications.raise.field.company')}
          </dt>
          {/* i18n-defer: the applicant's own legal name. */}
          <dd className="text-text-primary font-semibold">{raiseCompanyName}</dd>
        </div>
        {vendorBearing && pickedVendor && (
          <div>
            <dt className="text-label text-text-tertiary uppercase">
              {t('applications.raise.field.vendor')}
            </dt>
            {/* THE RESOLVED VENDOR, shown as a NAME beside the id it
                resolved from — #284's rule, and the reason is that a
                picker cannot refuse the WRONG vendor, only an absent
                one. Only a reader catches that, so the reader is shown
                what it resolved to before anything commits. */}
            <dd className="text-text-primary">
              {pickedVendor.name}{' '}
              <Data className="text-xs text-text-tertiary">{pickedVendor.sapBpNumber}</Data>
            </dd>
          </div>
        )}
        <div>
          <dt className="text-label text-text-tertiary uppercase">
            {t('applications.raise.field.declarations')}
          </dt>
          <dd className="text-text-secondary">
            {raiseDeclarationList.length === 0 ? (
              t('applications.raise.confirm.declaredNone')
            ) : (
              <ul className="space-y-1" data-testid="application-raise-declared">
                {raiseDeclarationList.map((d) => (
                  <li key={d.kind} className="flex gap-2">
                    <span className="uppercase text-text-tertiary w-14 shrink-0">{d.kind}</span>
                    <Data>{d.reference}</Data>
                  </li>
                ))}
              </ul>
            )}
          </dd>
        </div>
      </dl>
      <p className="text-xs text-text-tertiary">{t('applications.raise.confirm.unattributed')}</p>
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          onClick={raiseApplication}
          disabled={!raiseComplete || submitPending}
          data-testid="application-raise-commit"
        >
          {t('applications.raise.confirm.commit')}
        </Button>
        <Button variant="secondary" onClick={() => setRaiseConfirming(false)}>
          {t('applications.raise.confirm.back')}
        </Button>
      </div>
    </div>
  );
};

export default RaiseConfirm;
