/** @import React from 'react' */
import { useTranslation } from 'react-i18next';
import SubTabs from '@components/ui-v2/SubTabs';
/** @import { ViewMode } from '../const' */
import { inputClass } from '../../inventory/inventoryDisplay';

/**
 * The view toolbar above the tables: the Forecast / Changes tabs (Changes
 * counts the changed and added lines) and the material filter.
 * @type {React.FC<{
 *   mode: ViewMode;
 *   onModeChange: (mode: ViewMode) => void;
 *   changeCount: number;
 *   material: string;
 *   onMaterialChange: (material: string) => void;
 *   materials: string[];
 * }>}
 */
const ViewToolbar = ({
  mode,
  onModeChange,
  changeCount,
  material,
  onMaterialChange,
  materials
}) => {
  const { t } = useTranslation();
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
      <SubTabs
        options={[
          { id: 'forecast', label: t('fc.sup.tab.forecast') },
          { id: 'changes', label: t('fc.sup.tab.changes'), count: changeCount }
        ]}
        value={mode}
        onChange={onModeChange}
      />
      <label className="text-sm text-text-secondary flex items-center gap-2">
        {t('fc.col.material')}
        <select
          className={`${inputClass} w-auto`}
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
    </div>
  );
};

export default ViewToolbar;
