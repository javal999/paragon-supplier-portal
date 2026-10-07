/** @import * as React from 'react' */
import { useTranslation } from 'react-i18next';
import FormSection from '../../../ui-v2/FormSection';
import Data from '../../../ui-v2/Data';
// GL-1 - the glossary destination for this surface's refusals.
import GlossaryTermChip from '../../../ui-v2/GlossaryTermChip';
import { labelFor, radioCls } from './fieldParts';
import RegulatoryCheck from './RegulatoryCheck';
import CertificateNotice from './CertificateNotice';
import { formatNumber } from '../utils';
/** @import { LineDraft } from '../utils' */
/** @import { GrLineQtyOutcome } from '../../grLineQuantities' */
/** @import { BpomRefusalReason } from '@services/sdc/bpom' */
/** @import { HalalRefusalReason } from '@services/sdc/halal' */
/** @import { HalalVerification } from '@services/data/halalVerification' */

// CP-2 · 2B-4b — each BPOM refusal NAMES what is missing. Same shape as
// GR_QTY_REFUSAL_KEY (`ReceiptStep.jsx`), and for the same reason: a refusal
// that cannot say which absence it hit is half a refusal (the `uomOf`
// precedent).
//
// ⚠️ THE TWO REASONS DIFFER ONLY IN THE SENTENCE. They refuse IDENTICALLY —
// same `!ok`, same blocked step, same absent determination. `reason` exists so
// the message can name the gap, NOT so a caller can pick which refusal to
// ignore, and nothing here or in `qualityValid` branches on it to proceed.
/** @type {Record<BpomRefusalReason, string>} */
const GR_BPOM_REFUSAL_KEY = {
  UNKNOWN_MATERIAL: 'goodsReceipt.wizard.bpom.refused.unknownMaterial',
  UNDETERMINED_APPLICABILITY: 'goodsReceipt.wizard.bpom.refused.undetermined'
};

// CP-3 · H2 — the same shape for halal, and the SAME RULE: `reason` reaches the
// MESSAGE and nothing else. Nothing here, and nothing in `qualityValid`,
// branches on it to proceed — one refusal branch, both reasons.
/** @type {Record<HalalRefusalReason, string>} */
const GR_HALAL_REFUSAL_KEY = {
  UNKNOWN_MATERIAL: 'goodsReceipt.wizard.halal.refused.unknownMaterial',
  UNDETERMINED_APPLICABILITY: 'goodsReceipt.wizard.halal.refused.undetermined'
};

/**
 * @typedef {object} QualityStepProps
 * @property {LineDraft[]} lines
 * @property {GrLineQtyOutcome[]} lineQtys -  The ONE parse of every line's quantity pair, index-aligned with `lines`.
 * @property {readonly (HalalVerification | null)[]} certVerdicts -  The certificate verdict per line, `null` where no halal certificate is owed.
 * @property {string} supplierName -  The active source's supplier, for the certificate notice.
 * @property {(idx: number, patch: Partial<LineDraft>) => void} updateLine
 * @property {(token: string) => string} el -  Display resolver for the Pass/Fail/N/A tokens — the STORED value stays EN.
 */

/**
 * Step 3 — per-line quality inspection: visual and packaging checks, the halal
 * seal and BPOM lot checks where the master requires them, the certificate
 * notice, the regulatory refusals, and the lab-sample request.
 * @type {React.FC<QualityStepProps>}
 */
