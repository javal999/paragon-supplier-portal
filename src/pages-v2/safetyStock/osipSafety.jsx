/** @import React from 'react' */
/** @import { OsipRules } from '@services/transitions/osipRules' */
/** @import { MaterialOsipInputs, OsipSafetyFigures, OsipSupplierInput } from '@services/transitions/osipSafetyRules' */
/** @import { Uom } from '@services/sdc/types' */
import { useTranslation } from 'react-i18next';
import TermLabel from '@components/ui-v2/TermLabel';
import Data from '@components/ui-v2/Data';
import SelectField from '@components/ui-v2/SelectField';
import { formatNumber } from '@lib/format';
import { OSIP_RULES } from '@services/transitions/osipRules';
import { OSIP_SAFETY_QUESTIONS } from '@services/transitions/osipSafetyRules';
import { qtyOf } from '../materialPlan/planDisplay';

// ─────────────────────────────────────────────────────────────────────────────
// BL-193 (DRC-7) and BL-197 (DRC-11) on the Safety stock targets page:
//   · the safety order (ROP Order) and the ROP Fisik safety per supplier of
//     each material, the OSIP default rule;
//   · the demand CV of each material and its category;
//   · the rule switches (sdSource, safetyRounding, fisikSafety,
//     fisikDemandIncludesLtp): read only, they recompute the view with a
//     rules variant and store nothing.
// Every figure is `osipSafety` / `materialCvs`'s (osipSafetyRules.js); none is
// computed here. Each column carries "Provisional: rule awaiting Material
// Planning" with its question IDs (design rule 5).
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The four switches the page offers, as the rules keys they set.
 * @typedef {Pick<OsipRules, 'sdSource' | 'safetyRounding' | 'fisikSafety' | 'fisikDemandIncludesLtp'>} OsipSwitches
 */

/** @returns {OsipSwitches} The defaults in force (OSIP_RULES). */
export const defaultSwitches = () => ({
  sdSource: OSIP_RULES.sdSource,
  safetyRounding: OSIP_RULES.safetyRounding,
  fisikSafety: OSIP_RULES.fisikSafety,
  fisikDemandIncludesLtp: OSIP_RULES.fisikDemandIncludesLtp
});

/**
 * Whether the switches differ from the defaults.
 * @param {OsipSwitches} s
 * @returns {boolean}
 */
export const isVariant = (s) =>
  s.sdSource !== OSIP_RULES.sdSource ||
  s.safetyRounding !== OSIP_RULES.safetyRounding ||
  s.fisikSafety !== OSIP_RULES.fisikSafety ||
  s.fisikDemandIncludesLtp !== OSIP_RULES.fisikDemandIncludesLtp;

/**
 * Design rule 5 — the provisional label under a column title.
 * @type {React.FC<{ questions: readonly string[]; testId: string }>}
 */
export const ProvisionalNote = ({ questions, testId }) => {
  const { t } = useTranslation();
  // Every question behind the figure is answered: no label.
  if (questions.length === 0) return null;
  return (
    <span className="block text-xs font-normal normal-case text-text-tertiary" data-testid={testId}>
      {t('sst.osip.provisional', { questions: questions.join(', ') })}
    </span>
  );
};

/** BL-233 — the glossary term each OSIP safety column is labelled by. */
const OSIP_COLUMN_TERM = /** @type {const} */ ({
  safetyOrder: 'safetyOrderRopOrder',
  fisikSafety: 'ropFisikSafety',
  cv: 'demandCv'
});

/**
 * The column titles' provisional notes, by column.
 * @type {React.FC<{ column: keyof typeof OSIP_SAFETY_QUESTIONS }>}
 */
export const OsipColumnTitle = ({ column }) => {
  const { t } = useTranslation();
  return (
    <>
      <TermLabel term={OSIP_COLUMN_TERM[column]} />
      <ProvisionalNote
        questions={OSIP_SAFETY_QUESTIONS[column]}
        testId={`sst-osip-prov-${column}`}
      />
      {column === 'fisikSafety' && (
        <span
          className="block text-xs font-normal normal-case text-text-tertiary"
          data-testid="sst-osip-no-capacity"
        >
          {t('sst.osip.noCapacity')}
        </span>
      )}
    </>
  );
};

