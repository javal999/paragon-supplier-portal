/** @import React from 'react' */
import { useTranslation } from 'react-i18next';

/**
 * One titled block of the collected-draft summary (`label`, then `rows` as a
 * definition list), read by the wizard's review step and by the terminal
 * panel. Moved out of `BuyerContracts.jsx` by the Phase 5 page split (no
 * behaviour change).
 *
 * `onEdit`:  Absent on the terminal panel: there is nothing left to edit once the
 *  walkthrough has stopped, and an Edit link there would offer a way back
 *  into a form whose act has already been refused.
 * @type {React.FC<{ label: string; rows: [string, React.ReactNode][]; onEdit?: () => void; }>}
 */
const ReviewSection = ({ label, rows, onEdit }) => {
  const { t } = useTranslation();
  return (
    <section className="border border-border-subtle rounded-md">
      <header className="flex items-center justify-between px-4 py-2 bg-bg-hover">
        <span className="text-label text-text-tertiary uppercase">{label}</span>
        {onEdit && (
          <button
            type="button"
            onClick={onEdit}
            className="text-xs font-medium text-teal-hover hover:text-teal-hover"
          >
            {t('contracts.wizard.review.edit')}
          </button>
        )}
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
