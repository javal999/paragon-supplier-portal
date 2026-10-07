/** @import * as React from 'react' */
import { useTranslation } from 'react-i18next';
import Data from '../../../ui-v2/Data';
// GL-1 - the glossary destination for this surface's refusals.
import GlossaryTermChip from '../../../ui-v2/GlossaryTermChip';
import { formatDate } from '@lib/format';
/** @import { HalalVerification, HalalNotSatisfiedReason } from '@services/data/halalVerification' */

// CP-3 · H4 — the four certificate outcomes, each to ITS OWN sentence.
// ⚠️ A TOTAL `Record`, so a fifth `HalalNotSatisfiedReason` fails to compile
// here until somebody writes the sentence for it — the same census discipline
// the two refusal maps carry, and the reason neither can silently acquire a
// member that renders as a blank.
/** @type {Record<HalalNotSatisfiedReason, string>} */
const CERT_REASON_KEY = {
  EXPIRED: 'goodsReceipt.wizard.cert.reason.EXPIRED',
  SCHEME_INVALID: 'goodsReceipt.wizard.cert.reason.SCHEME_INVALID',
  UNDER_REVIEW: 'goodsReceipt.wizard.cert.reason.UNDER_REVIEW',
  NO_CERT: 'goodsReceipt.wizard.cert.reason.NO_CERT'
};

/**
 * CP-3 · H4 — WHAT THE CLERK IS TOLD ABOUT THE CERTIFICATE.
 *
 * TWO SHAPES, and the difference between them is the whole demonstration: a
 * quiet line when a certificate backs the lot, a warning banner when one does
 * not. On 2026-10-17 `AI-NIAC-6612` moves from the first to the second WITHOUT
 * ANY DATE ON THE DOCUMENT CHANGING — the scheme retires under GR 42/2024 — and
 * that transition is what the mandate looks like at a dock.
 *
 * ⚠️ **`role="status"`, NEVER `role="alert"`.** The two refusal banners are
 * `alert` because they stop the step; this does not stop anything, and an
 * assertive live region would announce an emergency to a screen-reader user for
 * a line that is going to pass. THE POLITENESS LEVEL IS THE ENFORCEMENT
 * SEMANTICS, SPOKEN.
 *
 * ⚠️ **THE REASON CARRIES A GLOSSARY CHIP AND THE COPY NAMES A NEXT ACTION.**
 * `HALAL-REFUSAL-DEAD-ENDS-01`: a refusal that ends the conversation is half a
 * remedy. Every field a person needs to make the call — whose certificate,
 * which document, issued by whom, expiring when — is on the banner, because
 * `verifyHalalAtReceipt` was widened at H4 to carry them.
 * @type {React.FC<{ verdict: HalalVerification; materialCode: string; supplierName: string; index: number; }>}
 */
const CertificateNotice = ({ verdict, materialCode, supplierName, index }) => {
  const { t } = useTranslation();

  if (verdict.verdict === 'SATISFIED') {
    return (
      <div
        data-testid={`gr-cert-valid-${index}`}
        className="col-span-2 flex flex-wrap items-baseline gap-x-2 text-xs text-text-secondary"
      >
        {/* ⚠️ THE SCHEME IS NAMED, NOT JUST "a halal certificate".
            `HALAL-ISSUER-BLIND-01` recorded that the old `status === 'Valid'`
            check could not see this axis at all — and it is the axis the BPJPH
            mandate turns on, so a clerk reading "MUI, legacy" in September has
            the warning a month before the scheme retires. Reuses the compliance
            page's OWN label map: one vocabulary for a cert type, two surfaces. */}
        <span className="font-medium">
          {t('goodsReceipt.wizard.cert.valid.label')} (
          {t(`compliance.certType.${verdict.certType}`)})
        </span>
        <Data as="span">{verdict.certNumber}</Data>
        <span>·</span>
        <span>
          {verdict.expiryDate === null
            ? t('goodsReceipt.wizard.cert.valid.noExpiry')
            : t('goodsReceipt.wizard.cert.valid.expires', {
                date: formatDate(verdict.expiryDate)
              })}
        </span>
      </div>
    );
  }

  // ⚠️ `NO_CERT` NAMES NO DOCUMENT, AND THE TYPE IS WHY. Narrowing on the reason
  // is what hands the certificate over on the other three arms — there is no
  // optional field to forget to check, and no arm on which these renders could
  // print an empty string.
  const detail =
    verdict.reason === 'NO_CERT'
      ? null
      : {
          supplier: verdict.supplierName,
          certNumber: verdict.certNumber,
          certType: verdict.certType,
          issuer: verdict.issuer,
          expiry: verdict.expiryDate
        };

  return (
    <div
      data-testid={`gr-cert-notice-${index}`}
      role="status"
      className="col-span-2 rounded-md border border-warning bg-warning-soft px-3 py-2 text-xs text-warning-hover flex flex-col gap-1"
    >
      <div>
        <span className="font-semibold">{t('goodsReceipt.wizard.cert.notice.title')}</span>{' '}
        {t(CERT_REASON_KEY[verdict.reason], {
          material: materialCode,
          supplier: detail?.supplier ?? supplierName,
          expiry: detail?.expiry ? formatDate(detail.expiry) : ''
        })}{' '}
        <GlossaryTermChip refTo={{ sourceType: 'HalalNotSatisfiedReason', term: verdict.reason }} />
      </div>
      {detail !== null && (
        <dl className="flex flex-wrap gap-x-4 gap-y-0.5">
          <div className="flex gap-1">
            <dt>{t('goodsReceipt.wizard.cert.field.supplier')}:</dt>
            <dd className="font-medium">{detail.supplier}</dd>
          </div>
          <div className="flex gap-1">
            <dt>{t('goodsReceipt.wizard.cert.field.certNumber')}:</dt>
            <dd>
              <Data as="span">{detail.certNumber}</Data>
            </dd>
          </div>
          <div className="flex gap-1">
            <dt>{t('goodsReceipt.wizard.cert.field.scheme')}:</dt>
            <dd className="font-medium">{t(`compliance.certType.${detail.certType}`)}</dd>
          </div>
          <div className="flex gap-1">
            <dt>{t('goodsReceipt.wizard.cert.field.issuer')}:</dt>
            <dd className="font-medium">{detail.issuer}</dd>
          </div>
          <div className="flex gap-1">
            <dt>{t('goodsReceipt.wizard.cert.field.expiry')}:</dt>
            <dd>
              <Data as="span">
                {detail.expiry === null
                  ? t('goodsReceipt.wizard.cert.valid.noExpiry')
                  : formatDate(detail.expiry)}
              </Data>
            </dd>
          </div>
        </dl>
      )}
      {/* ⚠️ THE SENTENCE THAT MAKES THIS A NOTICE AND NOT A BLOCK, ON THE
          SURFACE where the clerk reads it rather than only in a mode nobody
          can see. */}
      <div className="italic">{t('goodsReceipt.wizard.cert.notice.proceeds')}</div>
    </div>
  );
};

export default CertificateNotice;
