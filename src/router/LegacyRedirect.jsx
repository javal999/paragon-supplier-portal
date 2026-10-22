// ─────────────────────────────────────────────────────────────────────────────
// A redirect for a retired path that KEEPS what the old link carried.
//
// A plain `<Navigate to="/x" replace />` drops the query string, the router
// state and every `:param`. The RFx paths moved on 2026-09-21 (one module per
// event type), and the old links carry all three: `?rfi=<id>` on the RFQ
// create hand-off, `state.sourceRequisitionId` from a requisition, and
// `:rfqId` on an event's detail page. So `to` may name params
// (`/buyer/rfq/:rfqId`), which are filled from the matched route, and search,
// hash and state ride along.
//
// IA P-02 — `to` may also carry its own query (`/buyer/orders?view=summary`).
// Its params are set first and win; every incoming param it does not name
// (`?po=`, `from=`) is kept after them.
// ─────────────────────────────────────────────────────────────────────────────

/** @import React from 'react' */
import { Navigate, generatePath, useLocation, useParams } from 'react-router-dom';

/** @type {React.FC<{ to: string }>} */
const LegacyRedirect = ({ to }) => {
  const params = useParams();
  const location = useLocation();
  const [pathname, fixed = ''] = to.split('?');
  const search = new URLSearchParams(fixed);
  for (const [key, value] of new URLSearchParams(location.search)) {
    if (!search.has(key)) search.append(key, value);
  }
  const query = search.toString();
  return (
    <Navigate
      replace
      to={{
        pathname: generatePath(pathname, params),
        search: query ? `?${query}` : '',
        hash: location.hash
      }}
      state={location.state}
    />
  );
};

export default LegacyRedirect;
