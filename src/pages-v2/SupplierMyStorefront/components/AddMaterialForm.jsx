/** @import React from 'react' */
/** @import { NewMaterial } from '../const' */
import { useTranslation } from 'react-i18next';
import Button from '@components/ui-v2/Button';
import { useCategoryLabel } from '@hooks/useCategoryLabel';
import { inputClass, labelClass } from '../const';

// The option lists stay in the file that maps them: the module-scope-literal
// gate keys a mapped const by that file (`grandfathered.js`), and
// `categoryLabel.test.js` reads CATEGORY_OPTIONS from this file's source.
const CATEGORY_OPTIONS = [
  'Packaging Primary',
  'Packaging Secondary',
  'Labels & Print',
  'Sustainable Packaging'
];
const UOM_OPTIONS = ['PCS', 'KG', 'L', 'MT'];
const CURRENCY_OPTIONS = ['IDR', 'USD', 'EUR'];
const CERT_OPTIONS = ['Halal BPJPH', 'ISO 9001', 'BPOM', 'SNI', 'RSPO'];

/**
 * @typedef {object} AddMaterialFormProps
 * @property {NewMaterial} newMaterial  The draft material (page state).
 * @property {(v: NewMaterial) => void} setNewMaterial
 * @property {(c: string) => void} toggleNewCert  Page handler for a cert checkbox.
 * @property {() => void} onSubmit  "Submit for review" (page's `submitNewMaterial`).
 * @property {() => void} onCancel  Closes the form (page's `setShowAddForm(false)`).
 */

/**
 * The step 2 add-material form: name, SAP code, category, MOQ + UoM, lead
 * time, price + currency, capacity, cert checkboxes and Submit/Cancel. Moved
 * out of `SupplierMyStorefront.jsx` by the Phase 5 page split (no behaviour
 * change); the draft stays in the page.
 * @type {React.FC<AddMaterialFormProps>}
 */
const AddMaterialForm = ({ newMaterial, setNewMaterial, toggleNewCert, onSubmit, onCancel }) => {
  const { t } = useTranslation();
  const cl = useCategoryLabel();
  return (
    <div className="mt-4 bg-bg-hover border border-teal/30 rounded-md p-4">
      <div className="text-sm font-semibold text-text-primary mb-3">
        {t('supplierMyStorefront.addForm.title')}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
        <div>
          <label className="block">
            <span className={labelClass}>{t('supplierMyStorefront.addForm.materialName')}</span>
            <input
              className={inputClass}
              placeholder={t('supplierMyStorefront.addForm.materialNamePlaceholder')}
              value={newMaterial.material}
              onChange={(e) => setNewMaterial({ ...newMaterial, material: e.target.value })}
            />
          </label>
        </div>
        <div>
          <label className="block">
            <span className={labelClass}>{t('supplierMyStorefront.addForm.sapCode')}</span>
            <input
              className={inputClass}
              placeholder={t('supplierMyStorefront.addForm.sapCodePlaceholder')}
              value={newMaterial.sapCode}
              onChange={(e) => setNewMaterial({ ...newMaterial, sapCode: e.target.value })}
            />
          </label>
        </div>
        <div>
          <label className="block">
            <span className={labelClass}>{t('supplierMyStorefront.addForm.category')}</span>
            <select
              className={inputClass}
              value={newMaterial.category}
              onChange={(e) => setNewMaterial({ ...newMaterial, category: e.target.value })}
            >
              {/* value stays canonical EN (stored form data); label localizes via cl() */}
              {CATEGORY_OPTIONS.map((c) => (
                <option key={c} value={c}>
                  {cl(c)}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="grid grid-cols-[1fr_80px] gap-2">
          <div>
            <label className="block">
              <span className={labelClass}>{t('supplierMyStorefront.addForm.moq')}</span>
              <input
                type="number"
                className={inputClass}
                value={newMaterial.moq}
                onChange={(e) => setNewMaterial({ ...newMaterial, moq: e.target.value })}
              />
            </label>
          </div>
          <div>
            <label className="block">
              <span className={labelClass}>{t('supplierMyStorefront.addForm.uom')}</span>
              <select
                className={inputClass}
                value={newMaterial.uom}
                onChange={(e) => setNewMaterial({ ...newMaterial, uom: e.target.value })}
              >
                {UOM_OPTIONS.map((u) => (
                  <option key={u}>{u}</option>
                ))}
              </select>
            </label>
          </div>
        </div>
        <div>
          <label className="block">
            <span className={labelClass}>{t('supplierMyStorefront.addForm.leadTime')}</span>
            <input
              type="number"
              className={inputClass}
              value={newMaterial.leadTime}
              onChange={(e) => setNewMaterial({ ...newMaterial, leadTime: e.target.value })}
            />
          </label>
        </div>
        <div className="grid grid-cols-[1fr_80px] gap-2">
          <div>
            <label className="block">
              <span className={labelClass}>{t('supplierMyStorefront.addForm.unitPrice')}</span>
              <input
                type="number"
                className={inputClass}
                value={newMaterial.unitPrice}
                onChange={(e) =>
                  setNewMaterial({
                    ...newMaterial,
                    unitPrice: e.target.value
                  })
                }
              />
            </label>
          </div>
          <div>
            <label className="block">
              <span className={labelClass}>{t('supplierMyStorefront.addForm.ccy')}</span>
              <select
                className={inputClass}
                value={newMaterial.currency}
                onChange={(e) =>
                  setNewMaterial({
                    ...newMaterial,
                    currency: e.target.value
                  })
                }
              >
                {CURRENCY_OPTIONS.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
          </div>
        </div>
        <div>
          <label className="block">
            <span className={labelClass}>{t('supplierMyStorefront.addForm.capacity')}</span>
            <input
              type="number"
              className={inputClass}
              value={newMaterial.capacity}
              onChange={(e) =>
                setNewMaterial({
                  ...newMaterial,
                  capacity: e.target.value
                })
              }
            />
          </label>
        </div>
      </div>
      <div className="mb-3">
        <label className={labelClass}>{t('supplierMyStorefront.addForm.certifications')}</label>
        <div className="flex flex-wrap gap-3">
          {CERT_OPTIONS.map((c) => (
            <label
              key={c}
              className="flex items-center gap-1.5 text-sm text-text-secondary cursor-pointer"
            >
              <input
                type="checkbox"
                checked={newMaterial.certs.includes(c)}
                onChange={() => toggleNewCert(c)}
                className="accent-teal"
              />
              {c}
            </label>
          ))}
        </div>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" onClick={onSubmit}>
          {t('supplierMyStorefront.action.submitReview')}
        </Button>
        <Button variant="secondary" onClick={onCancel}>
          {t('supplierMyStorefront.action.cancel')}
        </Button>
      </div>
    </div>
  );
};

export default AddMaterialForm;
