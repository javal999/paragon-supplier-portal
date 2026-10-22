/** @import React from 'react' */
import { useTranslation } from 'react-i18next';
import Tabs from '@components/ui-v2/Tabs';
/** @import { CommitmentsTab } from '../const' */

/**
 * P-04 (IA-B05) — the page's two tabs. The second names the sample plan it
 * reads, so its figures are not mistaken for the first tab's.
 * @type {React.FC<{ value: CommitmentsTab; onChange: (tab: CommitmentsTab) => void }>}
 */
const CommitmentTabs = ({ value, onChange }) => {
  const { t } = useTranslation();
  return (
    <Tabs
      tabs={[
        { id: 'gaps', label: t('fc.pti.pageTab.gaps') },
        { id: 'consolidation', label: t('fc.pti.pageTab.consolidation') }
      ]}
      active={value}
      onChange={(id) => onChange(id === 'consolidation' ? 'consolidation' : 'gaps')}
      className="mb-4"
    />
  );
};

export default CommitmentTabs;
