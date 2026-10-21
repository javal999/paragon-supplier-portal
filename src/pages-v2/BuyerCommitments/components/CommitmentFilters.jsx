/** @import React from 'react' */
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import SubTabs from '@components/ui-v2/SubTabs';
import { fieldClass } from '../const';
import ReasonFilter from '../../inventory/ReasonFilter';
/** @import { ForecastStream } from '@services/sdc/types' */

/**
 * The stream tabs, the supplier, material and reason filters, and the links to
 * the supplier follow-up list and the earlier responses. Switching stream
 * clears every filter (the page's `onStreamChange`). CAP-5 — the Reason filter
 * narrows the exception list by the supplier's shortfall reason.
 * @type {React.FC<{
 *   activeStream: ForecastStream;
 *   onStreamChange: (s: ForecastStream) => void;
 *   supplier: string;
 *   onSupplierChange: (id: string) => void;
 *   suppliers: readonly [string, string][];
 *   material: string;
 *   onMaterialChange: (code: string) => void;
 *   materials: readonly string[];
 *   reasons: readonly string[];
 *   onReasonsChange: (next: string[]) => void;
 *   reasonOptions: readonly { id: string; count: number }[];
 * }>}
 */
const CommitmentFilters = ({
  activeStream,
  onStreamChange,
  supplier,
  onSupplierChange,
  suppliers,
  material,
  onMaterialChange,
  materials,
  reasons,
  onReasonsChange,
  reasonOptions
}) => {
  const { t } = useTranslation();
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
      <SubTabs
        options={
          /** @type {ForecastStream[]} */ (['packaging', 'rawMaterial']).map((s) => ({
            id: s,
            label: t(`fc.stream.${s}`)
          }))
        }
        value={activeStream}
        onChange={onStreamChange}
      />
      <div className="flex flex-wrap gap-3">
        <label className="text-sm text-text-secondary flex items-center gap-2">
          {t('fc.col.supplier')}
          <select
            className={`${fieldClass} w-auto`}
            value={supplier}
            onChange={(e) => onSupplierChange(e.target.value)}
            data-testid="fc-supplier-filter"
          >
            <option value="">{t('fc.allSuppliers')}</option>
            {suppliers.map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm text-text-secondary flex items-center gap-2">
          {t('fc.col.material')}
          <select
            className={`${fieldClass} w-auto`}
            value={material}
            onChange={(e) => onMaterialChange(e.target.value)}
            data-testid="fc-material-filter"
          >
            <option value="">{t('fc.allMaterials')}</option>
            {materials.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </label>
        <ReasonFilter
          list="commitmentShortfall"
          options={reasonOptions}
          value={reasons}
          onChange={onReasonsChange}
          testId="fc-reason-filter"
        />
        <Link
          to="/buyer/comm-hub?tab=follow-up"
          className="text-sm text-action-hover hover:underline self-center"
        >
          {t('fc.pti.gaps.followUp')}
        </Link>
        <Link
          to="/buyer/collaboration/responses"
          className="text-sm text-action-hover hover:underline self-center"
        >
          {t('fc.pti.gaps.earlierResponses')}
        </Link>
      </div>
    </div>
  );
};

export default CommitmentFilters;
