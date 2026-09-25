// ─────────────────────────────────────────────────────────────────────────────
// "DOCUMENTS FROM SUPPLIERS" — the editor the RFI, RFP and RFQ wizards share
// (NR-1 BR-02, B3).
//
// The harness mounts the editor inside the real `Wizard`, gated the way the
// three wizards gate the step: on `documentRequestsRefusal`, the create verb's
// own rule. So "blocks Next" is asserted on the real button, and every refusal
// has its passing twin beside it.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState } from 'react';
import { fireEvent, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderWithProviders } from '../../test/test-utils';
import Wizard from '../../components/ui-v2/Wizard';
import { documentRequestsRefusal } from '../../services/transitions/rfxDocumentRules';
import type { DocumentRequest } from '../../services/sourcing/types';
import DocumentRequestsEditor, {
  DocumentRequestsSummary,
  remapRequestsOnItemRemoved,
  remapRequestsOnItemsChanged,
  type DocumentRequestItem,
} from './DocumentRequestsEditor';

let latest: readonly DocumentRequest[] = [];

const Harness: React.FC<{ items?: readonly DocumentRequestItem[] }> = ({ items }) => {
  const [value, setValue] = useState<readonly DocumentRequest[]>([]);
  const [step, setStep] = useState(0);
  latest = value;
  const lines = (items ?? []).map((i) => i.lineNo);
  return (
    <Wizard
      steps={[
        {
          id: 'documents',
          title: 'Documents',
          content: <DocumentRequestsEditor value={value} onChange={setValue} items={items} testIdPrefix="t" />,
        },
        {
          id: 'review',
          title: 'Review',
          content: <DocumentRequestsSummary value={value} items={items} testIdPrefix="t" />,
        },
      ]}
      currentStep={step}
      onStepChange={setStep}
      onCancel={() => undefined}
      onComplete={() => undefined}
      isStepValid={(n) => (n === 0 ? documentRequestsRefusal(value, lines) === null : true)}
      completeLabel="Done"
    />
  );
};

const nextButton = () => screen.getByRole('button', { name: 'Next' });
const add = () => fireEvent.click(screen.getByTestId('t-doc-add'));
const name = (id: string, value: string) =>
  fireEvent.change(screen.getByTestId(`t-doc-${id}-name`), { target: { value } });

