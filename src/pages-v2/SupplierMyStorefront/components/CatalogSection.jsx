/** @import React from 'react' */
/** @import { CatalogItem } from '@services/data/types' */
/** @import { NewMaterial } from '../const' */
import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';
import FormSection from '@components/ui-v2/FormSection';
import Button from '@components/ui-v2/Button';
import Table from '@components/ui-v2/Table';
import TableHeader, { TableHeaderCell } from '@components/ui-v2/TableHeader';
import CatalogRow from './CatalogRow';
import AddMaterialForm from './AddMaterialForm';

/**
 * @typedef {object} CatalogSectionProps
 * @property {CatalogItem[]} catalog  The session's catalog rows (page state).
 * @property {boolean} showAddForm  Whether the add-material form is open (page state).
 * @property {(v: boolean) => void} setShowAddForm
 * @property {NewMaterial} newMaterial  The add-material draft (page state).
 * @property {(v: NewMaterial) => void} setNewMaterial
 * @property {(id: string) => void} toggleCatalogVisibility  Page handler for a row's switch.
 * @property {(id: string) => void} removeCatalogItem  Page handler for a row's remove button.
 * @property {(c: string) => void} toggleNewCert  Page handler for a draft cert checkbox.
 * @property {() => void} submitNewMaterial  Page handler for "Submit for review".
 */

/**
 * Step 2, materials catalog: the "Add material" toggle, the catalog table and,
 * when open, the add-material form. Moved out of `SupplierMyStorefront.jsx` by
 * the Phase 5 page split (no behaviour change); state and handlers stay in the
 * page.
 * @type {React.FC<CatalogSectionProps>}
 */
const CatalogSection = ({
  catalog,
  showAddForm,
  setShowAddForm,
  newMaterial,
  setNewMaterial,
  toggleCatalogVisibility,
  removeCatalogItem,
  toggleNewCert,
  submitNewMaterial
}) => {
  const { t } = useTranslation();
  return (
    <FormSection
      eyebrow={t('supplierMyStorefront.step', { n: 2 })}
      title={t('supplierMyStorefront.step2.title')}
      description={t('supplierMyStorefront.step2.description')}
    >
      <div className="flex justify-end mb-3">
        <Button variant="outline" icon={Plus} onClick={() => setShowAddForm(!showAddForm)}>
          {t('supplierMyStorefront.action.addMaterial')}
        </Button>
      </div>
      <div className="bg-bg-surface border border-border-subtle rounded-md overflow-hidden">
        <Table>
          <TableHeader>
            <TableHeaderCell>{t('supplierMyStorefront.col.material')}</TableHeaderCell>
            <TableHeaderCell>{t('supplierMyStorefront.col.category')}</TableHeaderCell>
            <TableHeaderCell>{t('supplierMyStorefront.col.moq')}</TableHeaderCell>
            <TableHeaderCell>{t('supplierMyStorefront.col.leadTime')}</TableHeaderCell>
            <TableHeaderCell>{t('supplierMyStorefront.col.unitPrice')}</TableHeaderCell>
            <TableHeaderCell>{t('supplierMyStorefront.col.capacity')}</TableHeaderCell>
            <TableHeaderCell>{t('supplierMyStorefront.col.certs')}</TableHeaderCell>
            <TableHeaderCell>{t('supplierMyStorefront.col.visible')}</TableHeaderCell>
            <TableHeaderCell className="text-right">
              {t('supplierMyStorefront.col.remove')}
            </TableHeaderCell>
          </TableHeader>
          <tbody>
            {catalog.map((item) => (
              <CatalogRow
                key={item.id}
                item={item}
                onToggleVisibility={toggleCatalogVisibility}
                onRemove={removeCatalogItem}
              />
            ))}
          </tbody>
        </Table>
      </div>
      {showAddForm && (
        <AddMaterialForm
          newMaterial={newMaterial}
          setNewMaterial={setNewMaterial}
          toggleNewCert={toggleNewCert}
          onSubmit={submitNewMaterial}
          onCancel={() => setShowAddForm(false)}
        />
      )}
    </FormSection>
  );
};

export default CatalogSection;
