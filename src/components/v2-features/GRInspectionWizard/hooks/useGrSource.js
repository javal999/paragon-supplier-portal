import React, { useMemo } from 'react';
/** @import { Shipment, ASN } from '@services/data/types' */
/** @import { GrSource, LineDraft, SourceMode } from '../utils' */
import { sourceFromAsn, sourceFromShipment } from '../utils';
import { ELIGIBLE_STATUSES, RECEIVABLE_ASN_STATUSES } from '../const';

/**
 * @typedef {object} UseGrSourceArgs
 * @property {SourceMode} sourceMode -  The draft's step 1 lane.
 * @property {string} selectedSourceId -  The draft's dock pick (seeded from `initialAsnId`).
 * @property {string} manualASN -  The draft's typed ASN number.
 * @property {Shipment[]} shipments
 * @property {ASN[]} asns
 * @property {(lines: LineDraft[]) => void} setLines
 */

/**
 * The source step 1 resolves to: the receivable sources (dock shipments ∪ live
 * receivable ASNs), the typed ASN number's match, and the active source.
 * Drafts the source's lines whenever the active source changes, replacing any
 * lines drafted before (D15a, Levi 2026-10-28). Step 1's values themselves live in the draft (`useInspectionDraft`'s
 * `useForm`); this hook only derives from them.
 * @param {UseGrSourceArgs} args
 */
const useGrSource = ({ sourceMode, selectedSourceId, manualASN, shipments, asns, setLines }) => {
  // Receivable GR sources = shipments at dock ∪ live receivable ASNs (deduped by
  // ASN number; the shipment wins when both exist since it carries dock data).
  const sources = useMemo(() => {
    const shipmentSources = shipments
      .filter((s) => ELIGIBLE_STATUSES.includes(/** @type {'At Dock' | 'Unloading'} */ (s.status)))
      .map(sourceFromShipment);
    const seen = new Set(shipmentSources.map((s) => s.asnNumber));
    const asnSources = asns
      .filter((a) => RECEIVABLE_ASN_STATUSES.includes(a.status) && !seen.has(a.asnNumber))
      .map(sourceFromAsn);
    return [...shipmentSources, ...asnSources];
  }, [shipments, asns]);

  // Manual entry resolves against the live ASNs (the service seam), not a
  // fixture list: an unknown / non-receivable ASN is honestly reported.
  const manualAsnMatch = useMemo(
    () =>
      asns.find(
        (a) => a.asnNumber === manualASN.trim() && RECEIVABLE_ASN_STATUSES.includes(a.status)
      ),
    [asns, manualASN]
  );
  const manualNotFound = manualASN.trim().length > 0 && !manualAsnMatch;

  /** @type {GrSource | undefined} */
  const activeSource =
    sourceMode === 'manual'
      ? manualAsnMatch
        ? sourceFromAsn(manualAsnMatch)
        : undefined
      : // BL-139 — `initialAsnId` carries a receipt's `asnId`, which is a
        // SHIPMENT id for a dock-sourced GR and the ASN NUMBER when the receipt
        // names an ASN the store holds (the store has no separate id). Matching
        // the ASN number as well preselects the receipt's own source; the list
        // is shipments-first, so a dock shipment still wins when both exist.
        sources.find((s) => s.id === selectedSourceId || s.asnNumber === selectedSourceId);

  // Draft the lines when a source resolves (dock selection, manual match, or the
  // initial pre-selection). A newly resolved source REPLACES lines drafted from
  // an earlier one, as a dock pick does (D15a); Back and Next keep the same
  // source, so they never fire this.
  const activeSourceId = activeSource?.id;
  React.useEffect(() => {
    if (activeSource) {
      setLines(activeSource.lines);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSourceId]);

  const sourceValid = !!activeSource;

  return {
    sources,
    manualAsnMatch,
    manualNotFound,
    activeSource,
    sourceValid
  };
};

export default useGrSource;
