import React, { useMemo, useState } from 'react';
/** @import { Shipment, ASN } from '@services/data/types' */
/** @import { GrSource, LineDraft, SourceMode } from '../utils' */
import { sourceFromAsn, sourceFromShipment } from '../utils';
import { ELIGIBLE_STATUSES, RECEIVABLE_ASN_STATUSES } from '../const';

/**
 * @typedef {object} UseGrSourceArgs
 * @property {string} [initialAsnId] -  Pre-selects a source when the page opens the wizard for one ASN.
 * @property {Shipment[]} shipments
 * @property {ASN[]} asns
 * @property {LineDraft[]} lines -  The drafted lines; read so the auto-populate fills only an empty draft.
 * @property {(lines: LineDraft[]) => void} setLines
 */

/**
 * Step 1's state and the source it resolves to: the receivable sources (dock
 * shipments ∪ live receivable ASNs), the dock pick or the typed ASN number,
 * and the active source. Auto-populates the line drafts when a source resolves
 * and none are drafted yet.
 * @param {UseGrSourceArgs} args
 */
const useGrSource = ({ initialAsnId, shipments, asns, lines, setLines }) => {
  // Step 1 state
  const [sourceMode, setSourceMode] = useState(/** @type {SourceMode} */ ('shipment'));
  const [selectedSourceId, setSelectedSourceId] = useState(
    /** @type {string} */ (initialAsnId ?? '')
  );
  const [manualASN, setManualASN] = useState('');

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
      : sources.find((s) => s.id === selectedSourceId);

  // Auto-populate lines when a source resolves (dock selection, manual match, or
  // the initial pre-selection) and none are drafted yet.
  const activeSourceId = activeSource?.id;
  React.useEffect(() => {
    if (activeSource && lines.length === 0) {
      setLines(activeSource.lines);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSourceId]);

  const sourceValid = !!activeSource;

  return {
    sourceMode,
    setSourceMode,
    selectedSourceId,
    setSelectedSourceId,
    manualASN,
    setManualASN,
    sources,
    manualAsnMatch,
    manualNotFound,
    activeSource,
    sourceValid
  };
};

export default useGrSource;
