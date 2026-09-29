import React from 'react';
import { useTranslation } from 'react-i18next';
import StatusPill from '../../components/ui-v2/StatusPill';
import { useUpdateCompliance } from '../../services/query/hooks';
import { complianceThresholds } from '../../services/transitions/inventoryConfig';
import {
  compliancePill,
  isComplianceFlagged,
  type CompliancePill,
} from '../../services/transitions/updateCompliance';

// ─────────────────────────────────────────────────────────────────────────────
// Material B4 (MR-2 step 4, BR-04, BR-06) — each bidder's weekly update
// compliance on the RFQ and RFP award panels, and the red flag the one reason
// rule (`awardReasonOwed`) reads. The figure is the same read the scorecard
// shows (`useUpdateCompliance`); the colours are the pure `compliancePill`
// over the hub settings `compliance.warnPct` and `compliance.flagPct`.
// ─────────────────────────────────────────────────────────────────────────────

const VARIANT: Record<CompliancePill, 'neutral' | 'warning' | 'danger'> = {
  plain: 'neutral',
  amber: 'warning',
  red: 'danger',
  noHistory: 'neutral',
};

/** What the award panel reads per supplier: the figure, and whether it is red-flagged. */
export interface AwardCompliance {
  /** Undefined while the read is loading or the supplier is unknown. */
  readonly pctOf: (supplierId: string) => number | null | undefined;
  readonly flagged: (supplierId: string) => boolean;
}

export function useAwardCompliance(): AwardCompliance {
  const compliance = useUpdateCompliance();
  const byId = new Map((compliance.data?.items ?? []).map((c) => [c.supplierId, c.pct] as const));
  return {
    pctOf: (supplierId) => (byId.has(supplierId) ? byId.get(supplierId)! : undefined),
    flagged: (supplierId) => isComplianceFlagged(byId.get(supplierId) ?? null, complianceThresholds().flagPct),
  };
}

/** The pill beside a bid: plain, amber, red, or grey "No history", with the definition as its tooltip. */
export const ComplianceAwardPill: React.FC<{ pct: number | null | undefined; testId: string }> = ({ pct, testId }) => {
  const { t } = useTranslation();
  if (pct === undefined) return null;
  const thresholds = complianceThresholds();
  const pill = compliancePill(pct, thresholds);
  const tip =
    pct === null
      ? t('rfqCompare.award.compliance.tipNoHistory')
      : t('rfqCompare.award.compliance.tip', { pct, ...thresholds });
  return (
    <span className="inline-flex ml-2" title={tip} aria-label={tip} data-testid={testId} data-pill={pill}>
      <StatusPill variant={VARIANT[pill]}>
        {pct === null ? t('rfx.noHistory') : t('rfqCompare.award.compliance.value', { pct })}
      </StatusPill>
    </span>
  );
};
