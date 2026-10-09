/** @import * as React from 'react' */
import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, ChevronDown, Loader2, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { highlightMatch } from './highlightMatch';
/**
 * GLOBAL KILL SWITCH (review Q6). Build with `VITE_SELECTFIELD_MODE=native`
 * (e.g. a Vercel env var, then redeploy) and every SelectField renders the
 * plain native `<select>`, whatever its option count — the fallback if the
 * combobox misbehaves in production. Read per render, not at module load,
 * so a test can stub it. With `onSearch` the native fallback lists only the
 * current page (a native `<select>` cannot search). Read through a local cast
 * because `src/vite-env.d.ts`, where env vars are normally declared, is
 * outside this PR.
 * @returns {boolean}
 */
function nativeModeForced() {
  return (
    /** @type {Record<string, string | undefined>} */ (import.meta.env).VITE_SELECTFIELD_MODE ===
    'native'
  );
}
/**
 * Where `position: fixed` coordinates are measured from inside `el`. Normally
 * the viewport; but a `transform` / `filter` / `perspective` / `contain`
 * ancestor becomes the containing block for fixed descendants, and the panel
 * would land offset by that ancestor's position (e.g. a drawer mid-way through
 * its slide-in animation). Returns that ancestor's origin, or 0/0.
 * @param {HTMLElement} el
 * @returns {{ x: number; y: number }}
 */
function fixedOrigin(el) {
  for (
    let n = /** @type {HTMLElement | null} */ (el);
    n && n !== document.documentElement;
    n = n.parentElement
  ) {
    const cs = getComputedStyle(n);
    const contain = cs.contain || '';
    if (
      (cs.transform && cs.transform !== 'none') ||
      (cs.perspective && cs.perspective !== 'none') ||
      (cs.filter && cs.filter !== 'none') ||
      /paint|layout|strict|content/.test(contain) ||
      /transform|perspective|filter/.test(cs.willChange || '')
    ) {
      const r = n.getBoundingClientRect();
      return { x: r.left + n.clientLeft, y: r.top + n.clientTop };
    }
  }
  return { x: 0, y: 0 };
}
const NATIVE_NONE = ''; // the placeholder <option>
const NATIVE_UNAVAILABLE = '__unavailable__'; // the "Unavailable: …" <option>
const ROW_HEIGHT_PLAIN = 36;
const ROW_HEIGHT_WITH_DESCRIPTION = 52;
const PANEL_MAX_HEIGHT = 288; // 8 plain rows — the ceiling, not a guarantee
const PANEL_MIN_HEIGHT = 120; // last-resort floor if the trigger sits very low
const PANEL_BOTTOM_MARGIN = 24; // stays clear of the viewport edge, not flush
const SEARCH_DEBOUNCE_MS = 300;
export const DEFAULT_COMBOBOX_THRESHOLD = 10;
const DEFAULT_VIRTUALIZE_THRESHOLD = 300;
const OVERSCAN = 4;
const controlBaseClass =
  'w-full bg-white border border-border-input rounded-md px-3 py-2 text-sm placeholder:text-text-tertiary focus:outline-none focus:border-action disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-bg-hover';
/**
 * @param {SelectFieldProps} props
 * @returns {React.ReactNode}
 */
