/** @import * as React from 'react' */

/**
 * @typedef {Object} PageMetaLineProps
 * @property {React.ReactNode} children
 * @property {string} [className]
 */

/**
 * @param {PageMetaLineProps} props
 * @returns {React.ReactNode}
 */
const PageMetaLine = ({ children, className = '' }) => {
  return <p className={`text-meta text-text-tertiary ${className}`}>{children}</p>;
};

export default PageMetaLine;
