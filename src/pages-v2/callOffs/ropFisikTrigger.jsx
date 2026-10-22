/** @import React from 'react' */
/** @import { CallOff } from '@services/data/types' */
import { useTranslation } from 'react-i18next';
import StatusPill from '@components/ui-v2/StatusPill';
import Data from '@components/ui-v2/Data';
import { CALL_OFF_TRIGGER_QUESTIONS } from '@services/transitions/callOffTriggerRules';
import { qty } from './callOffDisplay';

// ─────────────────────────────────────────────────────────────────────────────
// BL-199 (DRC-13) — a draft the hub made when PTI SOH reached ROP Fisik, on the
// planner's Call-offs page: the row marker and, in the draft's panel, the
// figures behind it (SOH, ROP Fisik, Max, quantity) as the trigger stored them
// (DRC-D16). Every figure rests on [Default] rules, so it carries
// "Provisional: rule awaiting Material Planning" with F1 and the ROP questions
// (design rule 5). Nothing here computes a figure.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The questions behind the trigger's figures, for the provisional label.
 * @type {React.FC<{ testId: string }>}
 */
export const TriggerProvisional = ({ testId }) => {
  const { t } = useTranslation();
  return (
    <p className="text-xs text-text-tertiary" data-testid={testId}>
      {t('co.trigger.provisional', { questions: CALL_OFF_TRIGGER_QUESTIONS.join(', ') })}
    </p>
  );
};

/**
 * BR-04 — where the SOH comes from until the eWM feed is connected.
 * @type {React.FC<{ testId: string }>}
 */
export const TriggerRefreshNote = ({ testId }) => {
  const { t } = useTranslation();
  return (
    <p className="text-xs text-text-tertiary" data-testid={testId}>
      {t('co.trigger.refresh')}
    </p>
  );
};

/**
 * The row marker of a hub-made draft.
 * @type {React.FC<{ testId: string }>}
 */
export const RopFisikMarker = ({ testId }) => {
  const { t } = useTranslation();
  return (
    <span data-testid={testId}>
      <StatusPill variant="info">{t('co.trigger.marker')}</StatusPill>
    </span>
  );
};

/**
 * The figures behind a hub-made draft, as stored on it.
 * @type {React.FC<{ callOff: CallOff }>}
 */
export const RopFisikFigures = ({ callOff }) => {
  const { t } = useTranslation();
  const stamped = callOff.trigger;
  if (callOff.origin !== 'ropFisik' || !stamped) return null;
  const f = stamped.value;
  /** @param {number | null} n */
  const figure = (n) => (n === null ? '—' : `${qty(n)} ${callOff.uom}`);
  return (
    <section className="space-y-2" data-testid="calloff-trigger">
      <div>
        <RopFisikMarker testId="calloff-panel-origin-rop-fisik" />
      </div>
      <h3 className="text-label text-text-tertiary uppercase">{t('co.trigger.title')}</h3>
      <p className="text-xs text-text-secondary">{t('co.trigger.intro')}</p>
      <dl className="grid grid-cols-[200px_1fr] gap-y-1 text-sm">
        <dt className="text-text-tertiary">{t('co.trigger.soh')}</dt>
        <dd>
          <Data data-testid="calloff-trigger-soh">{figure(f.soh)}</Data>
          {f.plants.length > 1 ? (
            <span className="block text-xs text-text-tertiary">
              {t('co.trigger.plants', {
                plants: f.plants.map((p) => `${p.plant} ${qty(p.soh)}`).join(', ')
              })}
            </span>
          ) : null}
        </dd>
        <dt className="text-text-tertiary">{t('co.trigger.ropFisik')}</dt>
        <dd>
          <Data data-testid="calloff-trigger-rop-fisik">{figure(f.ropFisik)}</Data>
        </dd>
        <dt className="text-text-tertiary">{t('co.trigger.max')}</dt>
        <dd>
          <Data data-testid="calloff-trigger-max">{figure(f.max)}</Data>
        </dd>
        <dt className="text-text-tertiary">{t('co.trigger.openSupply')}</dt>
        <dd>
          <Data data-testid="calloff-trigger-open-supply">{figure(f.openSupply)}</Data>
        </dd>
        <dt className="text-text-tertiary">{t('co.trigger.quantity')}</dt>
        <dd>
          <Data data-testid="calloff-trigger-quantity">{figure(f.quantity)}</Data>
        </dd>
      </dl>
      <p className="text-xs text-text-tertiary">{t('co.trigger.quantityBasis')}</p>
      <TriggerProvisional testId="calloff-trigger-provisional" />
      <TriggerRefreshNote testId="calloff-trigger-refresh" />
      <p className="text-xs text-text-tertiary" data-testid="calloff-trigger-rules-version">
        {t('co.trigger.rulesVersion', { version: stamped.rulesVersion })}
      </p>
    </section>
  );
};
