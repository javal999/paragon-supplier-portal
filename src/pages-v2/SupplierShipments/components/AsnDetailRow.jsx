/** @import React from 'react' */
/** @import { ASN } from '@services/data/types' */
import { ShelfLifeExceptionDetail } from '../../shipments/ShelfLifeParts';
import AsnDetailFacts from './AsnDetailFacts';
import AsnDetailLines from './AsnDetailLines';
import AsnEtaChange from './AsnEtaChange';

/**
 * The expanded row under an ASN: its details and line items side by side,
 * then the shelf-life exception record. The ETA change inside that record is
 * offered only when the seat holds `asn:submit` (`submitHeld`).
 * @type {React.FC<{ asn: ASN; submitHeld: boolean }>}
 */
const AsnDetailRow = ({ asn, submitHeld }) => (
  <tr className="bg-bg-page border-t border-border-subtle">
    <td colSpan={8} className="px-6 py-4">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.4fr] gap-5">
        <AsnDetailFacts asn={asn} />
        <AsnDetailLines asn={asn} />
      </div>
      {/* MR-6 BR-09 — the exception record, and edge case 1's ETA change. */}
      <div className="mt-4">
        <ShelfLifeExceptionDetail asn={asn}>
          {submitHeld ? <AsnEtaChange asn={asn} /> : null}
        </ShelfLifeExceptionDetail>
      </div>
    </td>
  </tr>
);

export default AsnDetailRow;
