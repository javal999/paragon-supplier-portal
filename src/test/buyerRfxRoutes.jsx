// ────────────────────────────────────────────────────────────────────────────
// buyerRfxRoutes — the buyer RFI and RFP pages under their real routes, for
// page specs.
//
// RFx UX 2A (B-09): an RFI's or RFP's detail is its own page
// (`/buyer/rfi/:rfiId`, `/buyer/rfp/:rfpId`), reached from the list's "Open",
// from the wizard after saving, and from the old `?open=<id>` deep link. A spec
// that rendered `<BuyerRfi />` bare and clicked a row now has to follow that
// navigation, so it renders this instead with `route` set to the list (or to a
// deep link). Anything the pages navigate to outside these four routes lands
// on a probe that prints the location (`rfx-routes-elsewhere`).
// ────────────────────────────────────────────────────────────────────────────

/** @import React from 'react' */
import { Route, Routes, useLocation } from 'react-router-dom';
import BuyerRfi from '@pages-v2/BuyerRfi';
import BuyerRfiEvent from '@pages-v2/BuyerRfiEvent';
import BuyerRfp from '@pages-v2/BuyerRfp';
import BuyerRfpEvent from '@pages-v2/BuyerRfp/BuyerRfpEvent';

/** @type {React.FC} */
const Elsewhere = () => {
  const loc = useLocation();
  return <div data-testid="rfx-routes-elsewhere">{`${loc.pathname}${loc.search}`}</div>;
};

/** @type {React.FC} */
const BuyerRfxRoutes = () => (
  <Routes>
    <Route path="/buyer/rfi" element={<BuyerRfi />} />
    <Route path="/buyer/rfi/:rfiId" element={<BuyerRfiEvent />} />
    <Route path="/buyer/rfp" element={<BuyerRfp />} />
    <Route path="/buyer/rfp/:rfpId" element={<BuyerRfpEvent />} />
    <Route path="*" element={<Elsewhere />} />
  </Routes>
);

export default BuyerRfxRoutes;
