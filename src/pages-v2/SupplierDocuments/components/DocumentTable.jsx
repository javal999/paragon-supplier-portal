/** @import React from 'react' */
/** @import { SupplierDocument } from '@services/data/types' */
/** @import { UseToastReturn } from '@hooks/useToast' */
import Table from '@components/ui-v2/Table';
import TableHeader, { TableHeaderCell } from '@components/ui-v2/TableHeader';
import { useTranslation } from 'react-i18next';
import DocumentRow from './DocumentRow';

/**
 * @typedef {object} DocumentTableProps
 * @property {SupplierDocument[]} filtered  The rows the filters let through.
 * @property {string} nowIso  The page's ONE clock read, passed to every row.
 * @property {(doc: SupplierDocument) => void} openUploadFor  Opens the certificate declaration panel for a row.
 * @property {(doc: SupplierDocument) => void} openAnswerFor  UCX-P5 — opens the COA form for a COA request.
 * @property {(doc: SupplierDocument) => void} openRenewFor  UCX-P5 — opens the declaration filled from an expiring record.
 * @property {UseToastReturn['toast']} toast  The page's toast function.
 */

/**
 * The documents table: eight header cells, one `DocumentRow` per filtered
 * document, and the empty row when the filters let nothing through. Moved out
 * of `SupplierDocuments.jsx` by the Phase 5 page split (no behaviour change).
 * @type {React.FC<DocumentTableProps>}
 */
const DocumentTable = ({ filtered, nowIso, openUploadFor, openAnswerFor, openRenewFor, toast }) => {
  const { t } = useTranslation();
  return (
    <div className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm overflow-hidden mb-6">
      <Table>
        <TableHeader>
          <TableHeaderCell>{t('supplierDocuments.table.document')}</TableHeaderCell>
          <TableHeaderCell>{t('supplierDocuments.table.category')}</TableHeaderCell>
          <TableHeaderCell>{t('supplierDocuments.table.issuedBy')}</TableHeaderCell>
          <TableHeaderCell>{t('supplierDocuments.table.issued')}</TableHeaderCell>
          <TableHeaderCell>{t('supplierDocuments.table.expiry')}</TableHeaderCell>
          <TableHeaderCell>{t('supplierDocuments.table.status')}</TableHeaderCell>
          <TableHeaderCell>{t('supplierDocuments.table.version')}</TableHeaderCell>
          <TableHeaderCell className="text-right">
            {t('supplierDocuments.table.actions')}
          </TableHeaderCell>
        </TableHeader>
        <tbody>
          {filtered.map((doc) => (
            <DocumentRow
              key={doc.id}
              doc={doc}
              nowIso={nowIso}
              openUploadFor={openUploadFor}
              openAnswerFor={openAnswerFor}
              openRenewFor={openRenewFor}
              toast={toast}
            />
          ))}
          {filtered.length === 0 && (
            <tr>
              <td colSpan={8} className="text-center text-sm text-text-tertiary py-10">
                {t('supplierDocuments.table.empty')}
              </td>
            </tr>
          )}
        </tbody>
      </Table>
    </div>
  );
};

export default DocumentTable;
