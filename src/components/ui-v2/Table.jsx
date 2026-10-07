/** @import * as React from 'react' */
/**
 * @param {TableProps} props
 * @returns {React.ReactNode}
 */
const Table = ({ children, className = '', scrollLabel, ...rest }) => {
  // Shared scroll container: a table's own columns may need more room than
  // the screen provides. The table fills the width and wraps text as before;
  // only when its narrowest layout still does not fit does this wrapper
  // scroll, never the page. No `min-w-max`: an auto-layout table already
  // never shrinks below its min-content, and forcing max-content stopped every
  // cell wrapping, so tables that fit at 1440px started to scroll.
  return (
    <div
      role="region"
      aria-label={scrollLabel}
      tabIndex={0}
      className="relative w-full min-w-0 overflow-x-auto focus:outline-none focus-visible:ring-2 focus-visible:ring-action focus-visible:ring-inset"
    >
      <table className={`w-full text-sm text-text-primary border-collapse ${className}`} {...rest}>
        {children}
      </table>
    </div>
  );
};
export default Table;
/**
 * Every native `<table>` attribute; `children` is required. `scrollLabel` names the horizontal-scroll
 * region for assistive tech (review R2). The wrapper is `tabIndex={0}` + `role="region"` unconditionally:
 * Chrome and Firefox make an overflow container keyboard-focusable on their own, but Safari doesn't, so a
 * read-only table with no focusable cells otherwise leaves off-screen columns unreachable by keyboard there.
 * @typedef {React.HTMLAttributes<HTMLTableElement> & { children: React.ReactNode, scrollLabel?: string }} TableProps
 */
