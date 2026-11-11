/** @import React from 'react' */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Button from '@components/ui-v2/Button';
import Data from '@components/ui-v2/Data';
import { HandoffNotice } from '@components/ui-v2/HandoffNotice';
import { FIELD_FOCUS_RING } from '@components/forecast/focusRing';
import { useVerbAvailability } from '@hooks/useVerbAvailability';
import { useToast } from '@hooks/useToast';
import { useRefusalText } from '@hooks/useRefusalText';
import { usePromotionCommand } from '@services/query/commandHooks';
import { PROMOTION_PERCENT_MAX, PROMOTION_UNITS_MAX } from '@services/engine/promotions';
/** @import { PromotionKind, PromotionRow } from '@services/engine/promotions' */
/** @import { DemandForecastSkuView } from '@services/data/types' */
import { formatDate, formatDateTime, formatNumber } from '@lib/format';

// ─────────────────────────────────────────────────────────────────────────────
// REQ-E14-08 BR-05 (BL-235) — the promotion entry for ONE SKU, under its weeks.
// The planner picks a week of the forecast, states the increase as a percentage
// or as units, and saves; a promotion in force can be changed or withdrawn. The
// forecast adds it to that week for this SKU only, and the weeks grid marks the
// week. Every entry is stamped with who and when; the SKU's history is listed.
// One verb, one notice in its slot: a seat without `promotion:set` sees who owns
// the act and no form (§84).
// ─────────────────────────────────────────────────────────────────────────────

const inputClass = `w-full px-3 py-2 text-sm text-text-primary bg-white border border-border-input rounded-md focus:outline-none focus:border-action placeholder:text-text-tertiary ${FIELD_FOCUS_RING}`;
const labelClass = 'block text-label text-text-tertiary uppercase mb-1';

/**
 * The increase as text: "+20%" or "+500 units".
 * @param {{ t: import('i18next').TFunction; kind: PromotionKind | null; value: number | null }} p
 */
export const increaseText = ({ t, kind, value }) =>
  kind === null || value === null
    ? ''
    : kind === 'percent'
      ? t('df.promo.pct', { value: formatNumber(value) })
      : t('df.promo.units', { value: formatNumber(value) });

/**
 * @type {React.FC<{
 *   sku: DemandForecastSkuView;
 *   weeks: readonly string[];
 *   history: readonly PromotionRow[];
 * }>}
 */
