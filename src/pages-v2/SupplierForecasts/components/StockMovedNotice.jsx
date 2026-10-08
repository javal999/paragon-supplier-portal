/** @import React from 'react' */
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { ArrowRight, Boxes } from 'lucide-react';

/**
 * The "Stock" tab, which is a signpost and not an entry point (BL-60): stock
 * is entered on the Stock page, and this card links there. Takes no props.
 * @type {React.FC}
 */
const StockMovedNotice = () => {
  const { t } = useTranslation();
  // REQ-E08-02 BR-09 (BL-60) — ONE stock entry point. The batch grid, its
  // free-form spreadsheet import and the single-declaration form that
  // lived here were retired: stock is entered on the Stock page, where
  // manual entry and the template carry the same fields. The tab stays
  // as a signpost so a supplier who looks here is not left at a dead end.
  return (
    <div
      className="bg-bg-surface border border-border-subtle rounded-lg py-10 px-6 text-center"
      data-testid="sdcsup-stock-moved"
    >
      <div className="inline-flex w-12 h-12 rounded-full bg-bg-hover items-center justify-center mb-3">
        <Boxes size={20} className="text-text-tertiary" />
      </div>
      <div className="text-base font-semibold text-text-primary mb-1">
        {t('sdcSup.stock.moved.title')}
      </div>
      <p className="text-sm text-text-tertiary mb-4">{t('sdcSup.stock.moved.body')}</p>
      <Link
        to="/supplier/inventory"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-action hover:underline"
        data-testid="sdcsup-stock-moved-link"
      >
        {t('sdcSup.stock.moved.link')}
        <ArrowRight size={14} aria-hidden="true" />
      </Link>
    </div>
  );
};

export default StockMovedNotice;
