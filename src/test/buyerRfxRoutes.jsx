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
//
// RFx UX 2G: the event page is three tabs (Overview · Compare · By supplier)
// and opens on Compare once anything is submitted. A spec that reads a
// section on another tab selects it with `selectEventTab` first.
// ────────────────────────────────────────────────────────────────────────────

/** @import React from 'react' */
import { fireEvent, screen } from '@testing-library/react';
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

/**
 * Select one tab of the RFI/RFP event page by its English label (the Compare
 * tab's name carries its count, so the label is matched as a prefix).
 * @param {'Overview' | 'Compare' | 'By supplier'} label
 */
export const selectEventTab = async (label) =>
  fireEvent.click(await screen.findByRole('tab', { name: new RegExp(`^${label}`) }));

export default BuyerRfxRoutes;
