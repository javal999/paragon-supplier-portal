/** @import React from 'react' */
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useCurrentIdentity } from '@context/CurrentIdentityContext';
import { highlightMatch } from '../ui-v2/highlightMatch';
import { useHubRole } from './hubRole';
import { groupByCategory, matchEntries, searchEntriesFor } from './searchIndex';

// Same shape as SelectField's debounced search (a timer per keystroke, cleared
// by the next one), shorter because filtering here is local and cheap.
export const SEARCH_DEBOUNCE_MS = 150;

// ─────────────────────────────────────────────────────────────────────────────
// The top bar search — a WAI-ARIA 1.2 combobox over the viewer's own menu pages
// (`searchIndex.js`).
//
// · Typing opens a listbox of matching pages, grouped by menu section, with the
//   matched text marked. The list scrolls past a fixed height; it never grows.
// · ↓ / ↑ move the highlight and wrap. DOM focus stays in the input; the
//   highlighted option is announced through `aria-activedescendant`.
// · Enter opens the highlighted page, or the first match when nothing is
//   highlighted. With no match, Enter does nothing.
// · Escape, Tab and a click outside close the list and leave the text alone.
// · Opening a page clears the input, as the input's own clear button does.
// · Ctrl K (⌘ K on a Mac) anywhere on the page focuses the input and selects
//   its text, as the placeholder promises — except while a modal dialog is
//   open, because moving focus out of a dialog breaks its focus trap.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Whether a keydown is the search shortcut: Ctrl K or ⌘ K, no other modifier.
 * @param {KeyboardEvent} e
 * @returns {boolean}
 */