const PromotionPanel = ({ sku, weeks, history }) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const refusalText = useRefusalText();
  const availability = useVerbAvailability('promotion:set');
  const command = usePromotionCommand();
  const open = weeks.filter((w) => !(sku.endsOn && w >= sku.endsOn));
  const [week, setWeek] = useState('');
  const [kind, setKind] = useState(/** @type {PromotionKind} */ ('percent'));
  const [value, setValue] = useState('');
  const [refusal, setRefusal] = useState(/** @type {string | null} */ (null));

  if (availability.kind !== 'held')
    return <HandoffNotice availability={availability} testId="handoff-promotion" />;
  if (sku.method === 'discontinued')
    return (
      <p className="text-xs text-text-tertiary" data-testid="df-promo-discontinued">
        {t('df.promo.discontinued')}
      </p>
    );

  const chosen = open.includes(week) ? week : (open[0] ?? '');
  const parsed = value.trim() === '' ? null : Number(value);
  const valid =
    parsed !== null &&
    Number.isFinite(parsed) &&
    (kind === 'percent'
      ? parsed > 0 && parsed <= PROMOTION_PERCENT_MAX
      : Number.isInteger(parsed) && parsed >= 1 && parsed <= PROMOTION_UNITS_MAX);

  /** @param {{ weekStart: string; withdraw?: boolean; kind?: PromotionKind; value?: number }} vars */
  const send = async (vars) => {
    setRefusal(null);
    try {
      const res = await command.mutateAsync({ skuCode: sku.skuCode, ...vars });
      if (res.status === 'failed') {
        const description = refusalText(res.reason) ?? res.reason ?? '';
        setRefusal(description);
        toast({ variant: 'warning', title: t('df.promo.refused'), description });
        return;
      }
      if (!vars.withdraw) setValue('');
      toast({
        variant: 'success',
        title: t(vars.withdraw ? 'df.promo.withdrawn' : 'df.promo.saved')
      });
    } catch {
      toast({ variant: 'error', title: t('df.promo.refused') });
    }
  };

  const mine = history.filter((h) => h.skuCode === sku.skuCode);
  return (
    <div className="mt-4 border-t border-border-subtle pt-3" data-testid="df-promo">
      <h3 className="text-sm font-medium text-text-primary mb-1">{t('df.promo.title')}</h3>
      <p className="text-xs text-text-tertiary mb-3">{t('df.promo.intro')}</p>
      {sku.promotions.length > 0 && (
        <ul className="mb-3 space-y-1" data-testid="df-promo-list">
          {sku.promotions.map((p) => (
            <li
              key={p.weekStart}
              className="flex flex-wrap items-center gap-3 text-sm"
              data-testid={`df-promo-item-${p.weekStart}`}
            >
              <Data>{formatDate(p.weekStart)}</Data>
              <span>{increaseText({ t, kind: p.kind, value: p.value })}</span>
              <span className="text-xs text-text-secondary">
                {t('df.promo.effect', {
                  before: formatNumber(p.forecast),
                  after: formatNumber(p.forecast + p.lift)
                })}
              </span>
              <Button
                variant="secondary"
                onClick={() => {
                  setWeek(p.weekStart);
                  setKind(p.kind);
                  setValue(String(p.value));
                }}
                data-testid={`df-promo-change-${p.weekStart}`}
              >
                {t('df.promo.change')}
              </Button>
              <Button
                variant="secondary"
                disabled={command.isPending}
                onClick={() => void send({ weekStart: p.weekStart, withdraw: true })}
                data-testid={`df-promo-withdraw-${p.weekStart}`}
              >
                {t('df.promo.withdraw')}
              </Button>
            </li>
          ))}
        </ul>
      )}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 max-w-3xl">
        <div>
          <label htmlFor="df-promo-week" className={labelClass}>
            {t('df.promo.week')}
          </label>
          <select
            id="df-promo-week"
            className={inputClass}
            value={chosen}
            onChange={(e) => setWeek(e.target.value)}
            data-testid="df-promo-week"
          >
            {open.map((w) => (
              <option key={w} value={w}>
                {formatDate(w)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="df-promo-kind" className={labelClass}>
            {t('df.promo.kind')}
          </label>
          <select
            id="df-promo-kind"
            className={inputClass}
            value={kind}
            onChange={(e) => setKind(e.target.value === 'units' ? 'units' : 'percent')}
            data-testid="df-promo-kind"
          >
            <option value="percent">{t('df.promo.kind.percent')}</option>
            <option value="units">{t('df.promo.kind.units')}</option>
          </select>
        </div>
        <div>
          <label htmlFor="df-promo-value" className={labelClass}>
            {t('df.promo.value')}
          </label>
          <input
            id="df-promo-value"
            type="number"
            min={kind === 'percent' ? 0 : 1}
            step={kind === 'percent' ? 'any' : 1}
            inputMode="decimal"
            className={inputClass}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            aria-describedby="df-promo-value-hint"
            data-testid="df-promo-value"
          />
          <p id="df-promo-value-hint" className="text-xs text-text-tertiary mt-1">
            {t(kind === 'percent' ? 'df.promo.hint.percent' : 'df.promo.hint.units', {
              max: formatNumber(kind === 'percent' ? PROMOTION_PERCENT_MAX : PROMOTION_UNITS_MAX)
            })}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3 mt-3">
        <Button
          variant="outline"
          disabled={!valid || chosen === '' || command.isPending}
          onClick={() =>
            void send({ weekStart: chosen, kind, value: /** @type {number} */ (parsed) })
          }
          data-testid="df-promo-save"
        >
          {t('df.promo.save')}
        </Button>
        <span className="text-xs text-text-tertiary">{t('df.promo.attribution')}</span>
      </div>
      {refusal !== null && (
        <p className="text-xs text-warning-hover mt-2" role="alert" data-testid="df-promo-refusal">
          {t('df.promo.refused')}: {refusal}
        </p>
      )}
      {mine.length > 0 && (
        <div className="mt-4" data-testid="df-promo-history">
          <h4 className="text-label text-text-tertiary uppercase mb-1">{t('df.promo.history')}</h4>
          <ul className="space-y-1 text-xs text-text-secondary">
            {mine.map((h) => (
              <li key={`${h.key}|${h.setAt}|${h.status}|${h.value}|${h.kind}`}>
                <Data className="text-text-secondary">{formatDateTime(h.setAt)}</Data>
                {' · '}
                {
                  /** @type {{ kind?: string; person?: { displayName: string } }} */ (h.setBy)
                    .kind === 'RESOLVED'
                    ? /** @type {{ person: { displayName: string } }} */ (h.setBy).person
                        .displayName
                    : t('df.promo.unattributed')
                }
                {' · '}
                {formatDate(h.weekStart)}
                {' · '}
                {h.status === 'Withdrawn'
                  ? t('df.promo.history.withdrawn')
                  : t('df.promo.history.set', {
                      increase: increaseText({ t, kind: h.kind, value: h.value })
                    })}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default PromotionPanel;
