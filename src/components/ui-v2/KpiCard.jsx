/** @import * as React from 'react' */
/** @import { LucideIcon } from 'lucide-react' */

/**
 * @typedef {Object} KpiCardProps
 * @property {string} eyebrow
 * @property {React.ReactNode} value
 * @property {React.ReactNode} [subtitle]
 * @property {LucideIcon} [icon]
 * @property {string} [className]
 * @property {() => void} [onClick]
 * @property {boolean} [active]
 */

/**
 * @param {KpiCardProps} props
 * @returns {React.ReactNode}
 */
const KpiCard = ({
  eyebrow,
  value,
  subtitle,
  icon: Icon,
  className = '',
  onClick,
  active = false
}) => {
  const baseClass = `relative rounded-lg p-6 shadow-sm border text-left ${
    active ? 'bg-action-soft border-action' : 'bg-bg-surface border-border-subtle'
  } ${className}`;

  const content = (
    <>
      {Icon ? <Icon size={18} className="absolute top-5 right-5 text-text-tertiary" /> : null}
      <div className="text-eyebrow text-text-tertiary uppercase">{eyebrow}</div>
      <div className="text-kpi font-mono tabular-nums text-data-navy mt-3">{value}</div>
      {subtitle ? <div className="text-meta text-text-secondary mt-2">{subtitle}</div> : null}
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-pressed={active}
        className={`${baseClass} w-full cursor-pointer transition-colors hover:bg-bg-hover focus:outline-none focus:ring-2 focus:ring-action/40`}
      >
        {content}
      </button>
    );
  }

  return <div className={baseClass}>{content}</div>;
};

export default KpiCard;