describe('DocumentRequestsEditor', () => {
  it('adds two rows, marks one required, removes one — and the list the wizard holds follows', () => {
    renderWithProviders(<Harness />);
    expect(screen.getByTestId('t-docs-empty')).toBeInTheDocument();

    add();
    add();
    name('doc-1', 'Halal certificate');
    fireEvent.change(screen.getByTestId('t-doc-doc-1-type'), { target: { value: 'certificate' } });
    name('doc-2', 'Company profile');
    fireEvent.change(screen.getByTestId('t-doc-doc-2-type'), { target: { value: 'companyProfile' } });
    fireEvent.click(screen.getByTestId('t-doc-doc-1-required'));

    expect(latest).toEqual([
      { id: 'doc-1', name: 'Halal certificate', type: 'certificate', required: true },
      { id: 'doc-2', name: 'Company profile', type: 'companyProfile', required: false },
    ]);
    // A Certificate request says what else it will ask the supplier for (BR-04).
    expect(screen.getByText(/certificate number, issuer and expiry date/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Remove document request — Request 2' }));
    expect(screen.queryByTestId('t-doc-doc-2')).not.toBeInTheDocument();
    expect(latest.map((r) => r.id)).toEqual(['doc-1']);

    // A row added after a removal gets an id the list does not use yet.
    add();
    expect(latest.map((r) => r.id)).toEqual(['doc-1', 'doc-2']);
    fireEvent.click(screen.getByTestId('t-doc-doc-2-remove'));

    // The review lists what is left, with its type and the required mark.
    expect(nextButton()).not.toBeDisabled();
    fireEvent.click(nextButton());
    const row = screen.getByTestId('t-review-doc-doc-1');
    expect(row).toHaveTextContent('Halal certificate');
    expect(row).toHaveTextContent('Certificate');
    expect(row).toHaveTextContent('Required');
  });

  it('a name asked for twice is refused inline, naming the row, and Next is blocked until it is fixed', () => {
    renderWithProviders(<Harness />);
    add();
    add();
    name('doc-1', 'Halal certificate');
    name('doc-2', '  halal   CERTIFICATE ');

    expect(screen.getByTestId('t-docs-refusal')).toHaveTextContent(
      'Request 2, "halal CERTIFICATE", is already on the list. Give each document its own name.',
    );
    expect(screen.getByTestId('t-doc-doc-2-name')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByTestId('t-doc-doc-1-name')).toHaveAttribute('aria-invalid', 'false');
    expect(nextButton()).toBeDisabled();

    // PASSING TWIN — a name of its own clears the refusal and opens Next.
    name('doc-2', 'Halal certificate for the inks');
    expect(screen.queryByTestId('t-docs-refusal')).not.toBeInTheDocument();
    expect(nextButton()).not.toBeDisabled();
  });

  it('a row without a name is refused by its number; a name unblocks it', () => {
    renderWithProviders(<Harness />);
    add();
    expect(screen.getByTestId('t-docs-refusal')).toHaveTextContent('Request 1 needs a name.');
    expect(nextButton()).toBeDisabled();
    name('doc-1', 'Drawing');
    expect(screen.queryByTestId('t-docs-refusal')).not.toBeInTheDocument();
    expect(nextButton()).not.toBeDisabled();
  });

  it('on an RFQ each row offers the whole response or one item, and the review names the item', () => {
    renderWithProviders(
      <Harness
        items={[
          { lineNo: 1, description: 'Front sticker' },
          { lineNo: 2, description: '' },
        ]}
      />,
    );
    add();
    name('doc-1', 'Die-line drawing');
    const level = screen.getByTestId('t-doc-doc-1-level');
    expect(within(level).getAllByRole('option').map((o) => o.textContent)).toEqual([
      'Whole response',
      'Item 1 · Front sticker',
      'Item 2',
    ]);
    fireEvent.change(level, { target: { value: '1' } });
    expect(latest[0]).toMatchObject({ itemLineNo: 1 });
    fireEvent.change(level, { target: { value: '' } });
    expect(latest[0]).not.toHaveProperty('itemLineNo');
    fireEvent.change(level, { target: { value: '1' } });
    fireEvent.click(nextButton());
    expect(screen.getByTestId('t-review-doc-doc-1')).toHaveTextContent('Item 1 · Front sticker');
  });

  it('an RFI or RFP row offers no level select — only an RFQ has items', () => {
    renderWithProviders(<Harness />);
    add();
    expect(screen.queryByTestId('t-doc-doc-1-level')).not.toBeInTheDocument();
    // KNOWN-GOOD CONTROL — the row itself rendered, so the absence is the select's.
    expect(screen.getByTestId('t-doc-doc-1-type')).toBeInTheDocument();
  });
});

// ── Removing an RFQ item (a request names its item by POSITION) ────────────────

const req = (id: string, itemLineNo?: number): DocumentRequest => ({
  id,
  name: id,
  type: 'drawing',
  required: false,
  ...(itemLineNo !== undefined ? { itemLineNo } : {}),
});

describe('remapRequestsOnItemRemoved', () => {
  it('a later item\'s request moves down with its item; the removed item\'s becomes whole-response and is reported', () => {
    const out = remapRequestsOnItemRemoved([req('a', 1), req('b', 2), req('c', 3), req('d')], 2);
    expect(out.requests).toEqual([req('a', 1), req('b'), req('c', 2), req('d')]);
    expect(out.requests[1]).not.toHaveProperty('itemLineNo');
    expect(out.unlinked).toEqual(['b']);
  });

  it('KNOWN-GOOD TWIN — removing an item no request names changes only the later lines, and reports nothing', () => {
    const out = remapRequestsOnItemRemoved([req('a', 1), req('c', 3), req('d')], 2);
    expect(out.requests).toEqual([req('a', 1), req('c', 2), req('d')]);
    expect(out.unlinked).toEqual([]);
  });
});

describe('remapRequestsOnItemsChanged', () => {
  it('reads each removed line in the list it was taken from (two removals, last first)', () => {
    const out = remapRequestsOnItemsChanged([req('a', 1), req('b', 2), req('c', 3), req('e', 5)], ['u1', 'u2', 'u3', 'u4', 'u5'], ['u1', 'u3', 'u5']);
    expect(out.requests).toEqual([req('a', 1), req('b'), req('c', 2), req('e', 3)]);
    expect(out.unlinked).toEqual(['b']);
  });

  it('an item added at the end, or an item edited in place, renumbers nothing', () => {
    const requests = [req('a', 1), req('b', 2)];
    expect(remapRequestsOnItemsChanged(requests, ['u1', 'u2'], ['u1', 'u2', 'u3'])).toEqual({ requests, unlinked: [] });
    expect(remapRequestsOnItemsChanged(requests, ['u1', 'u2'], ['u1', 'u2'])).toEqual({ requests, unlinked: [] });
  });
});

describe('the unlinked notice', () => {
  const NoticeHarness: React.FC = () => {
    const [value, setValue] = useState<readonly DocumentRequest[]>([
      { id: 'doc-1', name: 'Die-line', type: 'drawing', required: true },
      { id: 'doc-2', name: 'Cap spec', type: 'specification', required: false },
    ]);
    const [unlinked, setUnlinked] = useState<readonly string[]>(['doc-1', 'doc-2']);
    return (
      <DocumentRequestsEditor
        value={value}
        onChange={setValue}
        items={[{ lineNo: 1, description: 'Bottle' }]}
        unlinked={unlinked}
        onUnlinkedChange={setUnlinked}
        testIdPrefix="t"
      />
    );
  };

  it('names each request until the buyer edits that row or dismisses its notice', () => {
    renderWithProviders(<NoticeHarness />);
    expect(screen.getByTestId('t-docs-unlinked-doc-1')).toHaveTextContent(
      '"Die-line" was linked to a removed item; it now applies to the whole response.',
    );
    expect(screen.getByTestId('t-docs-unlinked-doc-2')).toHaveTextContent('"Cap spec"');

    // Editing the row answers its notice; the other stays.
    fireEvent.change(screen.getByTestId('t-doc-doc-1-level'), { target: { value: '1' } });
    expect(screen.queryByTestId('t-docs-unlinked-doc-1')).not.toBeInTheDocument();
    expect(screen.getByTestId('t-docs-unlinked-doc-2')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('t-docs-unlinked-doc-2-dismiss'));
    expect(screen.queryByTestId('t-docs-unlinked')).not.toBeInTheDocument();
  });
});
