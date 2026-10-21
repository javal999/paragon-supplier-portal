/** @import React from 'react' */
import { useTranslation } from 'react-i18next';
import Tabs from '@components/ui-v2/Tabs';
/** @import { PageTab } from '../const' */

/**
 * P-04 (IA-S03) — the page's two tabs. The second names the sample plan it
 * reads, so its figures are not mistaken for the first tab's.
 * @type {React.FC<{ value: PageTab; onChange: (tab: PageTab) => void }>}
 */
const PageTabs = ({ value, onChange }) => {
  const { t } = useTranslation();
  return (
    <Tabs
      tabs={[
        { id: 'commitments', label: t('fc.sup.pageTab.commitments') },
        { id: 'responses', label: t('fc.sup.pageTab.responses') }
      ]}
      active={value}
      onChange={(id) => onChange(id === 'responses' ? 'responses' : 'commitments')}
      className="mb-4"
    />
  );
};

export default PageTabs;
