/** @import React from 'react' */
/** @import { TFunction } from 'i18next' */
/** @import { ASN, CallOffWarning } from '@services/data/types' */
import Data from '@components/ui-v2/Data';
import StatusPill from '@components/ui-v2/StatusPill';
import TrackingNumber from '@components/ui-v2/TrackingNumber';
import { AsnPlannerMarkers } from '../../shipments/CallOffWarnings';
import { BlockedStockMarker, approvedIntoBlockedStock } from '../../shipments/ShelfLifeParts';

/**
 * @typedef {object} DrilledAsnSectionProps
 * @property {readonly ASN[]} drilledAsns  The PO's ASNs — the records the summary's ASN cell counted (BR-09).
 * @property {Map<string, { asn: ASN; warnings: CallOffWarning[] }>} asnByNumber
 *   Each ASN with its CURRENT call-off warnings (MR-6 BR-12).
 * @property {TFunction} t
 */

/**
 * The drilled PO's ASN list (REQ-E07-03), shown only while the page is
 * filtered to one PO. A single ASN arrives OPEN with its lines (AC-03). Moved
 * out of `BuyerShipments.jsx` by the Phase 5 page split (no behaviour change).
 * @type {React.FC<DrilledAsnSectionProps>}
 */
const DrilledAsnSection = ({ drilledAsns, asnByNumber, t }) => (
  <section
    className="border border-border-subtle rounded-lg bg-bg-surface mb-6 overflow-x-auto"
    data-testid="drill-asn-section"
    aria-label={t('oc.drill.asnSection')}
  >
    <h2 className="text-sm font-semibold text-text-primary px-4 py-3 border-b border-border-subtle">
      {t('oc.drill.asnSection')}
    </h2>
    {drilledAsns.length === 0 ? (
      <p className="px-4 py-4 text-sm text-text-tertiary">{t('oc.summary.empty.asns.why')}</p>
    ) : (
      <ul className="divide-y divide-border-subtle">
        {drilledAsns.map((a) => (
          <li
            key={a.asnNumber}
            data-testid={`drill-asn-${a.asnNumber}`}
            /* AC-03 — exactly one record arrives OPEN, not as a list of one. */
            data-open={drilledAsns.length === 1 ? 'true' : 'false'}
            className="px-4 py-3 flex flex-wrap items-center gap-3 text-sm"
          >
            <Data className="font-semibold">{a.asnNumber}</Data>
            <StatusPill>{a.status}</StatusPill>
            <span className="text-text-secondary">{a.carrier}</span>
            {/* BL-51 — the tracking number links to the 3PL's page, or is plain. */}
            <TrackingNumber
              threePlId={a.threePlId}
              trackingNumber={a.trackingNumber}
              className="text-text-secondary"
              // Not `drill-asn-…`: that prefix names the ROWS, and a sweep counts them.
              testId={`asn-tracking-drill-${a.asnNumber}`}
            />
            <Data className="text-text-secondary">{a.eta}</Data>
            {/* MR-6 BR-12 / FU-7 — Mismatch and "not in declared stock" on every row;
                the one open record shows the batch marker on its lines instead. */}
            <div className="w-full">
              <AsnPlannerMarkers
                asn={drilledAsns.length === 1 ? { ...a, lineItems: [] } : a}
                warnings={asnByNumber.get(a.asnNumber)?.warnings ?? []}
              />
            </div>
            {drilledAsns.length === 1 && <DrilledAsnLines a={a} t={t} />}
          </li>
        ))}
      </ul>
    )}
  </section>
);

/**
 * The open ASN's lines: material, quantity, batch, and the MR-6 markers for a
 * typed batch (BR-04) and for receipt into blocked stock (BR-09).
 * @type {React.FC<{ a: ASN; t: TFunction }>}
 */
const DrilledAsnLines = ({ a, t }) => (
  <ul className="w-full mt-2 space-y-1">
    {a.lineItems.map((li) => (
      <li key={li.materialCode} className="text-text-secondary">
        <Data>{li.materialCode}</Data> — {li.description} · <Data>{li.shippedQty}</Data>{' '}
        {li.uom ?? ''}
        {li.lotNumber ? (
          <>
            {' · '}
            {t('fc.asn.col.batch')} <Data>{li.lotNumber}</Data>
          </>
        ) : null}
        {/* MR-6 BR-04 — PTI sees a batch the supplier typed rather than picked. */}
        {li.batchSource === 'typed' ? (
          <span
            data-testid={`asn-batch-not-declared-${a.asnNumber}-${li.materialCode}`}
            className="ml-2 inline-block px-1.5 py-0.5 rounded border border-warning bg-warning-soft text-[length:var(--fs-label-3)] text-warning-hover"
          >
            {t('fc.asn.batch.notDeclared')}
          </span>
        ) : null}
        {/* MR-6 BR-09 — an approved shelf-life exception is received into blocked stock. */}
        {approvedIntoBlockedStock(a, li) ? (
          <span className="ml-2">
            <BlockedStockMarker testId={`asn-line-blocked-${a.asnNumber}-${li.materialCode}`} />
          </span>
        ) : null}
      </li>
    ))}
  </ul>
);

export default DrilledAsnSection;
