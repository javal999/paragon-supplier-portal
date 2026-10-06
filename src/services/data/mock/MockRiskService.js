/** @import { IRiskService, Page, QueryScope, RiskAlert, GeoRisk, ExposureRow, ComplianceRow, ComplianceRegistryEntry, Commodity, Scenario } from '../types' */
import {
  ALERTS,
  GEO_RISKS,
  EXPOSURE_DATA,
  SCENARIO_ME,
  COMPLIANCE_DATA,
  COMMODITIES
} from './fixtures/buyerRisk';
import { COMPLIANCE_REGISTRY } from './fixtures/complianceRegistry';

// Risk fixtures are buyer-side aggregate views (geopolitical, exposure,
// compliance, commodity prices). Suppliers do not see this surface — the
// service returns [] for the supplier persona.
/**
 * @template T
 * @param {QueryScope} scope
 * @param {readonly T[]} rows
 * @returns {T[]}
 */
function bufferForBuyer(scope, rows) {
  return scope.personaType === 'buyer' ? [...rows] : [];
}

/** @implements {IRiskService} */
export class MockRiskService {
  /**
   * @param {QueryScope} scope
   * @returns {Promise<Page<RiskAlert>>}
   */
  async getRiskAlerts(scope) {
    return { items: bufferForBuyer(scope, ALERTS) };
  }
  /**
   * @param {QueryScope} scope
   * @returns {Promise<Page<GeoRisk>>}
   */
  async getGeoRisks(scope) {
    return { items: bufferForBuyer(scope, GEO_RISKS) };
  }
  /**
   * @param {QueryScope} scope
   * @returns {Promise<Page<ExposureRow>>}
   */
  async getExposure(scope) {
    return { items: bufferForBuyer(scope, EXPOSURE_DATA) };
  }
  /**
   * @param {QueryScope} scope
   * @returns {Promise<Page<Scenario>>}
   */
  async getScenarios(scope) {
    // Only the Middle East scenario is fully modeled today; the picker in the
    // page lists the wider library. Additional modeled scenarios append here.
    return { items: bufferForBuyer(scope, [SCENARIO_ME]) };
  }
  /**
   * @param {QueryScope} scope
   * @returns {Promise<Page<ComplianceRow>>}
   */
  async getCompliance(scope) {
    return { items: bufferForBuyer(scope, COMPLIANCE_DATA) };
  }
  /**
   * @param {QueryScope} scope
   * @returns {Promise<Page<ComplianceRegistryEntry>>}
   */
  async getComplianceRegistry(scope) {
    // supplierId-keyed → per-supplier isolation; buyer sees the cross-supplier
    // superset. Unlike the legacy buyer-only `getCompliance`, a supplier reads
    // its OWN certs — the FK closes the name-vs-id split (HALAL-XPERSONA-01). The
    // rows are honestly synthetic (see the fixture header); UI liveness is
    // SIMULATED via the LivenessRegistry, not asserted here.
    const items =
      scope.personaType === 'buyer'
        ? [...COMPLIANCE_REGISTRY]
        : COMPLIANCE_REGISTRY.filter((e) => e.supplierId === scope.supplierId);
    return { items };
  }
  /**
   * @param {QueryScope} scope
   * @returns {Promise<Page<Commodity>>}
   */
  async getCommodities(scope) {
    return { items: bufferForBuyer(scope, COMMODITIES) };
  }
}