const SelectField = ({
  options,
  value,
  onChange,
  placeholder,
  ariaLabel,
  clearable = false,
  className = '',
  disabled = false,
  loading = false,
  error = false,
  onRetry,
  comboboxThreshold = DEFAULT_COMBOBOX_THRESHOLD,
  virtualizeThreshold = DEFAULT_VIRTUALIZE_THRESHOLD,
  onSearch,
  searchPlaceholder,
  name,
  id,
  testId
}) => {
  const { t } = useTranslation();
  const generatedId = useId();
  const controlId = id ?? generatedId;
  const listboxId = `${controlId}-listbox`;
  const resolvedPlaceholder = placeholder ?? t('ui.select.placeholder');
  const accessibleName = ariaLabel ?? resolvedPlaceholder;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(-1);
  const [scrollTop, setScrollTop] = useState(0);
  const rootRef = useRef(/** @type {HTMLDivElement | null} */ (null));
  // The trigger IS the search input — one control, not a button opening a
  // panel that contains a second, separate input.
  const triggerRef = useRef(/** @type {HTMLInputElement | null} */ (null));
  const panelRef = useRef(/** @type {HTMLDivElement | null} */ (null));
  const listboxRef = useRef(/** @type {HTMLUListElement | null} */ (null));
  /**
   * @typedef {Object} PanelPos
   * @property {number} left
   * @property {number} width
   * @property {number} top
   * @property {number} maxHeight
   * @property {HTMLElement} host Where the panel is portaled: the enclosing aria-modal dialog, else <body>.
   * @property {string | null} labelText The field's visible <label> text, to name the listbox (not the placeholder).
   */
  const [panelPos, setPanelPos] = useState(/** @type {PanelPos | null} */ (null));
  const selected = value === null ? undefined : options.find((o) => o.value === value);
  const hasInvalidValue = value !== null && !selected;
  const filteredOptions = useMemo(() => {
    if (onSearch) return options;
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (o) => o.label.toLowerCase().includes(q) || (o.description ?? '').toLowerCase().includes(q)
    );
  }, [options, query, onSearch]);
  const hasDescriptions = options.some((o) => !!o.description);
  const rowHeight = hasDescriptions ? ROW_HEIGHT_WITH_DESCRIPTION : ROW_HEIGHT_PLAIN;
  const isVirtualized = filteredOptions.length > virtualizeThreshold;
  const closeMenu = useCallback((returnFocus = true) => {
    setOpen(false);
    setQuery('');
    if (returnFocus) triggerRef.current?.focus();
  }, []);
  const selectOption = useCallback(
    /** @param {SelectOption} opt */
    (opt) => {
      if (opt.disabled) return;
      // Re-picking the current value is not a change (a native <select> never
      // fires one) — a consumer may reset dependent state on change (review G1).
      if (opt.value !== value) onChange(opt.value);
      closeMenu(true);
    },
    [onChange, closeMenu, value]
  );
  const openMenu = useCallback(() => {
    if (disabled) return;
    // Opening always starts from a blank query — the full list is what
    // "browse by scrolling" means, and the previous selection stays visible
    // as normal (unfocused) display text once the panel closes again.
    setQuery('');
    setScrollTop(0);
    const startIndex = selected ? options.findIndex((o) => o.value === selected.value) : -1;
    setActiveIndex(startIndex >= 0 ? startIndex : 0);
    setOpen(true);
  }, [disabled, selected, options]);
  /** @param {React.ChangeEvent<HTMLInputElement>} e */
  const onInputChange = (e) => {
    if (!open) openMenu();
    setQuery(e.target.value);
  };
  // Debounced server-side search — gated on `open` and on "the user has typed
  // since this open" (see the `onSearch` prop doc for why: review F7).
  const typedSinceOpenRef = useRef(false);
  useEffect(() => {
    if (!open) typedSinceOpenRef.current = false;
  }, [open]);
  useEffect(() => {
    if (!onSearch || !open) return undefined;
    if (query === '' && !typedSinceOpenRef.current) return undefined;
    typedSinceOpenRef.current = true;
    const handle = setTimeout(() => onSearch(query), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [query, onSearch, open]);
  // A new query is a new list — window it from the top again.
  useEffect(() => {
    setScrollTop(0);
    if (listboxRef.current) listboxRef.current.scrollTop = 0;
  }, [query]);
  // Re-clamp the highlight whenever the visible option set changes.
  useEffect(() => {
    setActiveIndex((i) => {
      if (filteredOptions.length === 0) return -1;
      return i < 0 || i >= filteredOptions.length ? 0 : i;
    });
  }, [filteredOptions.length]);
  // A changed query means a new list: highlight its first enabled row, so
  // Enter after typing commits the first match, never whatever row happens to
  // sit at the previous index (review G2).
  useEffect(() => {
    if (!open) return;
    setActiveIndex(filteredOptions.findIndex((o) => !o.disabled));
    // Deliberately keyed on `query` alone: an options refresh must not move the highlight.
  }, [query]);
  // Close on outside pointerdown (matches LanguageMenu's convention). The
  // panel is portaled out of the field (see below — an ancestor's `overflow-hidden`,
  // e.g. a card/FormSection, otherwise clips it silently: the options render
  // correctly in the DOM but are visually cut to nothing), so "outside" is
  // "outside both the trigger and the portaled panel", not rootRef alone.
  useEffect(() => {
    if (!open) return undefined;
    /** @param {MouseEvent} e */
    const onDocPointer = (e) => {
      const target = /** @type {Node} */ (e.target);
      if (triggerRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      setOpen(false);
      setQuery('');
    };
    document.addEventListener('mousedown', onDocPointer);
    return () => document.removeEventListener('mousedown', onDocPointer);
  }, [open]);
  // Track the trigger's viewport position while open, so the portaled panel
  // stays anchored under it across page scroll/resize (capture-phase scroll
  // catches scroll on any nested scrollable ancestor, not just the window).
  //
  // Always opens BELOW the trigger — never flips above it — but caps its own
  // height so it stops PANEL_BOTTOM_MARGIN short of the viewport edge instead
  // of running off it: a trigger near the bottom of the page otherwise pushes
  // the last rows out of reach with no way to scroll to them.
  //
  // Portaled INTO the enclosing `aria-modal` dialog when there is one (review
  // Q5): content outside an aria-modal dialog may be hidden from assistive
  // technology (screen readers differ), and a dialog stacked above <body>'s
  // z-order would cover a body-level panel. Inside the dialog it shares the
  // dialog's stacking context and accessibility subtree, and `fixedOrigin`
  // corrects the coordinates if the dialog is transformed.
  useLayoutEffect(() => {
    if (!open) return undefined;
    const update = () => {
      const trigger = triggerRef.current;
      const rect = trigger?.getBoundingClientRect();
      if (!trigger || !rect) return;
      const host =
        /** @type {HTMLElement | null} */ (trigger.closest('[aria-modal="true"]')) ?? document.body;
      const origin = host === document.body ? { x: 0, y: 0 } : fixedOrigin(host);
      const top = rect.bottom + 4;
      const spaceBelow = window.innerHeight - top - PANEL_BOTTOM_MARGIN;
      setPanelPos({
        left: rect.left - origin.x,
        width: rect.width,
        top: top - origin.y,
        maxHeight: Math.max(PANEL_MIN_HEIGHT, Math.min(PANEL_MAX_HEIGHT, spaceBelow)),
        host,
        labelText: trigger.labels?.[0]?.textContent?.trim() || null
      });
    };
    update();
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, [open]);
  // Keep the keyboard-highlighted row inside the scrolled viewport. Re-runs
  // when the portaled panel first mounts (panelPos null → set on first open).
  const panelMounted = panelPos !== null;
  useEffect(() => {
    if (!open || activeIndex < 0) return;
    const el = listboxRef.current;
    if (!el) return;
    const rowTop = activeIndex * rowHeight;
    const rowBottom = rowTop + rowHeight;
    if (rowTop < el.scrollTop) el.scrollTop = rowTop;
    else if (rowBottom > el.scrollTop + el.clientHeight) el.scrollTop = rowBottom - el.clientHeight;
  }, [activeIndex, open, rowHeight, panelMounted]);
  const stepActive = useCallback(
    /** @param {1 | -1} dir */
    (dir) => {
      const n = filteredOptions.length;
      if (n === 0) return;
      setActiveIndex((from) => {
        let i = from < 0 ? 0 : from;
        for (let count = 0; count < n; count += 1) {
          i = (i + dir + n) % n;
          if (!filteredOptions[i].disabled) return i;
        }
        return from;
      });
    },
    [filteredOptions]
  );
  // The input IS the trigger (no separate search box): closed, it displays
  // the selection and behaves like a native <select> — a key that would open
  // one (ArrowDown/Enter/Space) opens this instead. Once open, the same keys
  // drive the highlighted row. Typing is handled by onChange, not here — a
  // printable key mutates the input's value before any handler runs, so
  // onChange is where "closed and the user just started typing" is caught.
  /** @param {React.KeyboardEvent} e */
  const onInputKeyDown = (e) => {
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openMenu();
      }
      return;
    }
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        stepActive(1);
        break;
      case 'ArrowUp':
        e.preventDefault();
        stepActive(-1);
        break;
      case 'Home':
        e.preventDefault();
        if (filteredOptions.length) setActiveIndex(0);
        break;
      case 'End':
        e.preventDefault();
        if (filteredOptions.length) setActiveIndex(filteredOptions.length - 1);
        break;
      case 'Enter':
        e.preventDefault();
        if (activeIndex >= 0 && filteredOptions[activeIndex])
          selectOption(filteredOptions[activeIndex]);
        break;
      case 'Escape':
        e.preventDefault();
        // Consumed here — an enclosing dialog (useDialogFocus) must not also close.
        e.stopPropagation();
        closeMenu(true);
        break;
      case 'Tab':
        setOpen(false);
        setQuery('');
        break;
      default:
        break;
    }
  };
  /** @param {React.UIEvent<HTMLUListElement>} e */
  const handleScroll = (e) => {
    setScrollTop(e.currentTarget.scrollTop);
  };
  /**
   * @param {SelectOption} opt
   * @param {number} idx
   */
  const renderRow = (opt, idx) => {
    const isActive = idx === activeIndex;
    const isSelected = opt.value === value;
    return (
      <li
        key={opt.value}
        id={`${listboxId}-opt-${idx}`}
        role="option"
        aria-selected={isSelected}
        aria-disabled={opt.disabled || undefined}
        data-value={opt.value}
        onMouseEnter={() => setActiveIndex(idx)}
        onClick={() => selectOption(opt)}
        title={opt.label}
        style={{ height: rowHeight }}
        className={`flex flex-col justify-center px-3 py-1.5 text-sm cursor-pointer ${opt.disabled ? 'opacity-50 cursor-not-allowed' : ''} ${isActive ? 'bg-action-soft' : 'hover:bg-bg-hover'} ${isSelected ? 'text-action-hover font-medium' : 'text-text-primary'}`}
      >
        <span className="truncate">{highlightMatch(opt.label, query)}</span>
        {opt.description ? (
          <span className="text-xs text-text-tertiary truncate">{opt.description}</span>
        ) : null}
      </li>
    );
  };
  // ── Loading / empty short-circuits — apply regardless of option count ──
  if (loading) {
    return (
      <button
        type="button"
        disabled
        data-testid={testId}
        className={`${controlBaseClass} flex items-center gap-2 text-text-tertiary ${className}`}
      >
        <Loader2 size={14} className="animate-spin shrink-0" aria-hidden="true" />
        <span className="truncate">{t('ui.select.loading')}</span>
      </button>
    );
  }
  if (error) {
    return (
      <div
        role="alert"
        data-testid={testId}
        className={`${controlBaseClass} flex items-center justify-between gap-2 ${className}`}
      >
        <span className="flex items-center gap-2 min-w-0 text-text-secondary">
          <AlertTriangle size={14} className="text-danger shrink-0" aria-hidden="true" />
          <span className="truncate">{t('ui.select.error')}</span>
        </span>
        {onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className="shrink-0 text-sm font-medium text-action hover:underline focus:outline-none focus:ring-1 focus:ring-action rounded"
          >
            {t('ui.select.retry')}
          </button>
        ) : null}
      </div>
    );
  }
  // With `onSearch`, `options` is one page of results and never decides the
  // mode — an empty page is "no results" inside the open combobox (review G3).
  const searchMode = !!onSearch;
  const hiddenInput = name ? <input type="hidden" name={name} value={value ?? ''} /> : null;
  if (options.length === 0 && !searchMode) {
    return (
      <button
        type="button"
        disabled
        aria-label={accessibleName}
        data-testid={testId}
        className={`${controlBaseClass} text-left text-text-tertiary ${className}`}
      >
        {t('ui.select.empty')}
      </button>
    );
  }
  // ── Standard mode: ≤ threshold options ──────────────────────────────────
  // Native <option> values are INDEXES, not option values: that is what lets
  // `''` be a real option distinct from "nothing selected" (`null`). The real
  // value travels in `data-value`, and a form gets it from the hidden input.
  if (nativeModeForced() || (!searchMode && options.length <= comboboxThreshold)) {
    const selectedIndex = selected ? options.indexOf(selected) : -1;
    const nativeValue =
      selectedIndex >= 0
        ? String(selectedIndex)
        : hasInvalidValue
          ? NATIVE_UNAVAILABLE
          : NATIVE_NONE;
    return (
      <>
        <select
          id={controlId}
          value={nativeValue}
          disabled={disabled}
          aria-label={ariaLabel}
          onChange={(e) => {
            const v = e.target.value;
            if (v === NATIVE_NONE) onChange(null);
            else if (v !== NATIVE_UNAVAILABLE) {
              const opt = options[Number(v)];
              if (opt && opt.value !== value) onChange(opt.value);
            }
          }}
          data-testid={testId}
          className={`${controlBaseClass} text-text-primary ${className}`}
        >
          {!hasInvalidValue && (
            <option
              value={NATIVE_NONE}
              disabled={value !== null && !clearable}
              hidden={value !== null && !clearable}
            >
              {resolvedPlaceholder}
            </option>
          )}
          {hasInvalidValue ? (
            <option value={NATIVE_UNAVAILABLE}>{t('ui.select.unavailableValue', { value })}</option>
          ) : null}
          {options.map((opt, i) => (
            <option
              key={opt.value}
              value={String(i)}
              data-value={opt.value}
              disabled={opt.disabled}
            >
              {opt.label}
            </option>
          ))}
        </select>
        {hiddenInput}
      </>
    );
  }
  // ── Combobox mode: > threshold options ──────────────────────────────────
  // Closed, the input shows the current selection (or is blank, letting the
  // native placeholder show the hint). Open, it shows the live query — the
  // SAME field is both the trigger and the filter box, per the reviewed UX:
  // clicking it, ArrowDown/Enter/Space, or simply starting to type opens it
  // and typing filters live (review Q1); a ≤10 native <select> is never writable.
  const closedText = hasInvalidValue
    ? t('ui.select.unavailableValue', { value })
    : selected
      ? selected.label
      : '';
  const inputValue = open ? query : closedText;
  const inputPlaceholder = open
    ? (searchPlaceholder ?? t('ui.select.searchPlaceholder'))
    : resolvedPlaceholder;
  const showClear = clearable && value !== null && !disabled;
  const panelHeight = panelPos?.maxHeight ?? PANEL_MAX_HEIGHT;
  const startIndex = isVirtualized ? Math.max(0, Math.floor(scrollTop / rowHeight) - OVERSCAN) : 0;
  const visibleCount = isVirtualized
    ? Math.ceil(panelHeight / rowHeight) + OVERSCAN * 2
    : filteredOptions.length;
  const endIndex = isVirtualized
    ? Math.min(filteredOptions.length, startIndex + visibleCount)
    : filteredOptions.length;
  const topPad = startIndex * rowHeight;
  const bottomPad = (filteredOptions.length - endIndex) * rowHeight;
  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <div className="relative">
        <input
          ref={triggerRef}
          id={controlId}
          type="text"
          disabled={disabled}
          role="combobox"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-autocomplete="list"
          // Only while open: closed, the rows are not in the DOM, and an id
          // reference to a missing element is invalid ARIA (review Q5 probe).
          aria-activedescendant={
            open && activeIndex >= 0 ? `${listboxId}-opt-${activeIndex}` : undefined
          }
          aria-label={ariaLabel}
          value={inputValue}
          onClick={() => {
            if (!open) openMenu();
          }}
          onChange={onInputChange}
          onKeyDown={onInputKeyDown}
          placeholder={inputPlaceholder}
          autoComplete="off"
          title={closedText || undefined}
          data-testid={testId}
          className={`${controlBaseClass} pr-9 truncate ${hasInvalidValue && !open ? 'text-warning-hover' : 'text-text-primary'}`}
        />
        {showClear ? (
          <button
            type="button"
            onClick={() => {
              onChange(null);
              closeMenu(true);
            }}
            aria-label={t('ui.select.clear')}
            data-testid={testId ? `${testId}-clear` : undefined}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-text-tertiary hover:text-text-primary hover:bg-bg-hover focus:outline-none focus:ring-1 focus:ring-action"
          >
            <X size={14} aria-hidden="true" />
          </button>
        ) : (
          <ChevronDown
            size={16}
            className={`pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 shrink-0 text-text-tertiary transition-transform ${open ? 'rotate-180' : ''}`}
            aria-hidden="true"
          />
        )}
        {hiddenInput}
      </div>

      {open && panelPos
        ? createPortal(
            <div
              ref={panelRef}
              style={{
                position: 'fixed',
                top: panelPos.top,
                left: panelPos.left,
                width: panelPos.width
              }}
              className="z-50 rounded-md border border-border-subtle bg-bg-surface shadow-lg"
            >
              <ul
                ref={listboxRef}
                id={listboxId}
                role="listbox"
                aria-label={ariaLabel ?? panelPos.labelText ?? resolvedPlaceholder}
                onScroll={handleScroll}
                style={{ maxHeight: panelHeight, overflowY: 'auto' }}
              >
                {filteredOptions.length === 0 ? (
                  <li className="px-3 py-4 text-sm text-text-tertiary" role="presentation">
                    <div className="text-text-secondary">{t('ui.select.noResults')}</div>
                    <div className="text-xs mt-0.5">{t('ui.select.noResultsHint')}</div>
                  </li>
                ) : (
                  <>
                    {isVirtualized && topPad > 0 ? (
                      <li aria-hidden="true" style={{ height: topPad }} />
                    ) : null}
                    {filteredOptions
                      .slice(startIndex, endIndex)
                      .map((opt, i) => renderRow(opt, startIndex + i))}
                    {isVirtualized && bottomPad > 0 ? (
                      <li aria-hidden="true" style={{ height: bottomPad }} />
                    ) : null}
                  </>
                )}
              </ul>
            </div>,
            panelPos.host
          )
        : null}
    </div>
  );
};
export default SelectField;
/** @typedef {SelectFieldBaseProps & (LocalFilterProps | ServerSearchProps)} SelectFieldProps */
/**
 * @typedef {Object} SelectOption
 * @property {string} value
 * @property {string} label
 * @property {string} [description] Secondary text shown under the label — disambiguates duplicate labels.
 * @property {boolean} [disabled]
 */
