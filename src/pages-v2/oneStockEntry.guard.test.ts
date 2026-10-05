// ─────────────────────────────────────────────────────────────────────────────
// BL-73 · REQ-E08-02 BR-09 — ONE STOCK ENTRY: one form, one rule set, one verb.
//
// "Manual entry and template upload carry exactly the same fields and rules, on
// one page. There is no second stock entry point." BR-08 lets PTI record what a
// supplier sent by WhatsApp or email — through that same entry, marked "Entered
// by PTI".
//
// THE DEFECT THIS PINS SHUT: both channel-triage surfaces (`CommHubInbound`,
// supplier side; `BuyerChannelTriage`, PTI side) recorded stock through their
// OWN path — `parseGrid` → `useInventoryDeclare` / `useInventoryRecord` → their
// own `svc.commands.dispatch` — with one field and their own number rules. They
// now pre-fill `StockEntryPanel`, and that path is deleted.
//
// THE INVARIANT, DERIVED FROM SOURCE (not from a list of files):
//   1. the stock-declaration transitions are dispatched from exactly ONE site —
//      `useInventoryCommand` in commandHooks;
//   2. that hook's two stock verbs are driven from exactly the Stock page's two
//      methods — the entry form and the template upload;
//   3. every surface that leads to a stock record renders that entry form.
// Each derivation is controlled by a NAMED member it must find, and probed with
// the shape the tree really shipped before this batch.
// ─────────────────────────────────────────────────────────────────────────────

import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';
import { isSourceFile, isTestFile, scriptKindOf } from '@test/sourceFiles';

const STOCK_TRANSITIONS = ['t_inventorydeclaration_declare', 't_inventorydeclaration_record'];
const SRC = path.join(__dirname, '..');

function sourceFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return sourceFiles(p);
    return isSourceFile(e.name) && !isTestFile(e.name) ? [p] : [];
  });
}

const parse = (file: string, text: string) =>
  ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, scriptKindOf(file));

function walk(node: ts.Node, visit: (n: ts.Node) => void): void {
  visit(node);
  ts.forEachChild(node, (c) => walk(c, visit));
}

/** `transitionId: <expr naming a stock transition>` — a DISPATCH site, not a comment or a flow id. */
function dispatchesStock(text: string, file = 'probe.tsx'): boolean {
  let hit = false;
  walk(parse(file, text), (n) => {
    if (
      ts.isPropertyAssignment(n) &&
      n.name.getText() === 'transitionId' &&
      STOCK_TRANSITIONS.some((id) => n.initializer.getText().includes(`'${id}'`))
    ) {
      hit = true;
    }
  });
  return hit;
}

/** `{ verb: 'declare' | 'record', … }` passed to a call — a use of the stock verbs. */
function drivesStockVerb(text: string, file = 'probe.tsx'): boolean {
  let hit = false;
  walk(parse(file, text), (n) => {
    if (
      ts.isPropertyAssignment(n) &&
      n.name.getText() === 'verb' &&
      ts.isStringLiteral(n.initializer) &&
      (n.initializer.text === 'declare' || n.initializer.text === 'record') &&
      ts.isObjectLiteralExpression(n.parent) &&
      ts.isCallExpression(n.parent.parent)
    ) {
      hit = true;
    }
  });
  return hit;
}

/** The `mode` of every `<StockEntryPanel … />` a file renders. */
function entryPanelModes(text: string, file = 'probe.tsx'): string[] {
  const modes: string[] = [];
  walk(parse(file, text), (n) => {
    if ((ts.isJsxSelfClosingElement(n) || ts.isJsxOpeningElement(n)) && n.tagName.getText() === 'StockEntryPanel') {
      for (const a of n.attributes.properties) {
        if (ts.isJsxAttribute(a) && a.name.getText() === 'mode' && a.initializer && ts.isStringLiteral(a.initializer)) {
          modes.push(a.initializer.text);
        }
      }
    }
  });
  return modes;
}

const FILES = sourceFiles(SRC).map((f) => ({
  file: path.relative(SRC, f).split(path.sep).join('/'),
  text: fs.readFileSync(f, 'utf8'),
}));

describe('BL-73 · the stock transitions are dispatched from ONE site', () => {
  const sites = FILES.filter((f) => dispatchesStock(f.text, f.file)).map((f) => f.file);

  it('POPULATION — the one real dispatch site is found by name', () => {
    expect(sites).toContain('services/query/commandHooks.js');
  });

  it('PROBE — fires at the shape the triage hooks shipped, and not at a mention', () => {
    // The retired `useInventoryRecord`, as it read before this batch.
    expect(
      dispatchesStock(`svc.commands.dispatch(scope, {
        transitionId: 't_inventorydeclaration_record',
        entity: 'inventoryDeclaration',
        payload: { ...facts, supplierId: message.supplierId },
      }, causationId)`),
    ).toBe(true);
    // Known-good twins: a comment, and a flow's own transition id, are not dispatches.
    expect(dispatchesStock(`// dispatches t_inventorydeclaration_declare`)).toBe(false);
    expect(dispatchesStock(`const t = { id: 't_inventorydeclaration_declare', from: [] };`)).toBe(false);
  });

  it('THE TREE — no other file dispatches a stock declaration', () => {
    expect(sites).toEqual(['services/query/commandHooks.js']);
  });
});

describe('BL-73 · the stock verbs are driven only by the Stock page’s two methods', () => {
  const drivers = FILES.filter((f) => drivesStockVerb(f.text, f.file)).map((f) => f.file).sort();

  it('POPULATION + THE TREE — the entry form and the template upload, and nothing else', () => {
    expect(drivers).toEqual(['pages-v2/inventory/StockEntryPanel.tsx', 'pages-v2/inventory/StockUploadPanel.tsx']);
  });

  it('PROBE — a page running its own `declare` is caught; the type declaration is not', () => {
    expect(drivesStockVerb(`await run({ verb: 'declare', channel: 'manual', supplierId, materialCode, totalQty })`)).toBe(true);
    expect(drivesStockVerb(`type V = { verb: 'declare'; supplierId: string }`)).toBe(false);
  });
});

describe('BL-73 · both channel-triage surfaces lead into the entry form', () => {
  const modesOf = (file: string) => entryPanelModes(FILES.find((f) => f.file === file)!.text, file);

  it('the supplier triage opens it in supplier mode; the PTI triage in PTI mode', () => {
    expect(modesOf('pages-v2/CommHubInbound.tsx')).toEqual(['supplier']);
    expect(modesOf('pages-v2/BuyerChannelTriage.tsx')).toEqual(['pti']);
  });

  it('the Stock pages themselves are found by the same matcher (control)', () => {
    expect(modesOf('pages-v2/SupplierInventory.tsx')).toEqual(['supplier']);
    expect(modesOf('pages-v2/BuyerInventory.tsx')).toEqual(['pti']);
  });

  it('no triage surface imports a stock path of its own', () => {
    for (const file of ['pages-v2/CommHubInbound.tsx', 'pages-v2/BuyerChannelTriage.tsx']) {
      const text = FILES.find((f) => f.file === file)!.text;
      const code = text.replace(/\/\/.*$/gm, ''); // comments may name the retired path
      expect(code, file).not.toMatch(/\bparseGrid\b|useInventoryDeclare|useInventoryRecord|\.dispatch\(|mutateAsync\(/);
    }
  });
});
