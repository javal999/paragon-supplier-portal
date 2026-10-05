// ────────────────────────────────────────────────────────────────────────────
// DataServiceProvider — single entry-point through which pages read data.
//
// One Provider, one hook (useDataService). The implementation is swapped at
// Phase 3 by replacing the `service` prop with an httpDataService; pages do
// not change.
//
// Mounted in main.jsx above the router. useDataService() is available but
// no page consumes it yet — that begins in Batch 1B.2.
// ────────────────────────────────────────────────────────────────────────────

/** @import React from 'react' */
import { createContext, useContext } from 'react';
/** @import { IDataService } from './types' */

const DataServiceContext = createContext(/** @type {IDataService | undefined} */ (undefined));

/**
 * @typedef {object} ProviderProps
 * @property {IDataService} service
 * @property {React.ReactNode} children
 */

/** @type {React.FC<ProviderProps>} */
export const DataServiceProvider = ({ service, children }) => (
  <DataServiceContext.Provider value={service}>{children}</DataServiceContext.Provider>
);

/** @returns {IDataService} */
export const useDataService = () => {
  const svc = useContext(DataServiceContext);
  if (!svc) throw new Error('useDataService must be used within a DataServiceProvider');
  return svc;
};
