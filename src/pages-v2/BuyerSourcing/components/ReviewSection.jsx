/** @import React from 'react' */
import { useTranslation } from 'react-i18next';

/**
 * One section of the RFQ wizard's review step: a labelled header with an Edit
 * link (`onEdit` jumps back to the step) and the section's `rows` as a
 * definition list. Moved out of `BuyerSourcing.jsx` by the Phase 5 page split.
 * @type {React.FC<{ label: string; rows: [string, React.ReactNode][]; onEdit: () => void; }>}
 */
const ReviewSection = ({ label, rows, onEdit }) => {
  const { t } = useTranslation();
  return (
    <section className="border border-border-subtle rounded-md">
      <header className="flex items-center justify-between px-4 py-2 bg-bg-hover">
        <span className="text-label text-text-tertiary uppercase">{label}</span>
        <button
          type="button"
          onClick={onEdit}
          className="text-xs font-medium text-teal-hover hover:text-teal-hover"
        >
          {t('sourcing.wizard.review.edit')}
        </button>
      </header>
      <dl className="px-4 py-3 divide-y divide-border-subtle">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between py-2 gap-4">
            <dt className="text-text-tertiary">{k}</dt>
            <dd className="text-text-primary text-right">{v}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
};

export default ReviewSection;
