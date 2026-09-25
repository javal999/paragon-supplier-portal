import React, { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export interface SelectOption {
  value: string;
  label: string;
  /** Secondary text shown under the label — disambiguates duplicate labels. */
  description?: string;
  disabled?: boolean;
}

interface SelectFieldProps {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** Accessible name for the control. Falls back to `placeholder`. */
  ariaLabel?: string;
  className?: string;
  disabled?: boolean;
  /** True while `options` is still being fetched. */
  loading?: boolean;
  /**
   * Above this option count the control renders as a searchable combobox;
   * at or below it, a plain native `<select>`. Re-evaluated on every render
   * from `options.length`, so a data set that later grows past the
   * threshold switches automatically — no caller-side branching needed.
   */
  comboboxThreshold?: number;
  /** Above this many (filtered) rows, the listbox windows its rendering. */
  virtualizeThreshold?: number;
  /**
   * Server-side search hook. When supplied, the component stops filtering
   * `options` locally (they are assumed to already be the current page of
   * results) and instead calls this, debounced, as the user types.
   */
  onSearch?: (query: string) => void;
  searchPlaceholder?: string;
  name?: string;
  id?: string;
  /** Forwarded as `data-testid` to whichever control actually renders. */
  testId?: string;
}

const ROW_HEIGHT_PLAIN = 36;
const ROW_HEIGHT_WITH_DESCRIPTION = 52;
const PANEL_MAX_HEIGHT = 288; // 8 plain rows — the ceiling, not a guarantee
const PANEL_MIN_HEIGHT = 120; // last-resort floor if the trigger sits very low
const PANEL_BOTTOM_MARGIN = 24; // stays clear of the viewport edge, not flush
const SEARCH_DEBOUNCE_MS = 300;
const DEFAULT_COMBOBOX_THRESHOLD = 10;
const DEFAULT_VIRTUALIZE_THRESHOLD = 300;
const OVERSCAN = 4;

const controlBaseClass =
  'w-full bg-white border border-border-input rounded-md px-3 h-10 text-sm focus:outline-none focus:border-action disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-bg-hover';

function highlightMatch(label: string, query: string): React.ReactNode {
  const trimmed = query.trim();
  if (!trimmed) return label;
  const idx = label.toLowerCase().indexOf(trimmed.toLowerCase());
  if (idx === -1) return label;
  return (
    <>
      {label.slice(0, idx)}
      <mark className="bg-action-soft text-action-hover font-semibold rounded-sm">
        {label.slice(idx, idx + trimmed.length)}
      </mark>
      {label.slice(idx + trimmed.length)}
    </>
  );
}

const SelectField: React.FC<SelectFieldProps> = ({
  options,
  value,
  onChange,
  placeholder,
  ariaLabel,
  className = '',
  disabled = false,
  loading = false,
  comboboxThreshold = DEFAULT_COMBOBOX_THRESHOLD,
  virtualizeThreshold = DEFAULT_VIRTUALIZE_THRESHOLD,
  onSearch,
  searchPlaceholder,
  name,
  id,
  testId,
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

  const rootRef = useRef<HTMLDivElement>(null);
  // The trigger IS the search input — one control, not a button opening a
  // panel that contains a second, separate input.
  const triggerRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const listboxRef = useRef<HTMLUListElement>(null);
  const [panelPos, setPanelPos] = useState<{
    left: number;
    width: number;
    top: number;
    maxHeight: number;
  } | null>(null);

  const selected = options.find((o) => o.value === value);
  const hasInvalidValue = value !== '' && !selected;

  const filteredOptions = useMemo(() => {
    if (onSearch) return options;
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (o) =>
        o.label.toLowerCase().includes(q) ||
        (o.description ?? '').toLowerCase().includes(q),
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
    (opt: SelectOption) => {
      if (opt.disabled) return;
      onChange(opt.value);
      closeMenu(true);
    },
    [onChange, closeMenu],
  );

  const openMenu = useCallback(() => {
    if (disabled) return;
    // Opening always starts from a blank query — the full list is what
    // "browse by scrolling" means, and the previous selection stays visible
    // as normal (unfocused) display text once the panel closes again.
    setQuery('');
    const startIndex = selected ? options.findIndex((o) => o.value === selected.value) : -1;
    setActiveIndex(startIndex >= 0 ? startIndex : 0);
    setOpen(true);
  }, [disabled, selected, options]);

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!open) openMenu();
    setQuery(e.target.value);
  };

  // Debounced server-side search.
  useEffect(() => {
    if (!onSearch) return undefined;
    const handle = setTimeout(() => onSearch(query), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [query, onSearch]);

  // Re-clamp the highlight whenever the visible option set changes.
  useEffect(() => {
    setActiveIndex((i) => {
      if (filteredOptions.length === 0) return -1;
      return i < 0 || i >= filteredOptions.length ? 0 : i;
    });
  }, [filteredOptions.length]);

  // Close on outside pointerdown (matches LanguageMenu's convention). The
  // panel is portaled to <body> (see below — an ancestor's `overflow-hidden`,
  // e.g. a card/FormSection, otherwise clips it silently: the options render
  // correctly in the DOM but are visually cut to nothing), so "outside" is
  // "outside both the trigger and the portaled panel", not rootRef alone.
  useEffect(() => {
    if (!open) return undefined;
    const onDocPointer = (e: MouseEvent) => {
      const target = e.target as Node;
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
  useLayoutEffect(() => {
    if (!open) return undefined;
    const update = () => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const top = rect.bottom + 4;
      const spaceBelow = window.innerHeight - top - PANEL_BOTTOM_MARGIN;
      setPanelPos({
        left: rect.left,
        width: rect.width,
        top,
        maxHeight: Math.max(PANEL_MIN_HEIGHT, Math.min(PANEL_MAX_HEIGHT, spaceBelow)),
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

  // Keep the keyboard-highlighted row inside the scrolled viewport.
  useEffect(() => {
    if (!open || activeIndex < 0) return;
    const el = listboxRef.current;
    if (!el) return;
    const rowTop = activeIndex * rowHeight;
    const rowBottom = rowTop + rowHeight;
    if (rowTop < el.scrollTop) el.scrollTop = rowTop;
    else if (rowBottom > el.scrollTop + el.clientHeight) el.scrollTop = rowBottom - el.clientHeight;
  }, [activeIndex, open, rowHeight]);

  const stepActive = useCallback(
    (dir: 1 | -1) => {
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
    [filteredOptions],
  );

  // The input IS the trigger (no separate search box): closed, it displays
  // the selection and behaves like a native <select> — a key that would open
  // one (ArrowDown/Enter/Space) opens this instead. Once open, the same keys
  // drive the highlighted row. Typing is handled by onChange, not here — a
  // printable key mutates the input's value before any handler runs, so
  // onChange is where "closed and the user just started typing" is caught.
  const onInputKeyDown = (e: React.KeyboardEvent) => {
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
        if (activeIndex >= 0 && filteredOptions[activeIndex]) selectOption(filteredOptions[activeIndex]);
        break;
      case 'Escape':
        e.preventDefault();
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

  const handleScroll = (e: React.UIEvent<HTMLUListElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  };

  const renderRow = (opt: SelectOption, idx: number) => {
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
        className={`flex flex-col justify-center px-3 py-1.5 text-sm cursor-pointer ${
          opt.disabled ? 'opacity-50 cursor-not-allowed' : ''
        } ${isActive ? 'bg-action-soft' : 'hover:bg-bg-hover'} ${
          isSelected ? 'text-action-hover font-medium' : 'text-text-primary'
        }`}
      >
        <span className="truncate">{highlightMatch(opt.label, query)}</span>
        {opt.description && (
          <span className="text-xs text-text-tertiary truncate">{opt.description}</span>
        )}
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

  if (options.length === 0) {
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
  if (options.length <= comboboxThreshold) {
    return (
      <select
        id={controlId}
        name={name}
        value={value}
        disabled={disabled}
        aria-label={ariaLabel}
        onChange={(e) => onChange(e.target.value)}
        data-testid={testId}
        className={`${controlBaseClass} ${className}`}
      >
        {!hasInvalidValue && (
          <option value="" disabled={value !== ''} hidden={value !== ''}>
            {resolvedPlaceholder}
          </option>
        )}
        {hasInvalidValue && (
          <option value={value}>{t('ui.select.unavailableValue', { value })}</option>
        )}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} disabled={opt.disabled}>
            {opt.label}
          </option>
        ))}
      </select>
    );
  }

  // ── Combobox mode: > threshold options ──────────────────────────────────
  // Closed, the input shows the current selection (or is blank, letting the
  // native placeholder show the hint). Open, it shows the live query — the
  // SAME field is both the trigger and the filter box, per the reviewed UX:
  // clicking it is what makes it writable; a ≤10 native <select> never is.
  const closedText = hasInvalidValue ? t('ui.select.unavailableValue', { value }) : selected ? selected.label : '';
  const inputValue = open ? query : closedText;
  const inputPlaceholder = open ? searchPlaceholder ?? t('ui.select.searchPlaceholder') : resolvedPlaceholder;
  const panelHeight = panelPos?.maxHeight ?? PANEL_MAX_HEIGHT;
  const startIndex = isVirtualized ? Math.max(0, Math.floor(scrollTop / rowHeight) - OVERSCAN) : 0;
  const visibleCount = isVirtualized ? Math.ceil(panelHeight / rowHeight) + OVERSCAN * 2 : filteredOptions.length;
  const endIndex = isVirtualized ? Math.min(filteredOptions.length, startIndex + visibleCount) : filteredOptions.length;
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
          aria-activedescendant={activeIndex >= 0 ? `${listboxId}-opt-${activeIndex}` : undefined}
          aria-label={accessibleName}
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
          className={`${controlBaseClass} pr-9 truncate ${
            hasInvalidValue && !open ? 'text-warning-hover' : ''
          }`}
        />
        <ChevronDown
          size={16}
          className={`pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 shrink-0 text-text-tertiary transition-transform ${
            open ? 'rotate-180' : ''
          }`}
          aria-hidden="true"
        />
      </div>

      {open &&
        panelPos &&
        createPortal(
          <div
            ref={panelRef}
            style={{ position: 'fixed', top: panelPos.top, left: panelPos.left, width: panelPos.width }}
            className="z-50 rounded-md border border-border-subtle bg-bg-surface shadow-lg"
          >
            <ul
              ref={listboxRef}
              id={listboxId}
              role="listbox"
              aria-label={accessibleName}
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
                  {isVirtualized && topPad > 0 && <li aria-hidden="true" style={{ height: topPad }} />}
                  {filteredOptions.slice(startIndex, endIndex).map((opt, i) => renderRow(opt, startIndex + i))}
                  {isVirtualized && bottomPad > 0 && <li aria-hidden="true" style={{ height: bottomPad }} />}
                </>
              )}
            </ul>
          </div>,
          document.body,
        )}
    </div>
  );
};

export default SelectField;