/**
 * The rule switches. Read only in effect: the page recomputes with them.
 * @type {React.FC<{ value: OsipSwitches; onChange: (next: OsipSwitches) => void }>}
 */
export const OsipRuleSwitches = ({ value, onChange }) => {
  const { t } = useTranslation();
  const labelClass = 'block text-label text-text-tertiary uppercase mb-1';
  /**
   * @param {string} id
   * @param {string} label
   * @param {{ value: string; label: string }[]} options
   * @param {string} current
   * @param {(v: string) => void} set
   */
  const field = (id, label, options, current, set) => (
    <div>
      <label className={labelClass} htmlFor={`sst-osip-${id}`}>
        {label}
      </label>
      <SelectField
        id={`sst-osip-${id}`}
        testId={`sst-osip-switch-${id}`}
        options={options}
        value={current}
        onChange={(v) => {
          if (v !== null) set(v);
        }}
      />
    </div>
  );
  return (
    <section
      className="bg-bg-surface border border-border-subtle rounded-lg p-4 mb-6"
      data-testid="sst-osip-switches"
    >
      <h2 className="text-section text-text-primary mb-1">{t('sst.osip.rules.title')}</h2>
      <p className="text-xs text-text-tertiary mb-3">{t('sst.osip.rules.note')}</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {field(
          'sdSource',
          t('sst.osip.rules.sdSource'),
          [
            { value: 'ltp13w', label: t('sst.osip.rules.sdSource.ltp13w') },
            { value: 'ltp', label: t('sst.osip.rules.sdSource.ltp') },
            { value: 'consumption12w', label: t('sst.osip.rules.sdSource.consumption12w') }
          ],
          value.sdSource,
          (v) => onChange({ ...value, sdSource: /** @type {OsipSwitches['sdSource']} */ (v) })
        )}
        {field(
          'safetyRounding',
          t('sst.osip.rules.safetyRounding'),
          [
            { value: 'mpq', label: t('sst.osip.rules.safetyRounding.mpq') },
            { value: 'koli', label: t('sst.osip.rules.safetyRounding.koli') },
            { value: 'moq', label: t('sst.osip.rules.safetyRounding.moq') }
          ],
          value.safetyRounding,
          (v) =>
            onChange({
              ...value,
              safetyRounding: /** @type {OsipSwitches['safetyRounding']} */ (v)
            })
        )}
        {field(
          'fisikSafety',
          t('sst.osip.rules.fisikSafety'),
          [
            { value: 'deck', label: t('sst.osip.rules.fisikSafety.deck') },
            { value: 'sheet', label: t('sst.osip.rules.fisikSafety.sheet') }
          ],
          value.fisikSafety,
          (v) => onChange({ ...value, fisikSafety: /** @type {OsipSwitches['fisikSafety']} */ (v) })
        )}
        {field(
          'fisikDemandIncludesLtp',
          t('sst.osip.rules.fisikDemandIncludesLtp'),
          [
            { value: 'on', label: t('sst.osip.rules.fisikDemandIncludesLtp.on') },
            { value: 'off', label: t('sst.osip.rules.fisikDemandIncludesLtp.off') }
          ],
          value.fisikDemandIncludesLtp ? 'on' : 'off',
          (v) => onChange({ ...value, fisikDemandIncludesLtp: v === 'on' })
        )}
      </div>
      {isVariant(value) && (
        <p className="text-xs text-warning-hover mt-3" data-testid="sst-osip-variant">
          {t('sst.osip.rules.changed')}
        </p>
      )}
    </section>
  );
};

/**
 * One supplier line inside a cell: the supplier, then the figure or why not.
 * @type {React.FC<{ s: OsipSupplierInput; testId: string; children: React.ReactNode }>}
 */
const SupplierLine = ({ s, testId, children }) => (
  <div className="mb-1 last:mb-0" data-testid={testId}>
    <div className="text-xs text-text-tertiary">{s.supplierName}</div>
    {children}
  </div>
);

/**
 * BL-193 — the safety order per supplier of a material.
 * @type {React.FC<{ materialCode: string; uom: Uom; osip: MaterialOsipInputs; figures: readonly OsipSafetyFigures[] }>}
 */
