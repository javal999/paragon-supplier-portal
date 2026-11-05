// ─────────────────────────────────────────────────────────────────────────────
// BL-258 (U-19) — Supplier Home "PTI has n questions for you": a sample ask's
// question is stored as its i18n key and renders in the reader's language; an
// ask whose question PTI typed (no key) shows the stored text as it was.
// ─────────────────────────────────────────────────────────────────────────────

import { beforeEach, describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders, SUPPLIER } from '@test/test-utils';
import { supplierAskStore } from '@services/data/mock/stores/supplierAskStore';
import { NO_PERSON } from '@context/noPerson';
import { sdcClock } from '@services/sdc';
import i18n from '@lib/i18n';
import { askQuestionText } from './supplierAskDisplay';
import SupplierHome from '../SupplierHome';

beforeEach(() => {
  supplierAskStore.reset();
  sdcClock.reset();
});

const EN_Q =
  'Your stock and incoming do not cover the next 30 days of PTI demand. When does production of this material start?';
const ID_Q =
  'Stok dan kedatangan Anda tidak menutup kebutuhan PTI 30 hari ke depan. Kapan produksi material ini dimulai?';

describe('BL-258 — the question reads in the reader’s language', () => {
  it('the sample rows carry their key; the English text stays as the fallback', () => {
    const [first, second] = supplierAskStore.all();
    expect(first).toMatchObject({
      questionKey: 'supplierAsk.sample.coverageProductionDate',
      question: EN_Q
    });
    expect(second?.questionKey).toBe('supplierAsk.default.capacityGap');
  });

  it('English', async () => {
    renderWithProviders(<SupplierHome />, { identity: SUPPLIER });
    expect(await screen.findByTestId('pti-ask-ask-0001')).toHaveTextContent(EN_Q);
  });

  it('Indonesian: no English sentence left in the card', async () => {
    await i18n.changeLanguage('id');
    try {
      renderWithProviders(<SupplierHome />, { identity: SUPPLIER });
      const first = await screen.findByTestId('pti-ask-ask-0001');
      expect(first).toHaveTextContent(ID_Q);
      expect(first).not.toHaveTextContent('Your stock and incoming');
      expect(screen.getByTestId('pti-ask-ask-0002')).toHaveTextContent(
        'Kapasitas Anda untuk minggu ini di bawah kebutuhan PTI.'
      );
    } finally {
      await i18n.changeLanguage('en');
    }
  });

  it('a typed question (no key) is shown as stored, in either language', async () => {
    supplierAskStore.insert({
      supplierId: 'sup-007',
      materialCode: 'PK-PETB-8801',
      topic: 'other',
      question: 'Is the 8801 batch on schedule?',
      state: 'Open',
      history: [{ kind: 'raised', at: '2026-08-31T04:00:00.000Z', actor: NO_PERSON }]
    });
    const tId = i18n.getFixedT('id');
    const typed = supplierAskStore.all().find((a) => a.question.startsWith('Is the 8801'));
    expect(typed && askQuestionText(tId, typed)).toBe('Is the 8801 batch on schedule?');
    // A key the dictionary lacks falls back to the stored text.
    expect(
      askQuestionText(tId, { question: 'Plain', questionKey: 'supplierAsk.sample.none' })
    ).toBe('Plain');
  });
});
