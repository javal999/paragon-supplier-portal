/** @import { IDiscoveryService, Page, QueryScope, RecommendedSupplier, QualificationItem, MarketIntelCard, SingleSourceItem } from '../types' */
import {
  RECOMMENDED,
  QUALIFICATIONS,
  MARKET_INTEL,
  SINGLE_SOURCE
} from './fixtures/buyerDiscovery';

// Discovery / marketplace surface is buyer-side. Suppliers do not browse
// other suppliers — the service returns [] for the supplier persona.
/**
 * @template T
 * @param {QueryScope} scope
 * @param {readonly T[]} rows
 * @returns {T[]}
 */
function buyerOnly(scope, rows) {
  return scope.personaType === 'buyer' ? [...rows] : [];
}

/** @implements {IDiscoveryService} */
export class MockDiscoveryService {
  /**
   * @param {QueryScope} scope
   * @returns {Promise<Page<RecommendedSupplier>>}
   */
  async getRecommended(scope) {
    return { items: buyerOnly(scope, RECOMMENDED) };
  }
  /**
   * @param {QueryScope} scope
   * @returns {Promise<Page<QualificationItem>>}
   */
  async getQualifications(scope) {
    return { items: buyerOnly(scope, QUALIFICATIONS) };
  }
  /**
   * @param {QueryScope} scope
   * @returns {Promise<Page<MarketIntelCard>>}
   */
  async getMarketIntel(scope) {
    return { items: buyerOnly(scope, MARKET_INTEL) };
  }
  /**
   * @param {QueryScope} scope
   * @returns {Promise<Page<SingleSourceItem>>}
   */
  async getSingleSourceItems(scope) {
    return { items: buyerOnly(scope, SINGLE_SOURCE) };
  }
}