export const SafetyOrderCell = ({ materialCode, uom, osip, figures }) => {
  const { t } = useTranslation();
  return (
    <>
      {osip.suppliers.map((s, i) => {
        const so = figures[i].safetyOrder;
        const id = `sst-osip-so-${materialCode}-${s.supplierId}`;
        return (
          <SupplierLine key={s.supplierId} s={s} testId={`${id}-line`}>
            {so.value === null ? (
              <span className="text-xs text-text-tertiary" data-testid={id}>
                {t(`sst.osip.unavailable.${so.unavailable}`)}
              </span>
            ) : (
              <Data
                data-testid={id}
                title={t('sst.osip.soTitle', {
                  sd: formatNumber(Math.round(so.sd ?? 0)),
                  weeks: s.leadTimeWeeks,
                  roundTo: formatNumber(so.roundTo)
                })}
              >
                {`${qtyOf(so.value, uom)} ${uom}`}
              </Data>
            )}
            {figures[i].flags.includes('NO_ROUNDING_SIZE') && so.value !== null && (
              <div className="text-xs text-text-tertiary">
                {t('sst.osip.flag.NO_ROUNDING_SIZE')}
              </div>
            )}
          </SupplierLine>
        );
      })}
    </>
  );
};

/**
 * BL-193 — the ROP Fisik safety per supplier of a material.
 * @type {React.FC<{ materialCode: string; uom: Uom; osip: MaterialOsipInputs; figures: readonly OsipSafetyFigures[]; includesLtp: boolean }>}
 */
export const FisikSafetyCell = ({ materialCode, uom, osip, figures, includesLtp }) => {
  const { t } = useTranslation();
  return (
    <>
      {osip.suppliers.map((s, i) => {
        const f = figures[i].fisik;
        const id = `sst-osip-fisik-${materialCode}-${s.supplierId}`;
        return (
          <SupplierLine key={s.supplierId} s={s} testId={`${id}-line`}>
            {f.value === null ? (
              <span className="text-xs text-text-tertiary" data-testid={id}>
                {t(`sst.osip.unavailable.${f.unavailable}`)}
              </span>
            ) : (
              <Data
                data-testid={id}
                title={t('sst.osip.fisikTitle', {
                  demand: qtyOf(f.demandPerDay ?? 0, uom),
                  f: f.f === null ? '—' : formatNumber(f.f)
                })}
              >
                {`${qtyOf(f.value, uom)} ${uom}`}
              </Data>
            )}
            {includesLtp && figures[i].flags.includes('LTP_NOT_AVAILABLE') ? (
              <div
                className="text-xs text-text-tertiary"
                data-testid={`sst-osip-noltp-${materialCode}-${s.supplierId}`}
              >
                {t('sst.osip.flag.LTP_NOT_AVAILABLE')}
              </div>
            ) : null}
          </SupplierLine>
        );
      })}
    </>
  );
};

/**
 * BL-197 — the material's demand CV and its category.
 * @type {React.FC<{ materialCode: string; osip: MaterialOsipInputs }>}
 */
export const CvCell = ({ materialCode, osip }) => {
  const { t } = useTranslation();
  const c = osip.cv;
  if (c.cv === null)
    return (
      <span className="text-xs text-text-tertiary" data-testid={`sst-cv-${materialCode}`}>
        {t(c.noBom ? 'sst.osip.cv.noBom' : 'sst.osip.cv.noDemand')}
      </span>
    );
  return (
    <div
      title={t('sst.osip.cv.title', {
        count: c.skus.length,
        // [Team C1] six full months, monthly buckets.
        window:
          OSIP_RULES.cvBucket === 'month'
            ? t('sst.osip.cv.windowMonths', { count: OSIP_RULES.cvWindowMonths })
            : t('sst.osip.cv.windowWeeks', { count: OSIP_RULES.cvWindowWeeks })
      })}
    >
      <Data data-testid={`sst-cv-${materialCode}`}>
        {formatNumber(Math.round(c.cv * 100) / 100)}
      </Data>
      <div className="text-xs text-text-secondary" data-testid={`sst-cv-cat-${materialCode}`}>
        {t(`sst.osip.cv.${c.category}`)}
      </div>
    </div>
  );
};
