// ────────────────────────────────────────────────────────────────────────────
// SOURCING TYPE AND BIDDING ELIGIBILITY ON SCREEN — Material G2 (MR-10 BR-05
// to BR-07, edge case 1).
//
// The sourcing type pill on an event, the "not qualified" marker on an
// invitee row and an award row, and the map a draft reads its type from. The
// rules are `services/sourcing/sourcingType.ts`; nothing here decides.
// ────────────────────────────────────────────────────────────────────────────

import React, { useSyncExternalStore } from 'react';
import { useTranslation } from 'react-i18next';
import StatusPill from '../../components/ui-v2/StatusPill';
import {
  missingText,
  sourcingTypeOf,
  type BiddingEligibility,
  type SourcingEventFacts,
  type NamedEligibility,
  type SourcingType,
  type SourcingTypeMap,
} from '../../services/sourcing/sourcingType';
import { sourcingTypeStore } from '../../services/transitions/sourcingTypeStore';

/** The sourcing type map in force, re-read when Procurement changes it. */
export function useSourcingTypeMap(): SourcingTypeMap {
  return useSyncExternalStore(sourcingTypeStore.subscribe, () => sourcingTypeStore.map());
}

/** "Sourcing type: Direct" on an event header or a wizard step. */
export const SourcingTypePill: React.FC<{ type: SourcingType; testId?: string }> = ({ type, testId }) => {
  const { t } = useTranslation();
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-text-secondary" data-testid={testId} title={t('sourcingType.fromCategory')}>
      {t('sourcingType.label')}
      <StatusPill variant="neutral">{t(`sourcingType.${type}`)}</StatusPill>
    </span>
  );
};

/** The pill for an event: its stored type, Direct if published before G2, or the map's for a Draft. */
export const EventSourcingType: React.FC<{ event: SourcingEventFacts; testId?: string }> = ({ event, testId }) => {
  const map = useSourcingTypeMap();
  return <SourcingTypePill type={sourcingTypeOf(event, map)} {...(testId ? { testId } : {})} />;
};

/**
 * Why a vendor is below the level: nothing when it is qualified. `warn`
 * (placeholder lists) reads amber and the vendor stays selectable; `refused`
 * reads red and the row is not selectable.
 */
export const EligibilityMarker: React.FC<{ eligibility: BiddingEligibility | undefined; testId?: string }> = ({
  eligibility,
  testId,
}) => {
  const { t } = useTranslation();
  if (!eligibility || eligibility.state === 'qualified') return null;
  const warn = eligibility.state === 'warn';
  const docs = missingText(eligibility);
  return (
    <span
      className="inline-flex flex-col items-start gap-0.5"
      data-testid={testId}
      data-state={eligibility.state}
    >
      <StatusPill variant={warn ? 'warning' : 'danger'}>{t(warn ? 'elig.warn' : 'elig.refused')}</StatusPill>
      <span className={`text-xs font-normal normal-case ${warn ? 'text-warning-hover' : 'text-danger'}`}>
        {t('elig.needs', {
          have: t(`qualification.level.${eligibility.level}`),
          type: t(`sourcingType.${eligibility.sourcingType}`),
          need: t(`qualification.level.${eligibility.requiredLevel}`),
        })}
        {docs ? ` ${t('elig.missing', { docs })}` : ''}
      </span>
    </span>
  );
};

/** The vendors an award refusal or a reason names, as one line. */
export const vendorNames = (vendors: readonly NamedEligibility[]): string => vendors.map((v) => v.supplierName).join(', ');
