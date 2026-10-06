/** @import { IAnalyticsService, Page, QueryScope, AnalyticsSummary, SpendCategoryRow, TopSupplierSpend, MonthlyOtifRow, MonthlyPoRow, MonthlyChannelMix, AnalyticsPerfRow } from '../types' */
import {
  ANALYTICS_SUMMARY,
  SPEND_CAT,
  TOP_SUPPLIERS,
  OTIF_DATA,
  PO_VOL_DATA,
  CHANNEL_DATA,
  PERF_TABLE
} from './fixtures/buyerAnalytics';

// Analytics is a buyer-side portfolio view (spend, performance, channel mix
// across the whole supplier network). Suppliers do not see this surface — the
// service returns [] / null for the supplier persona.
/**
 * @template T
 * @param {QueryScope} scope
 * @param {readonly T[]} rows
 * @returns {T[]}
 */
function bufferForBuyer(scope, rows) {
  return scope.personaType === 'buyer' ? [...rows] : [];
}

/** @implements {IAnalyticsService} */
export class MockAnalyticsService {
  /**
   * @param {QueryScope} scope
   * @returns {Promise<AnalyticsSummary | null>}
   */
  async getSummary(scope) {
    return scope.personaType === 'buyer' ? ANALYTICS_SUMMARY : null;
  }
  /**
   * @param {QueryScope} scope
   * @returns {Promise<Page<SpendCategoryRow>>}
   */
  async getSpendByCategory(scope) {
    return { items: bufferForBuyer(scope, SPEND_CAT) };
  }
  /**
   * @param {QueryScope} scope
   * @returns {Promise<Page<TopSupplierSpend>>}
   */
  async getTopSuppliers(scope) {
    return { items: bufferForBuyer(scope, TOP_SUPPLIERS) };
  }
  /**
   * @param {QueryScope} scope
   * @returns {Promise<Page<MonthlyOtifRow>>}
   */
  async getOtifTrend(scope) {
    return { items: bufferForBuyer(scope, OTIF_DATA) };
  }
  /**
   * @param {QueryScope} scope
   * @returns {Promise<Page<MonthlyPoRow>>}
   */
  async getPoVolumeTrend(scope) {
    return { items: bufferForBuyer(scope, PO_VOL_DATA) };
  }
  /**
   * @param {QueryScope} scope
   * @returns {Promise<Page<MonthlyChannelMix>>}
   */
  async getChannelMix(scope) {
    return { items: bufferForBuyer(scope, CHANNEL_DATA) };
  }
  /**
   * @param {QueryScope} scope
   * @returns {Promise<Page<AnalyticsPerfRow>>}
   */
  async getSupplierPerformance(scope) {
    return { items: bufferForBuyer(scope, PERF_TABLE) };
  }
}