/**
 * Props shared by both search modes. `value` is `null` when nothing is
 * selected — never `''`, which is an ordinary option value like any other
 * (PR #52 review, type-design note: `''` used to double as "no value").
 * @typedef {Object} SelectFieldBaseProps
 * @property {SelectOption[]} options
 * @property {string | null} value
 * @property {(value: string | null) => void} onChange Called with the picked option's value, or `null` when cleared.
 * @property {string} [placeholder]
 * @property {string} [ariaLabel] Accessible name for the control. When omitted, the name comes from the
 * control's `<label htmlFor={id}>` association, never from `placeholder`.
 * @property {boolean} [clearable] Lets the user return to "nothing selected" (`onChange(null)`). Combobox
 * mode swaps the chevron for a clear (✕) button while a value is set;
 * standard mode keeps the placeholder option selectable.
 * @property {string} [className]
 * @property {boolean} [disabled]
 * @property {boolean} [loading] True while `options` is still being fetched.
 * @property {boolean} [error] True when fetching `options` FAILED. Renders a stated failure (with a
 * retry when `onRetry` is given) instead of the "No options available"
 * empty state — a failed read must never read as an empty one.
 * @property {() => void} [onRetry]
 * @property {number} [virtualizeThreshold] Above this many (filtered) rows, the listbox windows its rendering.
 * @property {string} [searchPlaceholder]
 * @property {string} [name]
 * @property {string} [id]
 * @property {string} [testId] Forwarded as `data-testid` to whichever control actually renders.
 */
