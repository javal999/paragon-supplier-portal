/** @import React from 'react' */
/** @import { MaterialOsipInputs } from '@services/transitions/osipSafetyRules' */
import { useTranslation } from 'react-i18next';
import Button from '@components/ui-v2/Button';
import { useToast } from '@hooks/useToast';
import { useRefusalText } from '@hooks/useRefusalText';
import { formatNumber } from '@lib/format';
import { useOsipLevelCommand } from '@services/query/commandHooks';
import { OSIP_RULES } from '@services/transitions/osipRules';
import {
  LEVEL_SUGGESTION_PROPOSAL,
  LEVEL_SUGGESTION_QUESTIONS,
  LEVEL_SUGGESTION_RULES,
  ORDER_TAG_METHOD,
  levelSuggestionInput,
  suggestOsipLevel
} from '@services/transitions/osipLevelSuggestion';
import { ProvisionalNote } from './osipSafety';

// ─────────────────────────────────────────────────────────────────────────────
// BL-208 (DRC-19) [Proposed] — the suggested OSIP level, next to the level
// control in the material's detail panel. The figure is `suggestOsipLevel`'s;
// none is computed here. The page never changes a level on its own: "Use
// suggestion" fires the existing verb (`t_osiplevel_set`) when the planner
// clicks it, recorded with `source: 'classification'`.
// ─────────────────────────────────────────────────────────────────────────────

/** @param {number} x */
const two = (x) => formatNumber(Math.round(x * 100) / 100);

/**
 * The rules `suggestOsipLevel` applies, in its order, for the planner to read
 * on demand. Every figure comes from the rule constants (`ORDER_TAG_METHOD`,
 * `OSIP_RULES`, `LEVEL_SUGGESTION_RULES`), so the table moves when they do.
 * The last column says which rules the hub can apply with the data it holds:
 * no order-method tags (the read passes `orderTag: null`) and no pallet-mix
 * flag, so only the two CV rules decide a level today.
 * @type {React.FC}
 */
export const LevelSuggestionGuide = () => {
  const { t } = useTranslation();
  const threshold = formatNumber(OSIP_RULES.cvThreshold);
  const methodLabel = (/** @type {string} */ m) => t(`sst.rop.suggest.method.${m}`);
  const tagRows = /** @type {(keyof typeof ORDER_TAG_METHOD)[]} */ (
    Object.keys(ORDER_TAG_METHOD)
  ).map((tag) => {
    const m = ORDER_TAG_METHOD[tag];
    return {
      key: `tag-${tag}`,
      when: t('sst.rop.guide.when.tag', { tag: t(`sst.rop.suggest.tag.${tag}`) }),
      suggests:
        m.level === null
          ? t('sst.rop.guide.suggests.noLevel', { method: methodLabel(m.method) })
          : t('sst.rop.guide.suggests.level', { level: m.level, method: methodLabel(m.method) }),
      today: t('sst.rop.guide.today.noTag')
    };
  });
  const rows = [
    ...tagRows,
    {
      key: 'cv-fluctuative',
      when: t('sst.rop.guide.when.cvFluctuative', { threshold }),
      suggests: t('sst.rop.guide.suggests.level', {
        level: 3,
        method: methodLabel('continuousReview')
      }),
      today: t('sst.rop.guide.today.used')
    },
    {
      key: 'cv-stable',
      when: t('sst.rop.guide.when.cvStable', { threshold }),
      suggests: t('sst.rop.guide.suggests.level', {
        level: 4,
        method: methodLabel('periodicReview')
      }),
      today: t('sst.rop.guide.today.used')
    },
    {
      key: 'jit',
      when: t('sst.rop.guide.when.jit', {
        max: formatNumber(LEVEL_SUGGESTION_RULES.jitMpqRateMax)
      }),
      suggests: t('sst.rop.guide.suggests.jit'),
      today: t('sst.rop.guide.today.noPalletMix')
    }
  ];
  const th = 'text-left font-medium text-text-tertiary uppercase py-1 pr-3 align-bottom';
  return (
    <details className="mt-2" data-testid="sst-level-guide">
      <summary className="cursor-pointer text-action-hover">{t('sst.rop.guide.summary')}</summary>
      <div className="mt-2 space-y-2 text-text-secondary">
        <p>{t('sst.rop.guide.intro')}</p>
        <div className="overflow-x-auto">
          <table className="w-full" data-testid="sst-level-guide-table">
            <thead>
              <tr className="border-b border-border-subtle">
                <th scope="col" className={th}>
                  {t('sst.rop.guide.col.step')}
                </th>
                <th scope="col" className={th}>
                  {t('sst.rop.guide.col.when')}
                </th>
                <th scope="col" className={th}>
                  {t('sst.rop.guide.col.suggests')}
                </th>
                <th scope="col" className={th}>
                  {t('sst.rop.guide.col.today')}
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr
                  key={r.key}
                  className="border-b border-border-subtle align-top"
                  data-testid={`sst-level-guide-row-${r.key}`}
                >
                  <td className="py-1 pr-3 font-mono">{i + 1}</td>
                  <td className="py-1 pr-3">{r.when}</td>
                  <td className="py-1 pr-3 text-text-primary">{r.suggests}</td>
                  <td className="py-1 pr-3">{r.today}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p data-testid="sst-level-guide-cv">
          {t('sst.osip.def.cv', { months: OSIP_RULES.cvWindowMonths, threshold })}{' '}
          {t('sst.rop.guide.noCv')}
        </p>
        <p data-testid="sst-level-guide-fallback">
          {t('sst.rop.guide.fallbackNote', { defaultLevel: OSIP_RULES.defaultLevel })}
        </p>
      </div>
    </details>
  );
};

