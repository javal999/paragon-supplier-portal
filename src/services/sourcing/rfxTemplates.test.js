// ────────────────────────────────────────────────────────────────────────────
// D2 — the RFI / RFP template store (the `customRoles` honest-read pattern).
// Absent, unreadable and refused rows are three different facts, and each is
// asserted as itself rather than as "no templates".
// ────────────────────────────────────────────────────────────────────────────

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
/** @import { RfiTemplateContent, RfpTemplateContent } from './rfxTemplates' */
import {
  RFI_TEMPLATES_KEY,
  RFP_TEMPLATES_KEY,
  resetRfxTemplatesForTest,
  rfiTemplateStore,
  rfpTemplateStore
} from './rfxTemplates';
import { rfiTemplate } from './rfxConfig';

const NOW = '2026-09-21T03:00:00.000Z';

/** @type {RfiTemplateContent} */
const rfiContent = {
  familyId: 'packaging',
  questions: /** @type {import('./types').RfiTemplate} */ (rfiTemplate('packaging')).questions,
  customSections: [],
  confidential: false
};

/** @type {RfpTemplateContent} */
const rfpContent = {
  familyId: 'packaging',
  scope: 'Open-spec bottle and pump.',
  currency: 'IDR',
  terms: [
    { termId: 'paymentTerms', requestedValue: '60' },
    {
      termId: 'custom-1',
      label: 'Pump dosage',
      valueKind: 'numberWithUnit',
      unit: 'ml',
      requestedValue: '1.5'
    }
  ],
  questions: [],
  customSections: [],
  pricing: {
    options: [{ id: 'opt-1', title: 'Full set' }],
    quantityPoints: [10_000, 50_000],
    quantityBasis: 'total',
    samplesRequested: true
  },
  confidential: true
};

beforeEach(() => {
  window.localStorage.clear();
  resetRfxTemplatesForTest();
});
afterEach(() => window.localStorage.clear());

describe('D2 — saving and reading templates', () => {
  it('absent storage is "no templates", and it is NOT reported unreadable', () => {
    expect(rfiTemplateStore.readState()).toEqual({
      templates: [],
      rejected: [],
      unreadable: false
    });
  });

  it('a saved RFI template survives a fresh read of storage (a reload)', () => {
    const res = rfiTemplateStore.save('Packaging capability, short', rfiContent, NOW);
    expect(res.ok).toBe(true);
    resetRfxTemplatesForTest();
    const read = rfiTemplateStore.readState();
    expect(read.templates.map((t) => t.name)).toEqual(['Packaging capability, short']);
    expect(read.templates[0].content.questions).toHaveLength(rfiContent.questions.length);
    // Stored under its own key, never the RFP one.
    expect(window.localStorage.getItem(RFI_TEMPLATES_KEY)).not.toBeNull();
    expect(window.localStorage.getItem(RFP_TEMPLATES_KEY)).toBeNull();
  });

  it('an RFP template keeps custom terms and indicative pricing', () => {
    expect(rfpTemplateStore.save('Tundra-style open spec', rfpContent, NOW).ok).toBe(true);
    resetRfxTemplatesForTest();
    const [tpl] = rfpTemplateStore.readState().templates;
    expect(tpl.content.terms[1].label).toBe('Pump dosage');
    expect(tpl.content.pricing?.quantityPoints).toEqual([10_000, 50_000]);
  });

  it('KNOWN-BAD — a template the create verb would refuse is refused by name, and nothing is written', () => {
    const res = rfpTemplateStore.save(
      'Broken',
      { ...rfpContent, terms: [{ termId: 'custom-1', label: '', requestedValue: '1' }] },
      NOW
    );
    expect(res.ok).toBe(false);
    expect(!res.ok && res.reason).toMatch(/^CUSTOM_TERM_LABEL_REQUIRED/);
    expect(window.localStorage.getItem(RFP_TEMPLATES_KEY)).toBeNull();
    expect(rfiTemplateStore.save('x', rfiContent, NOW)).toMatchObject({ ok: false });
  });

  it('a saved template can be deleted; a system template id cannot be', () => {
    const res = rfiTemplateStore.save('To delete', rfiContent, NOW);
    expect(res.ok && rfiTemplateStore.remove(res.id)).toBe(true);
    expect(rfiTemplateStore.readState().templates).toEqual([]);
    expect(rfiTemplateStore.remove('packaging')).toBe(false);
  });
});

describe('the honest read — corrupt storage and refused rows', () => {
  it('⚠️ unparseable storage is UNREADABLE (not empty), and saving is refused so nothing is overwritten', () => {
    window.localStorage.setItem(RFI_TEMPLATES_KEY, '{not json');
    const read = rfiTemplateStore.readState();
    expect(read.unreadable).toBe(true);
    expect(read.templates).toEqual([]);
    const res = rfiTemplateStore.save('New one', rfiContent, NOW);
    expect(!res.ok && res.reason).toMatch(/^STORE_UNREADABLE/);
    expect(window.localStorage.getItem(RFI_TEMPLATES_KEY)).toBe('{not json');
  });

  it('a wrong envelope version is unreadable too', () => {
    window.localStorage.setItem(RFI_TEMPLATES_KEY, JSON.stringify({ v: 99, templates: [] }));
    expect(rfiTemplateStore.readState().unreadable).toBe(true);
  });

  it('a hand-edited row the verb would refuse is REJECTED BY NAME while the good row still loads', () => {
    window.localStorage.setItem(
      RFI_TEMPLATES_KEY,
      JSON.stringify({
        v: 1,
        templates: [
          { id: 'rfit-good', name: 'Good one', savedAt: NOW, content: rfiContent },
          {
            id: 'rfit-bad',
            name: 'Bad choice',
            savedAt: NOW,
            content: {
              ...rfiContent,
              questions: [
                {
                  id: 'x',
                  sectionId: 'event',
                  promptKey: 'Pick',
                  type: 'singleChoice',
                  options: ['only'],
                  required: true
                }
              ]
            }
          },
          { id: 'packaging', name: 'Shadowing the system', savedAt: NOW, content: rfiContent }
        ]
      })
    );
    const read = rfiTemplateStore.readState();
    expect(read.unreadable).toBe(false);
    expect(read.templates.map((t) => t.id)).toEqual(['rfit-good']);
    expect(read.rejected.map((r) => r.id)).toEqual(['rfit-bad', 'packaging']);
    expect(read.rejected[0].reason).toMatch(/^CHOICE_NEEDS_OPTIONS/);
    expect(read.rejected[1].reason).toMatch(/system template/);
  });
});
