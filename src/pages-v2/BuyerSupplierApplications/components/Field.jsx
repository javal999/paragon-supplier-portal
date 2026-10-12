/** @import React from 'react' */

/**
 * One label/value row. Local because it is this panel's shape, not a token.
 * Moved out of `BuyerSupplierApplications` by the Phase 5 page split.
 * @type {React.FC<{ label: string; children: React.ReactNode }>}
 */
const Field = ({ label, children }) => (
  <div className="flex gap-3">
    <dt className="text-text-tertiary w-36 shrink-0">{label}</dt>
    <dd className="text-text-primary">{children}</dd>
  </div>
);

export default Field;
