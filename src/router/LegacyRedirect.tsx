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
// ─────────────────────────────────────────────────────────────────────────────

import React from 'react';
import { Navigate, generatePath, useLocation, useParams } from 'react-router-dom';

const LegacyRedirect: React.FC<{ to: string }> = ({ to }) => {
  const params = useParams();
  const location = useLocation();
  return (
    <Navigate
      replace
      to={{ pathname: generatePath(to, params), search: location.search, hash: location.hash }}
      state={location.state}
    />
  );
};

export default LegacyRedirect;