/**
 * @type {React.FC<{ materialCode: string; osip: MaterialOsipInputs; current: number; held: boolean }>}
 */
export const LevelSuggestion = ({ materialCode, osip, current, held }) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const refusalText = useRefusalText();
  const command = useOsipLevelCommand();
  const input = levelSuggestionInput(osip);
  const s = suggestOsipLevel(input);

  const reason =
    s.basis === 'tag'
      ? t('sst.rop.suggest.reason.tag', { tag: t(`sst.rop.suggest.tag.${input.orderTag}`) })
      : s.basis !== null && s.cv !== null
        ? t(`sst.rop.suggest.reason.${s.basis}`, {
            cv: two(s.cv),
            threshold: formatNumber(OSIP_RULES.cvThreshold)
          })
        : '';
  const text =
    s.method === null
      ? t('sst.rop.suggest.none')
      : s.level === null
        ? t('sst.rop.suggest.noLevel', { method: t(`sst.rop.suggest.method.${s.method}`), reason })
        : t('sst.rop.suggest.level', {
            level: s.level,
            method: t(`sst.rop.suggest.method.${s.method}`),
            reason
          });
  const gaps = s.missing
    .map((g) =>
      t(`sst.rop.suggest.gap.${g}`, {
        rate: s.mpqRate === null ? '' : two(s.mpqRate),
        max: formatNumber(LEVEL_SUGGESTION_RULES.jitMpqRateMax)
      })
    )
    .join(' ');

  const use = async () => {
    if (s.level === null) return;
    try {
      const res = await command.mutateAsync({ materialCode, level: s.level, fromSuggestion: true });
      if (res.status === 'failed') {
        toast({
          variant: 'warning',
          title: t('sst.rop.levelForm.refused'),
          description: refusalText(res.reason) ?? res.reason ?? ''
        });
        return;
      }
      toast({
        variant: 'success',
        title: t('sst.rop.levelForm.saved'),
        description: t('sst.rop.levelForm.savedDesc', { level: s.level, material: materialCode })
      });
    } catch {
      toast({ variant: 'error', title: t('sst.rop.levelForm.refused') });
    }
  };

  return (
    <div className="mt-3 text-xs" data-testid="sst-level-suggestion">
      <p className="text-sm text-text-primary" data-testid="sst-level-suggestion-text">
        {text}
      </p>
      {gaps ? (
        <p className="text-text-tertiary" data-testid="sst-level-suggestion-gaps">
          {gaps}
        </p>
      ) : null}
      <p className="text-warning-hover" data-testid="sst-level-suggestion-proposed">
        {t('sst.rop.suggest.proposed', { refs: LEVEL_SUGGESTION_PROPOSAL.join(', ') })}
      </p>
      <ProvisionalNote questions={LEVEL_SUGGESTION_QUESTIONS} testId="sst-level-suggestion-prov" />
      <LevelSuggestionGuide />
      {s.level !== null && s.level === current ? (
        <p className="text-text-tertiary" data-testid="sst-level-suggestion-matches">
          {t('sst.rop.suggest.matches')}
        </p>
      ) : null}
      {held && s.level !== null && s.level !== current ? (
        <Button
          variant="outline"
          className="mt-2"
          onClick={() => void use()}
          disabled={command.isPending}
          data-testid="sst-level-use-suggestion"
        >
          {t('sst.rop.suggest.use')}
        </Button>
      ) : null}
    </div>
  );
};
