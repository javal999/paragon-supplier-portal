// Module-scope constants shared by the registration steps.
//
// The option lists each step maps (`COUNTRIES`, `CONTACT_ROLES`, `BANKS`, …)
// are NOT here on purpose: the module-scope-literal gate links a const to the
// `.map()` that renders it within ONE file, so each list stays in the step
// component that maps it (`src/lib/moduleScopeLiteralGate/grandfathered.js`).

/** Class string for every text input, select and textarea in the wizard. */
export const inputClass =
  'w-full px-3 py-2 text-sm text-text-primary bg-white border border-border-input rounded-md focus:outline-none focus:border-action placeholder:text-text-tertiary';
/** Class string for a field caption. */
export const labelClass = 'block text-label text-text-tertiary uppercase mb-1';
/** Class string for a field's error message. */
export const errorClass = 'text-danger text-xs mt-1';
