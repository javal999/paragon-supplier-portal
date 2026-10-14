/** @import React from 'react' */
/** @import { LinkedAsn } from '../utils' */
import { AsnPlannerMarkers } from '../../shipments/CallOffWarnings';

/**
 * MR-6 BR-12 / FU-7 — the planner's markers on one heads-up ASN.
 * @type {React.FC<{ asnNumber: string; linkedAsns: readonly LinkedAsn[] }>}
 */
const HeadsUpMarkers = ({ asnNumber, linkedAsns }) => {
  const linked = linkedAsns.find((l) => l.asn.asnNumber === asnNumber);
  return linked ? (
    <div className="mt-1">
      <AsnPlannerMarkers asn={linked.asn} warnings={linked.warnings} />
    </div>
  ) : null;
};

export default HeadsUpMarkers;
