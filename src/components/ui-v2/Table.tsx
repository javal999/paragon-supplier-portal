import React from 'react';

interface TableProps extends React.HTMLAttributes<HTMLTableElement> {
  children: React.ReactNode;
}

const Table: React.FC<TableProps> = ({ children, className = '', ...rest }) => {
  // Shared scroll container: a table's own columns may need more room than
  // the screen provides. The table fills the width and wraps text as before;
  // only when its narrowest layout still does not fit does this wrapper
  // scroll, never the page. No `min-w-max`: an auto-layout table already
  // never shrinks below its min-content, and forcing max-content stopped every
  // cell wrapping, so tables that fit at 1440px started to scroll.
  return (
    <div className="relative w-full min-w-0 overflow-x-auto">
      <table
        className={`w-full text-sm text-text-primary border-collapse ${className}`}
        {...rest}
      >
        {children}
      </table>
    </div>
  );
};

export default Table;