const QualityStep = ({ lines, lineQtys, certVerdicts, supplierName, updateLine, el }) => {
  const { t } = useTranslation();
  return (
    <FormSection
      eyebrow={t('goodsReceipt.wizard.section.qualityEyebrow')}
      title={t('goodsReceipt.wizard.section.perLineInspection')}
    >
      <div className="flex flex-col gap-4">
        {lines.map((l, i) => (
          <div
            key={l.lineKey}
            className="border border-border-subtle rounded-md p-4 flex flex-col gap-3"
          >
            <div className="flex justify-between items-start">
              <div>
                <Data as="div" className="text-sm text-text-primary">
                  {l.materialCode}
                </Data>
                <div className="text-xs text-text-tertiary">{l.description}</div>
              </div>
              <div className="text-xs text-text-tertiary">
                <Data>{lineQtys[i]?.ok ? formatNumber(lineQtys[i].received) : '—'}</Data>{' '}
                {t('goodsReceipt.wizard.receivedSuffix')}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                {labelFor(t('goodsReceipt.wizard.field.visualInspection'))}
                <div className="flex gap-4">
                  {
                    /** @type {const} */ (['Pass', 'Fail']).map((v) => (
                      <label key={v} className={radioCls}>
                        <input
                          type="radio"
                          name={`vis-${i}`}
                          value={v}
                          checked={l.visualCheck === v}
                          onChange={() => updateLine(i, { visualCheck: v })}
                        />
                        {el(v)}
                      </label>
                    ))
                  }
                </div>
              </div>
              <div>
                {labelFor(t('goodsReceipt.wizard.field.packagingIntegrity'))}
                <div className="flex gap-4">
                  {
                    /** @type {const} */ (['Pass', 'Fail', 'N/A']).map((v) => (
                      <label key={v} className={radioCls}>
                        <input
                          type="radio"
                          name={`pkg-${i}`}
                          value={v}
                          checked={l.packagingCheck === v}
                          onChange={() => updateLine(i, { packagingCheck: v })}
                        />
                        {el(v)}
                      </label>
                    ))
                  }
                </div>
              </div>
              {/* THE THREE STATES, and they are told apart by SHAPE:
                  · NOT REQUIRED           → no row at all
                  · REQUIRED, UNANSWERED   → row, nothing selected, marker
                  · REQUIRED, ANSWERED     → row, a selection, no marker
                  Neither check opens with an answer (`REQUIRED-OPENS-PRE-
                  ANSWERED-01`); both block `qualityValid` until ticked. */}
              {l.halal.ok && l.halal.required && (
                <RegulatoryCheck
                  name={`halal-${i}`}
                  label={t('goodsReceipt.wizard.field.halalSealCheck')}
                  value={l.halalSealCheck}
                  onChange={(v) => updateLine(i, { halalSealCheck: v })}
                  el={el}
                  unansweredText={t('goodsReceipt.wizard.check.unanswered')}
                  testId={`gr-halal-unanswered-${i}`}
                />
              )}
              {/* CP-3 · H4 — the CERTIFICATE half of the halal fact, directly
                  under the SEAL half. Two facts, two rows, never merged: an
                  inspector's attestation about a physical seal and a document's
                  validity at the receipt instant are different questions with
                  different answerers, and one combined row would let a ticked
                  seal read as a valid certificate. */}
              {certVerdicts[i] != null && (
                <CertificateNotice
                  verdict={
                    /** @type {NonNullable<(typeof certVerdicts)[number]>} */ (certVerdicts[i])
                  }
                  materialCode={l.materialCode}
                  supplierName={supplierName}
                  index={i}
                />
              )}
              {l.bpom.ok && l.bpom.applicable && (
                <RegulatoryCheck
                  name={`bpom-${i}`}
                  label={t('goodsReceipt.wizard.field.bpomLotTracking')}
                  value={l.bpomLotCheck}
                  onChange={(v) => updateLine(i, { bpomLotCheck: v })}
                  el={el}
                  unansweredText={t('goodsReceipt.wizard.check.unanswered')}
                  testId={`gr-bpom-unanswered-${i}`}
                />
              )}
              {/* THE REFUSALS, BY NAME. Not a hidden row and not a skipped
                  check: the line says which material it cannot answer for and
                  why, and `qualityValid` will not let the wizard past this step.
                  ⚠️ TWO SEPARATE BANNERS, NEVER MERGED — a line can be refused
                  by one regime and answerable by the other, and four of the nine
                  receivable lines are exactly that shape (BPOM determined
                  not-applicable, halal undetermined). Collapsing them into one
                  "compliance cannot be determined" message would lose which
                  regulator has not ruled. */}
              {!l.halal.ok && (
                <div
                  data-testid={`gr-halal-refusal-${i}`}
                  role="alert"
                  className="col-span-2 rounded-md border border-warning bg-warning-soft px-3 py-2 text-xs text-warning-hover"
                >
                  <span className="font-semibold">
                    {t('goodsReceipt.wizard.halal.refused.title')}
                  </span>{' '}
                  {t(GR_HALAL_REFUSAL_KEY[l.halal.reason], {
                    code: l.halal.materialCode
                  })}{' '}
                  <GlossaryTermChip
                    refTo={{ sourceType: 'HalalRefusalReason', term: l.halal.reason }}
                  />
                </div>
              )}
              {!l.bpom.ok && (
                <div
                  data-testid={`gr-bpom-refusal-${i}`}
                  role="alert"
                  className="col-span-2 rounded-md border border-warning bg-warning-soft px-3 py-2 text-xs text-warning-hover"
                >
                  <span className="font-semibold">
                    {t('goodsReceipt.wizard.bpom.refused.title')}
                  </span>{' '}
                  {t(GR_BPOM_REFUSAL_KEY[l.bpom.reason], {
                    code: l.bpom.materialCode
                  })}{' '}
                  <GlossaryTermChip
                    refTo={{ sourceType: 'BpomRefusalReason', term: l.bpom.reason }}
                  />
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-border-subtle">
              <label className="flex items-center gap-2 text-sm text-text-primary cursor-pointer">
                <input
                  type="checkbox"
                  checked={l.labSampleRequired}
                  onChange={(e) => updateLine(i, { labSampleRequired: e.target.checked })}
                />
                {t('goodsReceipt.wizard.labSampleRequired')}
              </label>
              {l.labSampleRequired && (
                <div className="text-xs text-text-secondary">
                  {t('goodsReceipt.wizard.labRequestId')} <Data>{l.labRequestId}</Data>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </FormSection>
  );
};

export default QualityStep;
