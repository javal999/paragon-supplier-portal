import React, { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import StatusPill from '../../components/ui-v2/StatusPill';
import { usePlanningGroups } from '../../services/query/hooks';
import type { PlanningGroupView } from '../../services/data/types';

// ─────────────────────────────────────────────────────────────────────────────
// Material C5 · how a planning group is named on screen (MR-8; AR-15, MAT-R6).
//
// A planning group's name is DATA Material Planning typed, read from the
// planning group store. The one exception is a default group nobody renamed:
// its name is its SAP group's, which the `inv.group.*` strings carry in both
// languages. Every capacity and alert surface names a group through here.
// ─────────────────────────────────────────────────────────────────────────────

/** The label of one resolved planning group. */
export function planningGroupLabel(
  t: TFunction,
  g: Pick<PlanningGroupView, 'name' | 'named' | 'sapMaterialGroup'>,
): string {
  return g.named ? g.name : t(`inv.group.${g.sapMaterialGroup}`);
}

/** A label lookup by planning group id; an id the store does not hold echoes back. */
export function usePlanningGroupLabel(): (id: string) => string {
  const { t } = useTranslation();
  const query = usePlanningGroups();
  const byId = useMemo(() => new Map((query.data?.items ?? []).map((g) => [g.id, g])), [query.data]);
  return useCallback(
    (id: string) => {
      const g = byId.get(id);
      return g ? planningGroupLabel(t, g) : id;
    },
    [byId, t],
  );
}

/**
 * MR-8 BR-07 — the planning group an alert is about: the group itself for a
 * capacity alert, else the group of the alert's material. Null when the
 * material is in no group the reader can see.
 */
export function alertPlanningGroup(
  a: { readonly rule: string; readonly subject: string },
  groups: readonly Pick<PlanningGroupView, 'id' | 'materials'>[],
): string | null {
  if (a.rule === 'capacityBelowDemand') return a.subject;
  return groups.find((g) => g.materials.includes(a.subject))?.id ?? null;
}

/** MR-8 BR-05 — a capacity week a planning-group move asks the supplier to enter again. */
export const ReEntryPill: React.FC<{ testId?: string }> = ({ testId }) => {
  const { t } = useTranslation();
  return (
    <span data-testid={testId} className="ml-2 align-middle">
      <StatusPill variant="warning">{t('inv.capacity.needsReEntry')}</StatusPill>
    </span>
  );
};
