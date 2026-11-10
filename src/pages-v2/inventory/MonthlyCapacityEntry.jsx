/** @import React from 'react' */
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Button from '@components/ui-v2/Button';
import Data from '@components/ui-v2/Data';
import { HandoffNotice } from '@components/ui-v2/HandoffNotice';
import { useVerbAvailability } from '@hooks/useVerbAvailability';
import { useToast } from '@hooks/useToast';
import { useCapacityHeadsUp } from '@services/query/hooks';
import { useCapacityMonthCommand } from '@services/query/commandHooks';
import {
  capacityMonthRefusal,
  isMonthlyEntryMonth
} from '@services/transitions/capacityHeadsUpRules';
/** @import { CapacityPlan } from '@services/data/types' */
import { inputClass } from './inventoryDisplay';

// ─────────────────────────────────────────────────────────────────────────────
// PEX-4 (BL-269 BR-01) — the supplier states capacity BY MONTH for the months
// the weekly entry above does not cover [Proposed]. One verb, one notice in its
// slot: a seat without `capacity:confirm` sees the handoff notice instead of the
// form (the weekly form's rule). The refusal is `capacityMonthRefusal`, the one
// the verb's policy hook calls.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @type {React.FC<{ plan: CapacityPlan }>}
 */
const MonthlyCapacityEntry = ({ plan }) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const confirm = useVerbAvailability('capacity:confirm');
  const command = useCapacityMonthCommand();
  const heads = useCapacityHeadsUp();
  const row = (heads.data?.items ?? []).find(
    (r) => r.supplierId === plan.supplierId && r.planningGroupId === plan.planningGroupId
  );
  const horizon = plan.weeks.map((w) => w.week);
  const months = (row?.months ?? []).filter((m) => isMonthlyEntryMonth(m.month, horizon));
  const [draft, setDraft] = useState(
    /** @type {Record<string, { allocated: string; upside: string }>} */ ({})
  );
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the form re-opens on what is in force for the group
    setDraft(
      Object.fromEntries(
        months.map((m) => [
          m.month,
          {
            allocated: m.source === 'monthly' && m.capacity !== null ? String(m.capacity) : '',
            upside:
              m.source === 'monthly' && m.be !== null && m.capacity !== null && m.be > m.capacity
                ? String(m.be - m.capacity)
                : ''
          }
        ])
      )
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed on the group and the read's refresh, not the array
  }, [plan.planningGroupId, heads.dataUpdatedAt]);

  if (heads.isPending || months.length === 0)
    return months.length === 0 && !heads.isPending ? (
      <p className="text-xs text-text-tertiary mt-4" data-testid="capacity-month-none">
        {t('capHeadsUp.entry.none')}
      </p>
    ) : null;

  const entries = months
    .map((m) => ({ m: m.month, d: draft[m.month] }))
    .filter((e) => e.d && e.d.allocated.trim() !== '')
    .map((e) => ({
      month: e.m,
      allocated: Number(e.d.allocated),
      ...(e.d.upside.trim() !== '' ? { upside: Number(e.d.upside) } : {})
    }));
  const refusal = capacityMonthRefusal(
    entries,
    months.map((m) => m.month)
  );

  const submit = async () => {
    const res = await command.mutateAsync({
      supplierId: plan.supplierId,
      planningGroupId: plan.planningGroupId,
      months: entries
    });
    if (res.status === 'failed')
      toast({ variant: 'error', title: t('capHeadsUp.entry.failed'), description: res.reason });
    else toast({ variant: 'success', title: t('capHeadsUp.entry.done') });
  };

  return (
    <section className="mt-6" data-testid="capacity-month-entry">
      <h2 className="text-base font-semibold text-text-primary mb-1">
        {t('capHeadsUp.entry.title')}
      </h2>
      <p className="text-xs text-text-tertiary mb-3">{t('capHeadsUp.entry.intro')}</p>
      {confirm.kind !== 'held' ? (
        <HandoffNotice availability={confirm} testId="handoff-capacity-month" />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-3">
            {months.map((m) => (
              <div
                key={m.month}
                className="bg-bg-surface border border-border-subtle rounded-md p-3"
                data-testid={`capacity-month-${m.month}`}
              >
                <Data className="text-sm font-semibold">{m.month}</Data>
                <label
                  className="block text-label text-text-tertiary uppercase mt-2 mb-1"
                  htmlFor={`capm-${m.month}-cap`}
                >
                  {t('capHeadsUp.entry.capacity')} ({plan.uom})
                </label>
                <input
                  id={`capm-${m.month}-cap`}
                  data-testid={`capm-${m.month}-cap`}
                  type="number"
                  min="0"
                  className={inputClass}
                  value={draft[m.month]?.allocated ?? ''}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      [m.month]: { allocated: e.target.value, upside: d[m.month]?.upside ?? '' }
                    }))
                  }
                />
                <label
                  className="block text-label text-text-tertiary uppercase mt-2 mb-1"
                  htmlFor={`capm-${m.month}-up`}
                >
                  {t('capHeadsUp.entry.upside')} ({plan.uom})
                </label>
                <input
                  id={`capm-${m.month}-up`}
                  data-testid={`capm-${m.month}-up`}
                  type="number"
                  min="0"
                  className={inputClass}
                  value={draft[m.month]?.upside ?? ''}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      [m.month]: { allocated: d[m.month]?.allocated ?? '', upside: e.target.value }
                    }))
                  }
                />
              </div>
            ))}
          </div>
          <Button
            variant="outline"
            disabled={entries.length === 0 || refusal !== null || command.isPending}
            onClick={() => void submit()}
            data-testid="capacity-month-save"
          >
            {t('capHeadsUp.entry.save')}
          </Button>
        </>
      )}
    </section>
  );
};

export default MonthlyCapacityEntry;
