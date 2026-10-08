import React from 'react';
import { errorClass, labelClass } from '../const';

/**
 * @typedef {object} FieldProps
 * @property {string} label
 * @property {boolean} [required]
 * @property {string} [error]
 * @property {React.ReactNode} children
 */

// BL-31 (WCAG 1.3.1 / 3.3.1 / 4.1.2): the caption WRAPS the control, so it is
// the control's accessible name (a sibling <label> with no htmlFor names
// nothing); a required field says so to assistive technology, and an error is
// tied to its control with aria-describedby + aria-invalid rather than only
// sitting below it in red.
/**
 * A captioned form control. Wraps one `input` / `select` / `textarea` child in
 * its label and adds `aria-required`, `aria-invalid` and `aria-describedby`
 * from `required` and `error`.
 * @type {React.FC<FieldProps>}
 */
const Field = ({ label, required, error, children }) => {
  const errorId = React.useId();
  const control =
    /** @type {typeof React.isValidElement<Record<string, unknown>>} */ (React.isValidElement)(
      children
    ) &&
    typeof children.type === 'string' &&
    ['input', 'select', 'textarea'].includes(children.type)
      ? React.cloneElement(children, {
          ...(required ? { 'aria-required': true } : {}),
          ...(error ? { 'aria-invalid': true, 'aria-describedby': errorId } : {})
        })
      : children;
  return (
    <div>
      <label className="block">
        <span className={labelClass}>
          {label}
          {required && (
            <span className="text-danger ml-0.5" aria-hidden="true">
              *
            </span>
          )}
        </span>
        {control}
      </label>
      {error && (
        <div id={errorId} className={errorClass}>
          {error}
        </div>
      )}
    </div>
  );
};

export default Field;
