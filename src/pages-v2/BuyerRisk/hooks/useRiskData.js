/** @import { RiskAlert, GeoRisk, ExposureRow, ComplianceRow, Commodity, Scenario } from '@services/data/types' */
import {
  useRiskAlerts,
  useGeoRisks,
  useExposure,
  useScenarios,
  useCompliance,
  useCommodities
} from '@services/query/hooks';

/**
 * @typedef {object} RiskData
 * @property {RiskAlert[]} alerts
 * @property {GeoRisk[]} geoRisks
 * @property {ExposureRow[]} exposure
 * @property {Scenario[]} scenarios
 * @property {ComplianceRow[]} compliance
 * @property {Commodity[]} commodities
 * @property {(ReturnType<typeof useRiskAlerts> | ReturnType<typeof useGeoRisks> | ReturnType<typeof useExposure> | ReturnType<typeof useScenarios> | ReturnType<typeof useCompliance> | ReturnType<typeof useCommodities>)[]} queries
 *   the six queries, in call order, for the page's error and retry handling
 * @property {boolean} anyPending  some query is still pending
 * @property {boolean} anyError    some query failed
 * @property {boolean} allEmpty    every query returned no rows
 */

/**
 * The six risk reads the page renders from, in the order the page called
 * them, with each list defaulted to `[]` and the page-level pending / error /
 * empty flags derived from them. Moved out of `BuyerRisk` by the Phase 5 page
 * split (no behaviour change: same hooks, same order, same query keys).
 * @returns {RiskData}
 */
export const useRiskData = () => {
  const alertsQuery = useRiskAlerts();
  const geoQuery = useGeoRisks();
  const exposureQuery = useExposure();
  const scenariosQuery = useScenarios();
  const complianceQuery = useCompliance();
  const commoditiesQuery = useCommodities();

  const alerts = alertsQuery.data?.items ?? [];
  const geoRisks = geoQuery.data?.items ?? [];
  const exposure = exposureQuery.data?.items ?? [];
  const scenarios = scenariosQuery.data?.items ?? [];
  const compliance = complianceQuery.data?.items ?? [];
  const commodities = commoditiesQuery.data?.items ?? [];

  const queries = [
    alertsQuery,
    geoQuery,
    exposureQuery,
    scenariosQuery,
    complianceQuery,
    commoditiesQuery
  ];
  const anyPending = queries.some((q) => q.isPending);
  const anyError = queries.some((q) => q.isError);
  const allEmpty =
    alerts.length === 0 &&
    geoRisks.length === 0 &&
    exposure.length === 0 &&
    scenarios.length === 0 &&
    compliance.length === 0 &&
    commodities.length === 0;

  return {
    alerts,
    geoRisks,
    exposure,
    scenarios,
    compliance,
    commodities,
    queries,
    anyPending,
    anyError,
    allEmpty
  };
};
