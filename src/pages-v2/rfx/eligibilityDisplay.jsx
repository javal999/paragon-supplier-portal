// ────────────────────────────────────────────────────────────────────────────
// SOURCING TYPE AND BIDDING ELIGIBILITY ON SCREEN — Material G2 (MR-10 BR-05
// to BR-07, edge case 1).
//
// The sourcing type pill on an event, the "not qualified" marker on an
// invitee row and an award row, and the map a draft reads its type from. The
// rules are `services/sourcing/sourcingType.js`; nothing here decides.
// ────────────────────────────────────────────────────────────────────────────

/** @import React from 'react' */
import { useSyncExternalStore } from 'react';
import { useTranslation } from 'react-i18next';
import StatusPill from '@components/ui-v2/StatusPill';
/** @import { BiddingEligibility, SourcingEventFacts, NamedEligibility, QualificationWarning, SourcingType, SourcingTypeMap } from '@services/sourcing/sourcingType' */
import { missingText, sourcingTypeOf } from '@services/sourcing/sourcingType';
import { sourcingTypeStore } from '@services/transitions/sourcingTypeStore';

/**
 * The sourcing type map in force, re-read when Procurement changes it.
 * @returns {SourcingTypeMap}
 */
export function useSourcingTypeMap() {
  return useSyncExternalStore(sourcingTypeStore.subscribe, () => sourcingTypeStore.map());
}

/**
 * "Sourcing type: Direct" on an event header or a wizard step.
 * @type {React.FC<{ type: SourcingType; testId?: string }>}
 */
export const SourcingTypePill = ({ type, testId }) => {
  const { t } = useTranslation();
  return (
    <span
      className="inline-flex items-center gap-1.5 text-xs text-text-secondary"
      data-testid={testId}
      title={t('sourcingType.fromCategory')}
    >
      {t('sourcingType.label')}
      <StatusPill variant="neutral">{t(`sourcingType.${type}`)}</StatusPill>
    </span>
  );
};

/**
 * The pill for an event: its stored type, Direct if published before G2, or the map's for a Draft.
 * @type {React.FC<{ event: SourcingEventFacts; testId?: string }>}
 */
export const EventSourcingType = ({ event, testId }) => {
  const map = useSourcingTypeMap();
  return <SourcingTypePill type={sourcingTypeOf(event, map)} {...(testId ? { testId } : {})} />;
};

/**
 * Why a vendor is below the level: nothing when it is qualified. `warn`
 * (placeholder lists) reads amber and the vendor stays selectable; `refused`
 * reads red and the row is not selectable.
 *
 * RFx UX B-14 — the explanation is said ONCE per supplier, where the invitees
 * are listed. `compact` renders the pill alone with the same explanation as
 * its tooltip, for every other place the supplier appears (the award panel),
 * so the two lines no longer repeat under each item.
 * @type {React.FC<{ eligibility: BiddingEligibility | undefined; testId?: string; compact?: boolean }>}
 */
export const EligibilityMarker = ({ eligibility, testId, compact = false }) => {
  const { t } = useTranslation();
  if (!eligibility || eligibility.state === 'qualified') return null;
  const warn = eligibility.state === 'warn';
  const docs = missingText(eligibility);
  const why = `${t('elig.needs', {
    have: t(`qualification.level.${eligibility.level}`),
    type: t(`sourcingType.${eligibility.sourcingType}`),
    need: t(`qualification.level.${eligibility.requiredLevel}`)
  })}${docs ? ` ${t('elig.missing', { docs })}` : ''}`;
  return (
    <span
      className="inline-flex flex-col items-start gap-0.5"
      data-testid={testId}
      data-state={eligibility.state}
      {...(compact ? { title: why, 'data-compact': 'true' } : {})}
    >
      <StatusPill variant={warn ? 'warning' : 'danger'}>
        {t(warn ? 'elig.warn' : 'elig.refused')}
      </StatusPill>
      {!compact && (
        <span
          className={`text-xs font-normal normal-case ${warn ? 'text-warning-hover' : 'text-danger'}`}
        >
          {why}
        </span>
      )}
    </span>
  );
};

/**
 * BL-147 (FU-14) — the warnings an event kept at publish, or an award record
 * kept at award, while the qualification lists were placeholders (MAT-D19):
 * each vendor with its level against the one the event's type needs, and the
 * documents it was missing, AS RECORDED THEN. `awarded` also shows the reason
 * the award was given with. Nothing when there is no warning. The read model
 * narrows the list for a supplier (MAT-R4); nothing is narrowed here.
 * @type {React.FC<{ kind: 'published' | 'awarded'; warnings: readonly QualificationWarning[] | undefined; supplierName: (supplierId: string) => string; reason?: string; testId: string; }>}
 */
export const QualificationWarningsNote = ({ kind, warnings, supplierName, reason, testId }) => {
  const { t } = useTranslation();
  if (!warnings || warnings.length === 0) return null;
  return (
    <div
      className="rounded-md border border-border-subtle bg-bg-hover px-3 py-2 text-xs"
      data-testid={testId}
    >
      <div className="flex flex-wrap items-center gap-2">
        <StatusPill variant="warning">{t(`elig.${kind}`, { count: warnings.length })}</StatusPill>
      </div>
      <ul className="mt-1 space-y-0.5 text-warning-hover">
        {warnings.map((w) => (
          <li key={w.supplierId} data-testid={`${testId}-${w.supplierId}`}>
            <span className="font-medium">{supplierName(w.supplierId)}</span>{' '}
            {t('elig.needs', {
              have: t(`qualification.level.${w.level}`),
              type: t(`sourcingType.${w.sourcingType}`),
              need: t(`qualification.level.${w.requiredLevel}`)
            })}
            {w.missing.length > 0 ? ` ${t('elig.missing', { docs: w.missing.join(', ') })}` : ''}
          </li>
        ))}
      </ul>
      {!!reason && (
        <p className="mt-1 text-text-secondary">{t('elig.awarded.reason', { reason })}</p>
      )}
      <p className="mt-1 text-text-tertiary">{t('elig.recorded.hint')}</p>
    </div>
  );
};

/**
 * The vendors an award refusal or a reason names, as one line.
 * @param {readonly NamedEligibility[]} vendors
 * @returns {string}
 */
export const vendorNames = (vendors) => vendors.map((v) => v.supplierName).join(', ');
