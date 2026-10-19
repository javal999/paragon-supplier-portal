// ────────────────────────────────────────────────────────────────────────────
// useServiceQuery — the ONE generic pages never call directly. It:
//   1. pulls the injected IDataService from context,
//   2. derives the QueryScope from the current identity,
//   3. appends scopeKey (personaType:supplierId) to every query key so the
//      buyer / supplier-A / supplier-B caches are structurally distinct and
//      can never bleed into one another (the scoping invariant as a cache key).
//
// Domain hooks in ./hooks wrap this per read method; pages call those. Errors
// are surfaced by TanStack (queryFn throws DataError -> isError) — no Result
// envelope unwrapping in pages.
// ────────────────────────────────────────────────────────────────────────────

/** @import { UseQueryOptions } from '@tanstack/react-query' */
import { useQuery } from '@tanstack/react-query';
import { useDataService } from '../data/DataServiceContext';
import { useCurrentIdentity } from '@context/CurrentIdentityContext';
/** @import { IDataService, QueryScope } from '../data/types' */

/**
 * @param {QueryScope} scope
 * @returns {string}
 */
export const scopeKey = (scope) => `${scope.personaType}:${scope.supplierId ?? 'all'}`;

/**
 * @template T
 * @param {readonly unknown[]} key
 * @param {(svc: IDataService, scope: QueryScope) => Promise<T>} fetcher
 * @param {Omit<UseQueryOptions<T, Error>, 'queryKey' | 'queryFn'>} [options]
 */
export function useServiceQuery(key, fetcher, options) {
  const svc = useDataService();
  const { identity } = useCurrentIdentity();
  /** @type {QueryScope} */
  const scope = {
    personaType: identity.personaType,
    supplierId: identity.supplierId,
    // Carried on the READ scope too, so `getCapabilities` answers for the SEAT
    // rather than the persona. `scopeKey` deliberately ignores it (see
    // `QueryScope.businessRoles`): two seats with different roles read the same
    // tenant's rows, so keying on roles would shard the cache on a dimension the
    // reads do not vary by. Any query that varies by ROLE must put the roles in
    // its OWN key — the demand anticipation history (DRC-3, BL-189) is the
    // first: `useDemandAnticipationHistory` keys on the seat's roles.
    businessRoles: identity.businessRoles,
    actor: identity.actor
  };
  return /** @type {typeof useQuery<T, Error>} */ (useQuery)({
    queryKey: [...key, scopeKey(scope)],
    queryFn: () => fetcher(svc, scope),
    ...options
  });
}
