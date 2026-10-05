import React, { createContext, useCallback, useContext, useMemo, useReducer } from 'react';

/** @typedef {'success' | 'error' | 'info' | 'warning'} ToastVariant */

/**
 * @typedef {object} Toast
 * @property {string} id
 * @property {ToastVariant} variant
 * @property {string} title
 * @property {string} [description]
 * @property {number} duration
 */

/**
 * @typedef {object} ToastInput
 * @property {ToastVariant} [variant]
 * @property {string} title
 * @property {string} [description]
 * @property {number} [duration]
 */

/**
 * @typedef {object} UseToastReturn
 * @property {(input: ToastInput) => string} toast
 * @property {Toast[]} toasts
 * @property {(id: string) => void} dismiss
 */

/**
 * @typedef {| { type: 'add'; toast: Toast }
 *   | { type: 'dismiss'; id: string }} Action
 */

/**
 * @param {Toast[]} state
 * @param {Action} action
 * @returns {Toast[]}
 */
const reducer = (state, action) => {
  if (action.type === 'add') return [...state, action.toast];
  if (action.type === 'dismiss') return state.filter((t) => t.id !== action.id);
  return state;
};

/** @returns {string} */
const generateId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

const ToastContext = createContext(/** @type {UseToastReturn | null | null} */ (null));

/** @type {React.FC<{ children: React.ReactNode }>} */
export const ToastProvider = ({ children }) => {
  const [toasts, dispatch] = useReducer(reducer, /** @type {Toast[]} */ ([]));

  const dismiss = useCallback(
    /** @param {string} id */ (id) => {
      dispatch({ type: 'dismiss', id });
    },
    []
  );

  const toast = useCallback(
    /** @param {ToastInput} input @returns {string} */ (input) => {
      /** @type {Toast} */
      const next = {
        id: generateId(),
        variant: input.variant ?? 'info',
        title: input.title,
        description: input.description,
        duration: input.duration ?? 4500
      };
      dispatch({ type: 'add', toast: next });
      return next.id;
    },
    []
  );

  const value = /** @type {UseToastReturn} */ (
    useMemo(() => ({ toast, toasts, dismiss }), [toast, toasts, dismiss])
  );

  return React.createElement(ToastContext.Provider, { value }, children);
};

/** @returns {UseToastReturn} */
export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return ctx;
};
