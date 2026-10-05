// ────────────────────────────────────────────────────────────────────────────
// TABLE-WRAPPER-CLIPS-COLUMNS — a hand-written <table> may not sit directly
// inside an `overflow-hidden` wrapper.
//
// PR #68 moved the shared `Table` into its own `overflow-x-auto` container and
// fixed the hand-written tables it found. Review round 1 then found four more
// with the old shape (BuyerOrders, SupplierOrders, BuyerContracts ×2), and the
// scan that wrote this guard found a fifth the review missed (BuyerInvoices
// remittance). `overflow-hidden` exists on those wrappers only to clip the
// rounded border, and it also cuts off whatever columns do not fit: on a phone
// the order drawer is full-width and the IDR columns were simply gone.
//
// The shape it rejects is the one the tree really had: the line immediately
// before `<table` opens a `<div className="…overflow-hidden…">`. The fix is
// `relative min-w-0 … overflow-x-auto` (contractView's shape), which keeps the
// border and radius and lets the table scroll inside its own box.
//
// RULE 4 — the matcher is probed both ways on the same instrument, and the
// real-tree population must contain named table sites before its empty
// violation list means anything.
// ────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { isJsxFile } from '@test/sourceFiles';

const SRC = join(process.cwd(), 'src');

function shippedTsx(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) shippedTsx(full, out);
    else if (isJsxFile(name) && !name.includes('.test.')) out.push(full);
  }
  return out;
}

interface TableSite {
  file: string;
  line: number;
  wrapper: string;
}

/** Every `<table` whose previous non-blank line opens a `<div className=…>`. */
function wrappedTables(file: string, source: string): TableSite[] {
  const lines = source.split('\n');
  const sites: TableSite[] = [];
  lines.forEach((text, i) => {
    if (!/<table\b/.test(text)) return;
    let j = i - 1;
    while (j >= 0 && lines[j].trim() === '') j -= 1;
    if (j < 0) return;
    const prev = lines[j];
    if (/<div\b[^>]*className=/.test(prev)) sites.push({ file, line: i + 1, wrapper: prev.trim() });
  });
  return sites;
}

const clips = (s: TableSite) => /\boverflow-hidden\b/.test(s.wrapper);

describe('TABLE-WRAPPER-CLIPS-COLUMNS', () => {
  it('the matcher flags the shape the tree really had, and accepts the fix', () => {
    const bad = [
      '<div className="border border-border-subtle rounded-md overflow-hidden">',
      '  <table className="w-full text-xs">',
    ].join('\n');
    const good = [
      '<div className="relative min-w-0 border border-border-subtle rounded-md overflow-x-auto">',
      '  <table className="w-full text-xs">',
    ].join('\n');
    const badSites = wrappedTables('bad.tsx', bad);
    const goodSites = wrappedTables('good.tsx', good);
    expect(badSites).toHaveLength(1);
    expect(badSites.filter(clips)).toHaveLength(1);
    expect(goodSites).toHaveLength(1);
    expect(goodSites.filter(clips)).toHaveLength(0);
  });

  const sites = shippedTsx(SRC).flatMap((f) =>
    wrappedTables(relative(process.cwd(), f).split('\\').join('/'), readFileSync(f, 'utf8')),
  );

  it('the population reaches the wrappers this guard exists for', () => {
    const files = new Set(sites.map((s) => s.file));
    expect(files).toContain('src/pages-v2/BuyerOrders.tsx');
    expect(files).toContain('src/pages-v2/BuyerInvoices.tsx');
    expect(files).toContain('src/pages-v2/contracts/contractView.tsx');
  });

  it('no hand-written table sits directly inside an overflow-hidden wrapper', () => {
    expect(sites.filter(clips).map((s) => `${s.file}:${s.line}`)).toEqual([]);
  });
});
