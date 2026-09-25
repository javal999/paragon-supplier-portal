import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
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
}

const ROW_HEIGHT_PLAIN = 36;
const ROW_HEIGHT_WITH_DESCRIPTION = 52;
const PANEL_MAX_HEIGHT = 288; // 8 plain rows
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
  const triggerRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listboxRef = useRef<HTMLUListElement>(null);

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
    const startIndex = selected ? filteredOptions.findIndex((o) => o.value === selected.value) : -1;
    setActiveIndex(startIndex >= 0 ? startIndex : 0);
    setOpen(true);
  }, [disabled, selected, filteredOptions]);

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

  // Focus the filter box the moment the panel opens.
  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // Close on outside pointerdown (matches LanguageMenu's convention).
  useEffect(() => {
    if (!open) return undefined;
    const onDocPointer = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', onDocPointer);
    return () => document.removeEventListener('mousedown', onDocPointer);
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

  const onTriggerKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openMenu();
    }
  };

  const onInputKeyDown = (e: React.KeyboardEvent) => {
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
  const displayLabel = value === '' ? resolvedPlaceholder : selected ? selected.label : t('ui.select.unavailableValue', { value });
  const startIndex = isVirtualized ? Math.max(0, Math.floor(scrollTop / rowHeight) - OVERSCAN) : 0;
  const visibleCount = isVirtualized ? Math.ceil(PANEL_MAX_HEIGHT / rowHeight) + OVERSCAN * 2 : filteredOptions.length;
  const endIndex = isVirtualized ? Math.min(filteredOptions.length, startIndex + visibleCount) : filteredOptions.length;
  const topPad = startIndex * rowHeight;
  const bottomPad = (filteredOptions.length - endIndex) * rowHeight;

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        ref={triggerRef}
        id={controlId}
        type="button"
        disabled={disabled}
        onClick={() => (open ? closeMenu(false) : openMenu())}
        onKeyDown={onTriggerKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={accessibleName}
        className={`${controlBaseClass} flex items-center justify-between gap-2 text-left`}
      >
        <span
          className={`truncate ${
            hasInvalidValue ? 'text-warning-hover' : value === '' ? 'text-text-tertiary' : 'text-text-primary'
          }`}
          title={displayLabel}
        >
          {displayLabel}
        </span>
        <ChevronDown
          size={16}
          className={`shrink-0 text-text-tertiary transition-transform ${open ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-border-subtle bg-bg-surface shadow-lg">
          <div className="p-2 border-b border-border-subtle">
            <input
              ref={inputRef}
              type="text"
              role="combobox"
              aria-expanded={open}
              aria-controls={listboxId}
              aria-autocomplete="list"
              aria-activedescendant={activeIndex >= 0 ? `${listboxId}-opt-${activeIndex}` : undefined}
              aria-label={accessibleName}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onInputKeyDown}
              placeholder={searchPlaceholder ?? t('ui.select.searchPlaceholder')}
              className="w-full text-sm outline-none"
            />
          </div>
          <ul
            ref={listboxRef}
            id={listboxId}
            role="listbox"
            aria-label={accessibleName}
            onScroll={handleScroll}
            style={{ maxHeight: PANEL_MAX_HEIGHT, overflowY: 'auto' }}
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
        </div>
      )}
    </div>
  );
};

export default SelectField;
