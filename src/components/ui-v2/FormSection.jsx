/** @import * as React from 'react' */
/** @import { ReactNode } from 'react' */
import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';

/**
 * @typedef {Object} FormSectionProps
 * @property {string} [eyebrow]
 * @property {string} title
 * @property {string} [description]
 * @property {ReactNode} children
 * @property {boolean} [collapsible]
 * @property {boolean} [defaultOpen]
 * @property {string} [className]
 */

/**
 * @param {FormSectionProps} props
 * @returns {React.ReactNode}
 */
const FormSection = ({
  eyebrow,
  title,
  description,
  children,
  collapsible = false,
  defaultOpen = true,
  className = ''
}) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(defaultOpen);
  const showBody = !collapsible || open;

  return (
    <section className={`border border-border-subtle rounded-lg p-6 bg-white ${className}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          {eyebrow ? (
            <div className="text-label text-text-tertiary uppercase mb-1">{eyebrow}</div>
          ) : null}
          <h3 className="text-base font-semibold text-text-primary">{title}</h3>
          {description ? (
            <p className="text-sm text-text-secondary mt-1 mb-4">{description}</p>
          ) : null}
        </div>
        {collapsible ? (
          <button
            type="button"
            // BL-31: was an English literal on every locale.
            aria-label={t(open ? 'ui.collapseSection' : 'ui.expandSection')}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="shrink-0 text-text-tertiary hover:text-text-secondary transition-colors"
          >
            {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
        ) : null}
      </div>
      <div
        className={`grid transition-all duration-200 ease-out ${
          showBody ? 'grid-rows-[1fr] opacity-100 mt-4' : 'grid-rows-[0fr] opacity-0 mt-0'
        }`}
      >
        {/* BL-31: a collapsed body is inert, so its fields leave the tab order.
    React 19 types `inert` as a boolean and renders `inert=""` for true;
    React 18 needed the empty string itself (changed in the Phase 2
    upgrade, 2026-10-02). */}
        <div className="overflow-hidden" inert={!showBody}>
          <div className="flex flex-col gap-4">{children}</div>
        </div>
      </div>
    </section>
  );
};

export default FormSection;