/**
 * Local filtering: `options` is the whole set, and its size picks the mode.
 * @typedef {Object} LocalFilterProps
 * @property {undefined} [onSearch]
 * @property {number} [comboboxThreshold] Above this option count the control renders as a searchable combobox;
 * at or below it, a plain native `<select>`. Re-evaluated on every render
 * from `options.length`, so a data set that later grows past the
 * threshold switches automatically — no caller-side branching needed.
 */
/**
 * Server-side search: `options` is one page of results, so the field is
 * always the combobox and a threshold would mean nothing — the type refuses
 * one rather than silently ignoring it (review G3 + type-design note).
 * @typedef {Object} ServerSearchProps
 * @property {(query: string) => void} onSearch Server-side search hook. When supplied, the component stops filtering
 * `options` locally (they are assumed to already be the current page of
 * results) and instead calls this, debounced, as the user types.
 *
 * Fires ONLY while the list is open and only once the user has typed in
 * this open session: never on mount, never on close, never for the blank
 * query an open starts with (PR #52 review F7 — it used to fire
 * `onSearch('')` 300 ms after every render and every close, which an async
 * consumer would turn into an extra empty-query request each time).
 * Clearing a typed query back to blank while open DOES fire `''`, so a
 * consumer can restore its unfiltered page.
 *
 * ⚠ UNPROVEN AGAINST A REAL CONSUMER: no page passes `onSearch` yet. Its
 * only evidence is the fake-timer specs in SelectField.test.jsx. Known
 * limitation to settle with the first caller: the component does not ask
 * for a fresh page on re-open, so a consumer that still holds the last
 * query's results will show them filtered until the user types again.
 * Also unsettled: `loading` still swaps the whole field for the loading
 * placeholder, so a consumer that sets it DURING a search loses the input
 * mid-typing — keep `loading` for the initial fetch only.
 *
 * With `onSearch` set the field always renders as the combobox, whatever
 * the current page size (review G3): `options` is one page of results, not
 * the whole set, so it must not decide the render mode.
 * @property {never} [comboboxThreshold]
 */
