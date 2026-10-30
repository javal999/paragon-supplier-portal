// TL-D1 (BL-233; supersedes CAP-D10) — on the Demand anticipation pages, "DA"
// appears only as the bracket in "Demand anticipation (DA)". It never stands
// alone, because it also labels Delivery Agreements on the contract pages. The
// (i) tips are left out: they name "DA" as the team's word and the "Not" line.
import { expect } from 'vitest';
import { textWithoutTips } from './termText';

/**
 * The text of `root` without its (i) tips and with every TL-D1 bracket removed.
 * @param {Element} root
 * @returns {string}
 */
export const textWithoutDaLabel = (root) =>
  textWithoutTips(root).replace(/anticipation \(DA\)/gi, '');

/** @param {Element} [root] */
export const expectNoBareDa = (root = document.body) =>
  expect(textWithoutDaLabel(root)).not.toMatch(/\bDA\b/);
