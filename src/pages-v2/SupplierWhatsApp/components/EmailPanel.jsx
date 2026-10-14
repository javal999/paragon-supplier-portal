import { useState } from 'react';
/** @import React from 'react' */
import { RotateCcw } from 'lucide-react';
import FilterChipsBar from '@components/ui-v2/FilterChipsBar';
import Button from '@components/ui-v2/Button';
import Data from '@components/ui-v2/Data';
import { useTranslation } from 'react-i18next';
import { sdcClock } from '@services/sdc/clock';
import { EMAIL_SCENARIOS } from '../const';
/** @import { ScenarioId } from '../const' */
import EmailBody from './EmailBody';
import EmailFlow from './EmailFlow';

/**
 * The Email tab: the email preview (subject, sender band, "Sent:" date on the
 * hub clock, body, footer) with its scenario chips and reset on the left, and
 * the email process flow on the right. Owns the scenario and the success line.
 */
/** @type {React.FC} */
const EmailPanel = () => {
  const { t } = useTranslation();
  /** @type {{ id: ScenarioId; label: string }[]} */
  const scenarioOptions = [
    { id: 'po', label: t('supplierWhatsApp.email.scenario.po') },
    { id: 'asn', label: t('supplierWhatsApp.email.scenario.asn') },
    { id: 'inventory', label: t('supplierWhatsApp.email.scenario.inventory') },
    { id: 'invoice', label: t('supplierWhatsApp.email.scenario.invoice') }
  ];
  const [scenario, setScenario] = useState(/** @type {ScenarioId} */ ('po'));
  const [successMsg, setSuccessMsg] = useState(/** @type {string | null} */ (null));

  /** @param {ScenarioId} s */
  const switchScenario = (s) => {
    setScenario(s);
    setSuccessMsg(null);
  };

  const meta = EMAIL_SCENARIOS[scenario];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[42%_1fr] gap-6">
      <div className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm p-5">
        <h3 className="text-section text-text-primary mb-1">
          {t('supplierWhatsApp.email.simulator.title')}
        </h3>
        <p className="text-xs text-text-tertiary mb-4">
          {t('supplierWhatsApp.email.simulator.subtitle')}
        </p>

        <div className="mb-4">
          <div className="text-xs font-semibold text-text-secondary mb-2">
            {t('supplierWhatsApp.common.chooseScenario')}
          </div>
          <FilterChipsBar options={scenarioOptions} value={scenario} onChange={switchScenario} />
        </div>

        <div className="border border-border-subtle rounded-lg overflow-hidden shadow-md">
          <div className="bg-bg-hover px-4 py-3 border-b border-border-subtle">
            <div className="text-sm font-bold text-text-primary">{meta.subject}</div>
            <div className="text-xs text-text-tertiary mt-0.5">{meta.preheader}</div>
          </div>
          <div className="bg-navy px-4 py-3 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-action-muted flex items-center justify-center text-xs font-bold text-white">
              PC
            </div>
            <div>
              <div className="text-sm font-bold text-white">Paragon Corp</div>
              <div className="text-xs text-white/60">procurement@sample-buyer.example</div>
            </div>
          </div>
          <div className="px-4 py-2.5 bg-bg-surface border-b border-border-subtle text-xs text-text-tertiary">
            <span className="text-text-primary font-semibold">To:</span>{' '}
            supplier@sample-packaging.example ·{' '}
            <span className="text-text-primary font-semibold">Sent:</span>{' '}
            <Data>
              {new Date(sdcClock.now()).toLocaleDateString('en-GB', {
                day: '2-digit',
                month: 'short',
                year: 'numeric'
              })}
            </Data>
          </div>
          <div className="px-5 py-5 bg-bg-surface">
            <EmailBody scenario={scenario} onAction={setSuccessMsg} successMsg={successMsg} />
          </div>
          <div className="px-4 py-3 bg-bg-hover border-t border-border-subtle text-xs text-text-tertiary text-center">
            Paragon Corp · Jl. Swadarma Raya No. 1, Jakarta ·{' '}
            {/* Demo chrome: inert. An `<a href="#">` here navigated the app
                to `/` under HashRouter. */}
            <button type="button" className="text-text-tertiary underline">
              Unsubscribe
            </button>
          </div>
        </div>

        <div className="text-center mt-4">
          <Button variant="secondary" icon={RotateCcw} onClick={() => switchScenario(scenario)}>
            {t('supplierWhatsApp.email.reset')}
          </Button>
        </div>
      </div>

      <div className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm p-5">
        <h3 className="text-section text-text-primary mb-4">
          {t('supplierWhatsApp.email.flow.title')}
        </h3>
        <EmailFlow />
      </div>
    </div>
  );
};

export default EmailPanel;
