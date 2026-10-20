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
