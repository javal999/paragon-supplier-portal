import { useEffect, useRef } from 'react';
/** @import { ForecastVersionView } from '@services/data/types' */
/** @import { VerbAvailability } from '@services/transitions/handoff' */
/** @import { ForecastRun } from '../const' */

/**
 * REQ-E06-01 — records that the supplier opened the stream's current version,
 * for PTI to see who viewed it. Fires when the seat holds `forecast:view` and
 * the supplier's row on that version has no `viewedAt` yet; a publication is
 * recorded at most once per mount.
 * @param {ForecastVersionView | null} current  The stream's current version.
 * @param {string | null | undefined} supplierId  The seat's supplier.
 * @param {VerbAvailability} viewAvail  Whether the seat holds `forecast:view`.
 * @param {ForecastRun} run  The forecast runner.
 */
export function useRecordView(current, supplierId, viewAvail, run) {
  const recorded = useRef(/** @type {Set<string>} */ (new Set()));

  // REQ-E06-01 — opening a version is recorded once, for PTI to see who viewed it.
  useEffect(() => {
    if (!current || !supplierId || viewAvail.kind !== 'held') return;
    const mine = current.suppliers.find((s) => s.supplierId === supplierId);
    if (!mine || mine.viewedAt !== null || recorded.current.has(current.publicationId)) return;
    recorded.current.add(current.publicationId);
    void run({ verb: 'recordView', publicationId: current.publicationId, supplierId });
  }, [current?.publicationId, supplierId, viewAvail.kind]); // eslint-disable-line react-hooks/exhaustive-deps
}
