/** @import { LucideIcon } from 'lucide-react' */
/** @import { SupplierInvoice } from '@services/data/types' */
import { Send, Mail, MessageCircle, Globe } from 'lucide-react';

// Module-scope constants of the supplier invoices page, moved out of
// `SupplierInvoices.jsx` by the Phase 5 page split (no behaviour change).

/**
 * The icon beside each invoice's "via <channel>" line in the table.
 * @type {Record<SupplierInvoice['channel'], LucideIcon>}
 */
export const CHANNEL_ICON = {
  WhatsApp: MessageCircle,
  Email: Mail,
  Web: Globe,
  API: Send
};

/** The class of every text, date and select input in the two invoice forms. */
export const inputCls =
  'w-full text-sm border border-border-subtle rounded-md px-3 py-2 bg-bg-surface text-text-primary';
/** The class of every field label in the two invoice forms. */
export const labelCls = 'text-label text-text-tertiary uppercase block mb-1';
