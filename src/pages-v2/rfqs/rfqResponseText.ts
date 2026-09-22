import type { TFunction } from 'i18next';
import { refusalCode } from '../../services/sourcing/rfqModel';

/**
 * The words for a supplier-response refusal (`CODE: detail`), in the reader's
 * language: `rfqResponse.refusal.<CODE>`, with the item it names when it names
 * one. An unknown code falls back to the machine reason, which is still English
 * but never empty.
 */
export function rfqResponseRefusal(t: TFunction, reason: string): string {
  const key = `rfqResponse.refusal.${refusalCode(reason)}`;
  const text = t(key);
  if (text === key) return reason;
  const item = /item (\d+)/.exec(reason);
  return item ? `${text} ${t('rfqResponse.refusal.onItem', { n: item[1] })}` : text;
}
