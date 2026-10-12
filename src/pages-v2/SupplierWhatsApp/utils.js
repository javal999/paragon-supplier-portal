// SupplierWhatsApp — helpers with no React in them.

import { sdcClock } from '@services/sdc/clock';

/**
 * The HH:MM stamp a new simulator message carries, read from the hub clock
 * (`sdcClock`) so the page holds one clock.
 * @returns {string}
 */
export const getTime = () =>
  new Date(sdcClock.now()).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
