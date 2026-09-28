import React from 'react';

interface TableRowProps extends React.HTMLAttributes<HTMLTableRowElement> {
  children: React.ReactNode;
}

// BL-31 (SC-07 · WCAG 2.1.1): a row that opens a record on click must open it
// from the keyboard too. The list pages (PO, invoice, ASN, GR, contract,
// delivery agreement, requisition, RFQ, supplier, application lists) made the
// whole row the ONLY way into the record's drawer, and a <tr> is not in the tab
// order — so a keyboard user could see every order and open none.
//
// The fix lives in the primitive: a clickable row becomes focusable and
// activates on Enter or Space, with a visible focus ring. Keys pressed on a
// control INSIDE the row (a checkbox, a button, an input) are left to that
// control. The row keeps its table semantics (no role="button"), so a screen
// reader still reads it as a row of cells.
const ROW_FOCUS =
  'cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-action';

export function rowActivation<E extends HTMLElement>(
  onClick: ((e: React.MouseEvent<E>) => void) | undefined,
  onKeyDown?: (e: React.KeyboardEvent<E>) => void,
): Pick<React.HTMLAttributes<E>, 'tabIndex' | 'onKeyDown'> {
  if (!onClick) return onKeyDown ? { onKeyDown } : {};
  return {
    tabIndex: 0,
    onKeyDown: (e: React.KeyboardEvent<E>) => {
      onKeyDown?.(e);
      if (e.defaultPrevented || e.target !== e.currentTarget) return;
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onClick(e as unknown as React.MouseEvent<E>);
      }
    },
  };
}

export const ROW_FOCUS_CLASS = ROW_FOCUS;

// forwardRef so a deep-linked row can be scrolled into view (`useRowHighlight`)
// without every existing caller having to change — untouched callers pass no
// ref and get exactly the element they got before.
const TableRow = React.forwardRef<HTMLTableRowElement, TableRowProps>(
  ({ children, className = '', onClick, onKeyDown, tabIndex, ...rest }, ref) => {
    return (
      <tr
        ref={ref}
        className={`border-b border-border-subtle hover:bg-bg-hover transition-colors ${
          onClick ? ROW_FOCUS : ''
        } ${className}`}
        onClick={onClick}
        {...rowActivation(onClick, onKeyDown)}
        {...(tabIndex !== undefined ? { tabIndex } : {})}
        {...rest}
      >
        {children}
      </tr>
    );
  },
);
TableRow.displayName = 'TableRow';

export default TableRow;