export function isSearchShortcut(e) {
  return (e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey && e.key.toLowerCase() === 'k';
}

/** @type {React.FC} */
const TopBarSearch = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { identity } = useCurrentIdentity();
  const [hubRole] = useHubRole();
  const entries = useMemo(
    () => searchEntriesFor(identity.personaType, hubRole),
    [identity.personaType, hubRole]
  );

  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const rootRef = useRef(/** @type {HTMLDivElement | null} */ (null));
  const inputRef = useRef(/** @type {HTMLInputElement | null} */ (null));

  // The shortcut is a document listener so it works wherever focus is.
  useEffect(() => {
    /** @param {KeyboardEvent} e */
    const onDocKeyDown = (e) => {
      if (!isSearchShortcut(e) || e.defaultPrevented || e.isComposing) return;
      if (document.querySelector('[role="dialog"][aria-modal="true"]')) return;
      e.preventDefault();
      inputRef.current?.focus();
      inputRef.current?.select();
    };
    document.addEventListener('keydown', onDocKeyDown);
    return () => document.removeEventListener('keydown', onDocKeyDown);
  }, []);

  const baseId = useId();
  const listboxId = `${baseId}-listbox`;
  /** @param {number} index */
  const optionId = (index) => `${baseId}-option-${index}`;

  useEffect(() => {
    const handle = setTimeout(() => {
      setDebouncedQuery(query);
      // A new result list starts with nothing highlighted.
      setActiveIndex(-1);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [query]);

  const { groups, ordered } = useMemo(
    () => groupByCategory(matchEntries(entries, debouncedQuery, t)),
    [entries, debouncedQuery, t]
  );
  // The list can also change under the highlight (a persona or role switch),
  // so a highlight past its end counts as none.
  const highlighted = activeIndex < ordered.length ? activeIndex : -1;

  const hasQuery = query.trim() !== '';
  // Nothing renders until the first debounced filter has run for this text, so
  // the list never flashes "no results" for the first keystroke.
  const showPopup = open && hasQuery && debouncedQuery.trim() !== '';
  const showList = showPopup && ordered.length > 0;

  // Closing the list drops its highlight, so a dismissed result can't be opened
  // by Enter or come back highlighted when the list reopens.
  const close = () => {
    setOpen(false);
    setActiveIndex(-1);
  };

  // Close on a click outside the input and its list (LanguageMenu's convention).
  useEffect(() => {
    if (!open) return undefined;
    /** @param {MouseEvent} e */
    const onDocPointer = (e) => {
      if (rootRef.current && !rootRef.current.contains(/** @type {Node} */ (e.target))) {
        setOpen(false);
        setActiveIndex(-1);
      }
    };
    document.addEventListener('mousedown', onDocPointer);
    return () => document.removeEventListener('mousedown', onDocPointer);
  }, [open]);

  // Keep the highlighted option in view inside the scrolling list.
  useEffect(() => {
    if (!showList || highlighted < 0) return;
    document
      .getElementById(`${baseId}-option-${highlighted}`)
      ?.scrollIntoView?.({ block: 'nearest' });
  }, [highlighted, showList, baseId]);

  /** @param {string} path */
  const openResult = (path) => {
    setQuery('');
    setDebouncedQuery('');
    setOpen(false);
    setActiveIndex(-1);
    navigate(path);
  };

  /** @param {React.KeyboardEvent<HTMLInputElement>} e */
  const onKeyDown = (e) => {
    switch (e.key) {
      case 'ArrowDown':
      case 'ArrowUp': {
        if (!hasQuery) return;
        e.preventDefault();
        if (!open) {
          setOpen(true);
          return;
        }
        const count = ordered.length;
        if (count === 0) return;
        const step = e.key === 'ArrowDown' ? 1 : -1;
        setActiveIndex(
          highlighted < 0 ? (step === 1 ? 0 : count - 1) : (highlighted + step + count) % count
        );
        return;
      }
      case 'Enter': {
        // An IME is still composing: this Enter commits the text, it is not a pick.
        if (e.nativeEvent.isComposing || e.keyCode === 229) return;
        e.preventDefault();
        // The highlight belongs to the list on screen; if the text has moved on
        // since the last filter, match the text as typed instead of waiting.
        const current = debouncedQuery === query;
        const target =
          current && showList && highlighted >= 0
            ? ordered[highlighted]
            : (current ? ordered : groupByCategory(matchEntries(entries, query, t)).ordered)[0];
        if (target) openResult(target.path);
        return;
      }
      case 'Escape':
        // Only while the list is open: a closed search box keeps the browser's
        // own Escape-to-clear.
        if (showPopup) {
          e.preventDefault();
          close();
        }
        return;
      case 'Tab':
        close();
        return;
      default:
        return;
    }
  };

  return (
    <div ref={rootRef} className="relative w-full max-w-md">
      <Search
        size={14}
        className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary pointer-events-none"
      />
      <input
        ref={inputRef}
        type="search"
        role="combobox"
        aria-label={t('topbar.searchLabel')}
        aria-autocomplete="list"
        aria-expanded={showList}
        // Only while the list exists: an id reference to a missing element is
        // invalid ARIA (SelectField's review Q5).
        aria-controls={showList ? listboxId : undefined}
        aria-activedescendant={showList && highlighted >= 0 ? optionId(highlighted) : undefined}
        placeholder={t('topbar.search')}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(e.target.value.trim() !== '');
        }}
        onClick={() => {
          if (hasQuery) setOpen(true);
        }}
        onKeyDown={onKeyDown}
        autoComplete="off"
        className="w-full h-9 pl-9 pr-3 rounded-md bg-bg-hover text-base sm:text-sm text-text-primary placeholder:text-text-tertiary border border-transparent focus:outline-none focus:border-border-input focus:bg-bg-surface"
      />
      {/* Below `sm` the input is a few characters wide, so the list spans the
          viewport under the header instead; from `sm` it hangs from the input's
          right edge, at least 20rem wide but never wider than the viewport. */}
      {showPopup ? (
        <div className="fixed inset-x-4 top-14 sm:absolute sm:left-auto sm:right-0 sm:top-full sm:w-full sm:min-w-[min(20rem,calc(100vw-2rem))] mt-1 z-50 rounded-md border border-border-subtle bg-bg-surface shadow-lg overflow-hidden">
          {showList ? (
            <div
              id={listboxId}
              role="listbox"
              aria-label={t('topbar.searchResults')}
              className="max-h-80 overflow-y-auto py-1"
            >
              {groups.map((group, g) => (
                <div key={group.category} role="group" aria-labelledby={`${baseId}-group-${g}`}>
                  <div
                    id={`${baseId}-group-${g}`}
                    className="px-4 pt-3 pb-0 text-label text-text-tertiary uppercase"
                  >
                    {group.category}
                  </div>
                  {group.items.map(({ result, index }) => {
                    const isActive = index === highlighted;
                    return (
                      <div
                        key={result.path}
                        id={optionId(index)}
                        role="option"
                        aria-selected={isActive}
                        // The full label as the name: some name computations
                        // break the text at the <mark> ("Supplier s").
                        aria-label={result.label}
                        // Keep focus in the input: a click picks, it does not blur.
                        onMouseDown={(e) => e.preventDefault()}
                        onMouseMove={() => {
                          if (!isActive) setActiveIndex(index);
                        }}
                        onClick={() => openResult(result.path)}
                        className={`px-4 py-2 text-sm cursor-pointer truncate ${
                          isActive ? 'bg-action-soft text-action-hover' : 'text-text-primary'
                        }`}
                      >
                        {highlightMatch(result.label, debouncedQuery)}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          ) : (
            <div className="px-3 py-3 text-sm text-text-secondary">
              {t('topbar.searchNoResults', { query: debouncedQuery.trim() })}
            </div>
          )}
        </div>
      ) : null}
      {/* Always mounted, so a screen reader hears each change rather than a
          region that arrives already filled. Updates once per debounce. */}
      <div role="status" aria-live="polite" className="sr-only">
        {showList
          ? t('topbar.searchCount', { count: ordered.length })
          : showPopup
            ? t('topbar.searchNoResults', { query: debouncedQuery.trim() })
            : ''}
      </div>
    </div>
  );
};

export default TopBarSearch;
