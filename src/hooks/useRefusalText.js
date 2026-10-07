import { useTranslation } from 'react-i18next';
import { describeRefusal, describeDataError } from '@services/transitions/refusalMessage';

/**
 * Localize a dispatcher refusal for DISPLAY — the `useModeLabel` shape, with the
 * prose coming from `COMMAND_REFUSAL_GLOSSARY` instead of an i18n key (the
 * glossary is where these nine are defined, and a second copy in the i18n layer
 * is the half that would rot).
 *
 * Returns `null` for a reason this vocabulary does not own, so every call site
 * reads `refusalText(r) ?? <what it rendered before>` and an unrecognised
 * refusal is untouched. See `refusalMessage.js` for why `null` rather than a
 * default.
 * @returns {(reason: string | undefined) => string | null}
 */
export function useRefusalText() {
  const { i18n } = useTranslation();
  return /** @param {string | undefined} reason */ (reason) =>
    describeRefusal(reason, i18n.language);
}

/**
 * The same service for a THROWN `DataError` — `SCOPE_DENIED` and its five
 * siblings, which `useRefusalText` cannot read because their message is prose
 * rather than `KIND:detail`. Same contract: `null` for a code this vocabulary
 * does not own, so every call site keeps the fallback it already had.
 * @returns {(code: string | undefined) => string | null}
 */
export function useDataErrorText() {
  const { i18n } = useTranslation();
  return /** @param {string | undefined} code */ (code) => describeDataError(code, i18n.language);
}
