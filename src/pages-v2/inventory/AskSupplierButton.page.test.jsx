import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { BUYER, renderWithProviders } from '@test/test-utils';
import { inventoryCapacityEn } from '@lib/i18n/inventoryCapacity';
import { supplierAskStore } from '@services/data/mock/stores/supplierAskStore';
import { sdcClock } from '@services/sdc';
import AskSupplierButton from './AskSupplierButton';

// ─────────────────────────────────────────────────────────────────────────────
// INV-D9 — the reusable PTI "Ask supplier" control (lanes 2B–2D place it).
//
//   · no live ask on the subject → the button and the dialog (topic, question
//     prefilled per topic and editable, optional due date);
//   · a live ask on the same supplier × subject → that ask, never a duplicate,
//     with Withdraw (Open) or Close (Answered) and a WhatsApp share link;
//   · a seat without the atom is told whose act it is (§84).
// ─────────────────────────────────────────────────────────────────────────────

beforeEach(() => {
  supplierAskStore.reset();
  sdcClock.reset();
});

describe('INV-D9 · Ask supplier — a new ask', () => {
  it('opens on the topic’s question, follows the topic, and refuses an empty question', async () => {
    renderWithProviders(
      <AskSupplierButton supplierId="sup-007" materialCode="PK-PETB-8801" topic="productionDate" />
    );
    fireEvent.click(await screen.findByTestId('ask-supplier-open'));
    const question = /** @type {HTMLTextAreaElement} */ (
      screen.getByTestId('ask-supplier-question')
    );
    expect(question.value).toBe(inventoryCapacityEn['supplierAsk.default.productionDate']);
    fireEvent.change(screen.getByTestId('ask-supplier-topic'), {
      target: { value: 'stockFigures' }
    });
    expect(question.value).toBe(inventoryCapacityEn['supplierAsk.default.stockFigures']);
    fireEvent.change(question, { target: { value: '  ' } });
    expect(screen.getByTestId('ask-supplier-refusal')).toHaveTextContent('Write the question.');
    expect(screen.getByTestId('ask-supplier-submit')).toBeDisabled();
  });

  it('sends the ask; the control then shows it instead of offering another', async () => {
    renderWithProviders(
      <AskSupplierButton
        supplierId="sup-007"
        materialCode="PK-PETB-8801"
        topic="other"
        defaultQuestion="Is the 8801 batch on schedule?"
        riskClass="medium"
      />
    );
    fireEvent.click(await screen.findByTestId('ask-supplier-open'));
    fireEvent.change(screen.getByTestId('ask-supplier-due'), { target: { value: '2026-09-04' } });
    fireEvent.click(screen.getByTestId('ask-supplier-submit'));
    expect(await screen.findByTestId('ask-supplier-existing')).toHaveTextContent(
      'Asked, waiting for the supplier'
    );
    expect(screen.queryByTestId('ask-supplier-open')).toBeNull();
    const row = supplierAskStore.all().slice(-1)[0];
    expect(row).toMatchObject({
      supplierId: 'sup-007',
      materialCode: 'PK-PETB-8801',
      topic: 'other',
      question: 'Is the 8801 batch on schedule?',
      dueDate: '2026-09-04',
      riskClass: 'medium',
      state: 'Open'
    });
  });
});

describe('INV-D9 · Ask supplier — an ask already on the subject', () => {
  it('a material with an open ask shows it, with Withdraw and a WhatsApp share of the hub link', async () => {
    renderWithProviders(
      <AskSupplierButton supplierId="sup-007" materialCode="PK-PETB-8802" topic="productionDate" />
    );
    expect(await screen.findByTestId('ask-supplier-existing')).toBeInTheDocument();
    expect(screen.queryByTestId('ask-supplier-open')).toBeNull();
    fireEvent.click(screen.getByTestId('ask-supplier-view'));
    expect(screen.getByTestId('ask-supplier-view-question')).toHaveTextContent(
      'When does production of this material start?'
    );
    const wa = screen.getByTestId('ask-supplier-whatsapp');
    expect(wa.getAttribute('href')).toMatch(/^https:\/\/wa\.me\/\?text=/);
    expect(decodeURIComponent(wa.getAttribute('href') ?? '')).toContain('#/supplier/home');
    expect(screen.queryByTestId('ask-supplier-close')).toBeNull();
    fireEvent.click(screen.getByTestId('ask-supplier-withdraw'));
    await waitFor(() => expect(supplierAskStore.get('ask-0001')?.state).toBe('Withdrawn'));
  });

  // PEX-D22 — the sample ask (ask-0002) follows the red week to 7 Sep.
  it('a capacity week with an answered ask shows the answer and Close', async () => {
    supplierAskStore.append('ask-0002', 'Answered', {
      kind: 'answered',
      at: '2026-08-31T05:00:00.000Z',
      actor: BUYER.actor,
      text: 'We can add 5,000 PCS.'
    });
    renderWithProviders(
      <AskSupplierButton
        supplierId="sup-007"
        planningGroupId="pg-MG-20"
        week="2026-09-07"
        topic="capacityGap"
      />
    );
    expect(await screen.findByTestId('ask-supplier-existing')).toHaveTextContent(
      'The supplier answered'
    );
    fireEvent.click(screen.getByTestId('ask-supplier-view'));
    expect(screen.getByTestId('ask-supplier-view-answer')).toHaveTextContent(
      'We can add 5,000 PCS.'
    );
    fireEvent.click(screen.getByTestId('ask-supplier-close'));
    await waitFor(() => expect(supplierAskStore.get('ask-0002')?.state).toBe('Closed'));
  });

  it('another week of the same group is a different subject: the button is offered', async () => {
    renderWithProviders(
      <AskSupplierButton
        supplierId="sup-007"
        planningGroupId="pg-MG-20"
        week="2026-09-21"
        topic="capacityGap"
      />
    );
    expect(await screen.findByTestId('ask-supplier-open')).toHaveTextContent(
      'Ask about the capacity gap'
    );
  });
});

describe('INV-D9 · Ask supplier — the role gate (§84)', () => {
  it('a seat without supplierask:raise sees whose act it is, not the button', async () => {
    renderWithProviders(
      <AskSupplierButton supplierId="sup-007" materialCode="PK-PETB-8801" topic="stockFigures" />,
      { identity: { ...BUYER, businessRoles: ['buyer', 'procurement'] } }
    );
    expect(await screen.findByTestId('handoff-supplierask-raise')).toBeInTheDocument();
    expect(screen.queryByTestId('ask-supplier-open')).toBeNull();
  });
});
