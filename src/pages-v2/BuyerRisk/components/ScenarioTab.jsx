/** @import React from 'react' */
/** @import { Scenario } from '@services/data/types' */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, ChevronUp, Sparkles, Send } from 'lucide-react';
import FilterChipsBar from '@components/ui-v2/FilterChipsBar';
import StatusPill from '@components/ui-v2/StatusPill';
import Button from '@components/ui-v2/Button';
import { useToast } from '@hooks/useToast';
import { FEASIBILITY_VARIANT } from '../const';

// Scenario picker — the modelable library. Only fully-modeled scenarios carry
// detail data (served by useScenarios); the picker lists the wider set. Labels
// are localized in-component; the `id` stays canonical (it is the picker value
// matched against fixture scenario ids).
const SCENARIO_LIBRARY_IDS = /** @type {const} */ (['me', 'tw', 'pa']);

/**
 * The "Scenario model" tab body: the scenario picker, the featured scenario's
 * impact band with its "Send to war room" action, the expandable response
 * alternatives (each with its activate / view-analysis toasts) and the ARIA
 * recommendation. Owns the picker, the expanded alternative and the
 * war-room-sent flag, which no other section reads.
 *
 * Props: `scenarios` (the modeled fixture scenarios from `useScenarios`).
 * @type {React.FC<{ scenarios: Scenario[] }>}
 */
const ScenarioTab = ({ scenarios }) => {
  const { toast } = useToast();
  const { t } = useTranslation();
  // Labels localized; `id` stays canonical (the picker value).
  const scenarioLibrary = SCENARIO_LIBRARY_IDS.map((id) => ({
    id,
    label: t(`risk.scenario.lib.${id}`)
  }));
  const [activeScenario, setActiveScenario] = useState(/** @type {string} */ ('me'));
  const [expandedAlt, setExpandedAlt] = useState(/** @type {string | null} */ ('s1'));
  // Detail for the picked scenario; falls back to the first modeled one for
  // library entries that are not yet fully modeled.
  const featured = scenarios.find((s) => s.id === activeScenario) ?? scenarios[0];
  if (!featured) return null;

  // UNBACKED: there is no War Room channel or command yet, so the button sends
  // nothing. The toast says so, and the button never shows a "Sent" state.
  const sendToWarRoom = () => {
    toast({
      variant: 'warning',
      title: t('risk.toast.warRoomNotSent.title'),
      description: t('risk.toast.warRoomNotSent.desc', { title: featured.title })
    });
  };

  return (
    <div className="flex flex-col gap-5">
      <FilterChipsBar
        options={scenarioLibrary}
        value={activeScenario}
        onChange={setActiveScenario}
      />

      <section className="bg-danger-soft border-l-2 border-danger rounded-lg px-5 py-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex-1 min-w-0">
            {/* i18n-defer: mock/sample data — scenario title/description/impact seeded from fixtures */}
            <div className="text-base font-bold text-text-primary mb-1">{featured.title}</div>
            <div className="text-sm text-text-secondary mb-4">{featured.description}</div>
            <div className="flex flex-wrap gap-6">
              {Object.entries(featured.impact).map(([k, v]) => (
                <div key={k}>
                  <div className="text-lg font-bold text-danger">{v}</div>
                  <div className="text-[length:var(--fs-caption-1)] text-text-tertiary uppercase tracking-wider mt-0.5">
                    {k.replace(/([A-Z])/g, ' $1')}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <Button variant="outline" icon={Send} onClick={sendToWarRoom} className="shrink-0">
            {t('risk.scenario.sendWarRoom')}
          </Button>
        </div>
      </section>

      <div>
        <div className="text-label text-text-tertiary uppercase mb-2">
          {t('risk.scenario.responseAlternatives')}
        </div>
        <div className="flex flex-col gap-2">
          {featured.alternatives.map((alt) => {
            const open = expandedAlt === alt.id;
            const feasVariant = FEASIBILITY_VARIANT[alt.feasibility];
            return (
              <div
                key={alt.id}
                className={`bg-bg-surface border rounded-lg shadow-sm overflow-hidden transition-colors ${
                  open ? 'border-action' : 'border-border-subtle'
                }`}
              >
                <button
                  type="button"
                  onClick={() => setExpandedAlt(open ? null : alt.id)}
                  className="w-full px-5 py-3 flex items-center justify-between gap-4 text-left"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {/* i18n-defer: mock/sample data — alternative name/cost/leadTime/details seeded from fixtures */}
                    <span className="font-bold text-sm text-text-primary">{alt.name}</span>
                    <StatusPill variant={feasVariant}>
                      {alt.feasibility} {t('risk.alt.feasibility')}
                    </StatusPill>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <span className="text-xs font-semibold text-warning-hover">{alt.cost}</span>
                    <span className="text-xs font-semibold text-info">{alt.leadTime}</span>
                    {open ? (
                      <ChevronUp size={14} className="text-text-tertiary" />
                    ) : (
                      <ChevronDown size={14} className="text-text-tertiary" />
                    )}
                  </div>
                </button>
                {open && (
                  <div className="px-5 pb-4 border-t border-border-subtle">
                    <div className="text-sm text-text-secondary leading-relaxed mt-3">
                      {alt.details}
                    </div>
                    <div className="mt-3 flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() =>
                          toast({
                            variant: 'info',
                            title: t('risk.toast.activationInitiated', {
                              name: alt.name.split('—')[0].trim()
                            })
                          })
                        }
                      >
                        {t('risk.scenario.activatePlan')}
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() =>
                          toast({
                            title: t('risk.toast.openingAnalysis', {
                              id: alt.id.toUpperCase()
                            })
                          })
                        }
                      >
                        {t('risk.scenario.viewFullAnalysis')}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <section className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm p-5">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles size={16} className="text-teal" />
          <span className="text-sm font-bold text-teal-hover">
            {t('risk.scenario.ariaRecommendation')}
          </span>
          {/* Not a canonical status token, so the central maps cannot reach it. */}
          <StatusPill variant="info">{t('risk.scenario.aiPowered')}</StatusPill>
        </div>
        {/* i18n-defer: mock/sample narrative — illustrative ARIA recommendation with hardcoded demo figures */}
        <p className="text-sm text-text-secondary leading-relaxed">
          Based on current inventory levels, open PO positions, and freight capacity availability,
          ARIA recommends combining{' '}
          <strong className="text-text-primary">Alternative A + Alternative C</strong>{' '}
          simultaneously. Activate Cape rerouting now for continuity, while building 90-day safety
          stock for your top 12 critical SKUs. Estimated total cost:{' '}
          <strong className="text-teal-hover">$1.06M</strong> vs. $3.2M revenue-at-risk if no action
          taken.
        </p>
        {/* The trailing "Last updated 2 hours ago" clause is removed: it claimed a
            refresh cadence for a static narrative. The confidence / prior-scenario
            figures stay — they are illustrative content under the region frame,
            not a freshness claim. */}
        <div className="text-xs text-text-tertiary mt-3">
          Confidence: 84% · Based on 6 similar disruption scenarios
        </div>
      </section>
    </div>
  );
};

export default ScenarioTab;
