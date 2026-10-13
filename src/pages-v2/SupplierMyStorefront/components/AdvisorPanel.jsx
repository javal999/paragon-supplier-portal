/** @import React from 'react' */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, ChevronUp } from 'lucide-react';

/**
 * The collapsible storefront advisor at the foot of step 6: a heading with the
 * completeness percentage and five static tips. Owns its own open/closed state.
 * Moved out of `SupplierMyStorefront.jsx` by the Phase 5 page split (no
 * behaviour change).
 * @type {React.FC<{ completeness: number }>}
 */
const AdvisorPanel = ({ completeness }) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-teal-soft border border-teal/30 rounded-md overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full px-4 py-3 flex items-center justify-between text-sm font-semibold text-teal-hover"
      >
        <span>{t('supplierMyStorefront.advisor.title')}</span>
        {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>
      {open && (
        <div className="px-4 pb-4 border-t border-teal/20 text-sm text-text-secondary leading-relaxed">
          <div className="mt-3 mb-1 font-semibold text-text-primary">
            {t('supplierMyStorefront.advisor.heading', { pct: completeness })}
          </div>
          <ul className="list-disc list-inside flex flex-col gap-1 mt-2">
            <li>{t('supplierMyStorefront.advisor.item.halal')}</li>
            <li>{t('supplierMyStorefront.advisor.item.capacity')}</li>
            <li>{t('supplierMyStorefront.advisor.item.images')}</li>
            <li>{t('supplierMyStorefront.advisor.item.materials')}</li>
            <li>{t('supplierMyStorefront.advisor.item.references')}</li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default AdvisorPanel;
