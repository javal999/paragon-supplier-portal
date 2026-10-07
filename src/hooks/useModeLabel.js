import { useTranslation } from 'react-i18next';
import { modeLabelKey } from '@lib/modeLabel';

/**
 * Localize a shipment-mode token (Sea / Air / Road) for DISPLAY, from the
 * central modeLabel SSoT. Known modes localize; anything else renders verbatim,
 * and in EN the resolved value equals the canonical string.
 *
 * HONEST-BY-CONSTRUCTION: display resolver only. Keep the canonical token as the
 * stored `s.mode` value and the FilterChipsBar `id` — translate the label, not
 * the data.
 * @returns {(mode: string) => string}
 */
export function useModeLabel() {
  const { t } = useTranslation();
  return /** @param {string} mode */ (mode) => {
    const key = modeLabelKey(mode);
    return key ? t(key) : mode;
  };
}
