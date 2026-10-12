/** @import React from 'react' */
/** @import { GeoRisk, ExposureRow, ComplianceRow, Commodity, Scenario } from '@services/data/types' */
/** @import { TabKey } from '../const' */
import { useTranslation } from 'react-i18next';
import IllustrativeRegion from '@components/ui-v2/IllustrativeRegion';
import GeopoliticalTab from './GeopoliticalTab';
import ExposureTab from './ExposureTab';
import ScenarioTab from './ScenarioTab';
import ComplianceRisksTab from './ComplianceRisksTab';
import CommodityTab from './CommodityTab';

/**
 * The body of the selected sub-tab, each inside its own illustrative region.
 *
 * Props: `tab` (the selected tab, owned by the page) and the five fixture lists
 * the tab bodies render.
 * @type {React.FC<{
 *   tab: TabKey;
 *   geoRisks: GeoRisk[];
 *   exposure: ExposureRow[];
 *   scenarios: Scenario[];
 *   compliance: ComplianceRow[];
 *   commodities: Commodity[];
 * }>}
 */
const RiskTabPanel = ({ tab, geoRisks, exposure, scenarios, compliance, commodities }) => {
  const { t } = useTranslation();
  return (
    <>
      {/* Every tab body is authored fixture data (SEAM NOTE, page head), so each
        renders inside the capability-derived illustrative enclosure. Wrapping
        at the render site keeps the tab components themselves untouched — and
        when `risk` flips LIVE the enclosures come off on their own. */}
      {tab === 'geo' && (
        <IllustrativeRegion capability="risk" label={t('risk.illustrative.geo')}>
          <GeopoliticalTab geoRisks={geoRisks} />
        </IllustrativeRegion>
      )}
      {tab === 'exposure' && (
        <IllustrativeRegion capability="risk" label={t('risk.illustrative.exposure')}>
          <ExposureTab exposure={exposure} />
        </IllustrativeRegion>
      )}
      {tab === 'scenario' && (
        <IllustrativeRegion capability="risk" label={t('risk.illustrative.scenario')}>
          <ScenarioTab scenarios={scenarios} />
        </IllustrativeRegion>
      )}
      {tab === 'compliance' && (
        <IllustrativeRegion capability="risk" label={t('risk.illustrative.compliance')}>
          <ComplianceRisksTab compliance={compliance} />
        </IllustrativeRegion>
      )}
      {tab === 'commodity' && (
        <IllustrativeRegion capability="risk" label={t('risk.illustrative.commodity')}>
          <CommodityTab commodities={commodities} />
        </IllustrativeRegion>
      )}
    </>
  );
};

export default RiskTabPanel;
