/** @import React from 'react' */
/** @import { TFunction } from 'i18next' */
/** @import { SupplierDocument } from '@services/data/types' */
import Data from '@components/ui-v2/Data';
import { formatDate } from '@lib/format';

/**
 * @typedef {object} DeclarationDetailsProps
 * @property {SupplierDocument} doc The declared document — a certificate
 *   declaration or a COA declaration (UCX-P5), never both.
 * @property {TFunction} t
 */

/**
 * The declaration a supplier made for a queued document: a certificate's
 * issuer, issued → expiry dates, when and by whom it was declared, and the
 * supplier's own scope text; or, for a COA answer (UCX-P5), the batch, the COA
 * number, who issued it, the date and the scope. Moved out of
 * `BuyerCompliance.jsx` by the Phase 5 page split (no behaviour change).
 *
 * ⚠️ **WHAT A REVIEWER CHECKS IS THE POINT OF THIS LIST.** Nothing was uploaded,
 * so these are the claims to check against the document in hand (UCX-F18); the
 * queue item states that in words above this list.
 * @type {React.FC<DeclarationDetailsProps>}
 */
const DeclarationDetails = ({ doc, t }) => {
  const { coaDeclaration: coa, declaration } = doc;
  if (coa) {
    return (
      <dl className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-xs">
        <div>
          <dt className="inline text-text-tertiary">{t('compliance.queue.field.batch')} </dt>
          <dd className="inline text-text-secondary">
            <Data>{coa.batch}</Data>
          </dd>
        </div>
        <div>
          <dt className="inline text-text-tertiary">{t('compliance.queue.field.coaNumber')} </dt>
          <dd className="inline text-text-secondary">
            <Data>{coa.coaNumber}</Data>
          </dd>
        </div>
        <div>
          <dt className="inline text-text-tertiary">{t('compliance.queue.field.issuer')} </dt>
          {/* i18n-defer: supplier-authored free text */}
          <dd className="inline text-text-secondary">{coa.issuer}</dd>
        </div>
        <div>
          <dt className="inline text-text-tertiary">{t('compliance.queue.field.issuedOn')} </dt>
          <dd className="inline text-text-secondary">
            <Data>{formatDate(coa.issuedOn)}</Data>
          </dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="inline text-text-tertiary">{t('compliance.queue.field.declared')} </dt>
          <dd className="inline text-text-secondary">
            <Data>{formatDate(coa.declaredAt)}</Data>
            {' · '}
            {coa.declaredBy.kind === 'UNATTRIBUTED'
              ? t('compliance.queue.declaredBy.unattributed')
              : coa.declaredBy.person.displayName}
          </dd>
        </div>
        {coa.scopeText !== '' && (
          <div className="sm:col-span-2">
            <dt className="inline text-text-tertiary">{t('compliance.queue.field.scope')} </dt>
            {/* i18n-defer: supplier-authored free text. */}
            <dd className="inline text-text-secondary">{coa.scopeText}</dd>
          </div>
        )}
      </dl>
    );
  }
  if (!declaration) return null;
  return (
    <dl className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-xs">
      <div>
        <dt className="inline text-text-tertiary">{t('compliance.queue.field.issuer')} </dt>
        {/* i18n-defer: supplier-authored free text */}
        <dd className="inline text-text-secondary">{declaration.issuer}</dd>
      </div>
      <div>
        <dt className="inline text-text-tertiary">{t('compliance.queue.field.dates')} </dt>
        <dd className="inline text-text-secondary">
          <Data>{formatDate(declaration.issuedOn)}</Data>
          {' → '}
          {declaration.expiresOn === null ? (
            t('compliance.queue.noExpiry')
          ) : (
            <Data>{formatDate(declaration.expiresOn)}</Data>
          )}
        </dd>
      </div>
      <div className="sm:col-span-2">
        {/* ⚠️ **`declaredAt` AND `declaredBy` ARE RENDERED HERE
            BECAUSE THE STORED-FIELD GATE SAID THEY WERE NOT.**
            It flagged both as stored-and-never-read — the
            `certBasis` shape — and the honest disposal is a
            reader, not an allowlist row. They also earn their
            place: a reviewer needs to know how old a claim is,
            and the attribution says out loud that this platform
            cannot name the person who made it. */}
        <dt className="inline text-text-tertiary">{t('compliance.queue.field.declared')} </dt>
        <dd className="inline text-text-secondary">
          <Data>{formatDate(declaration.declaredAt)}</Data>
          {' · '}
          {declaration.declaredBy.kind === 'UNATTRIBUTED'
            ? t('compliance.queue.declaredBy.unattributed')
            : declaration.declaredBy.person.displayName}
        </dd>
      </div>
      <div className="sm:col-span-2">
        <dt className="inline text-text-tertiary">{t('compliance.queue.field.scope')} </dt>
        {/* ⚠️ THE SUPPLIER'S OWN WORDS, RENDERED AS SUCH. This
            is NOT a material-code list and must never be shown
            as one — compliance reads it and assigns the codes.
            i18n-defer: supplier-authored free text. */}
        <dd className="inline text-text-secondary">{declaration.scopeText}</dd>
      </div>
    </dl>
  );
};

export default DeclarationDetails;
