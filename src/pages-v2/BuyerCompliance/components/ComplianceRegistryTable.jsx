/** @import React from 'react' */
/** @import { TFunction } from 'i18next' */
/** @import { UseToastReturn } from '@hooks/useToast' */
/** @import { Row } from '../const' */
import { Database } from 'lucide-react';
import Table from '@components/ui-v2/Table';
import TableHeader, { TableHeaderCell } from '@components/ui-v2/TableHeader';
import RegistryRow from './RegistryRow';

/**
 * @typedef {object} ComplianceRegistryTableProps
 * @property {Row[]} filtered The registry rows left after the page's filters.
 * @property {UseToastReturn['toast']} toast The page's toast function, for the Remind action.
 * @property {TFunction} t
 */

/**
 * The certificate registry: the one-line S/4HANA sync note, then the
 * nine-column table (one `RegistryRow` per filtered row, or the empty line).
 * Moved out of `BuyerCompliance.jsx` by the Phase 5 page split (no behaviour
 * change).
 * @type {React.FC<ComplianceRegistryTableProps>}
 */
const ComplianceRegistryTable = ({ filtered, toast, t }) => (
  <>
    {/* ── THE COLUMN'S ONE-LINE EXPLANATION, AND WHY IT IS NOT A BANNER ──
        Two banners already sit above (data readiness, and the BPJPH date), and
        a third would train the eye to skip all three. This is a quiet line
        attached to the table it describes. It states the NEGATIVE explicitly —
        "no certificate here has been handed to S/4HANA" — because the column
        renders one value on every row, and a uniform column with no caption
        reads as decoration rather than as a fact. */}
    <div className="flex items-start gap-2 mb-2 text-xs text-text-tertiary">
      <Database size={12} className="shrink-0 mt-0.5" />
      <span data-testid="sap-sync-note">{t('compliance.sapSync.note')}</span>
    </div>

    {/* ⚠️ `overflow-x-auto`, NOT `overflow-hidden` — AND THE OLD VALUE WAS
        ALREADY LOSING A COLUMN. Measured in the built bundle at a 1208px
        viewport: the table wants 1007px inside an 896px container, so the
        right-hand **Remind** action was clipped and UNREACHABLE — 24px of it
        before this batch, 110px after the ninth column landed. Clipping is the
        worst of the three options because it is silent: the control does not
        look disabled, it looks absent. Scrolling the table inside its own box
        keeps every column reachable at every width and fixes the 24px that
        predates this change. */}
    <div className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm overflow-x-auto mb-6">
      <Table>
        <TableHeader>
          <TableHeaderCell>{t('compliance.table.supplier')}</TableHeaderCell>
          <TableHeaderCell>{t('compliance.table.certificate')}</TableHeaderCell>
          <TableHeaderCell>{t('compliance.table.category')}</TableHeaderCell>
          <TableHeaderCell>{t('compliance.table.issuedBy')}</TableHeaderCell>
          <TableHeaderCell>{t('compliance.table.expiry')}</TableHeaderCell>
          <TableHeaderCell>{t('compliance.table.status')}</TableHeaderCell>
          <TableHeaderCell>{t('compliance.table.sapSync')}</TableHeaderCell>
          <TableHeaderCell>{t('compliance.table.actionRequired')}</TableHeaderCell>
          <TableHeaderCell className="text-right">{t('compliance.table.remind')}</TableHeaderCell>
        </TableHeader>
        <tbody>
          {filtered.map((row) => (
            <RegistryRow key={row.entry.id} row={row} toast={toast} t={t} />
          ))}
          {filtered.length === 0 && (
            <tr>
              <td colSpan={9} className="text-center text-sm text-text-tertiary py-10">
                {t('compliance.table.empty')}
              </td>
            </tr>
          )}
        </tbody>
      </Table>
    </div>
  </>
);

export default ComplianceRegistryTable;
