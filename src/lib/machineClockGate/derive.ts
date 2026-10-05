// ─────────────────────────────────────────────────────────────────────────────
// THE MACHINE-CLOCK GATE — the derivation.
//
// ── WHY THIS EXISTS ─────────────────────────────────────────────────────────
//   The demo hub runs on ONE clock: the hub clock (`sdcClock.now()`, read by
//   the RFx code as `rfxNow()`), fixed at the declared present. A record
//   stamped with the MACHINE clock instead lands weeks past every seeded row
//   beside it — an award made in the demo read "22 Sept 2026" next to a hub
//   whose present is 31 Aug 2026 (PR #34). The same split was then found in
//   every other lane, and every instance was found by a human reading a date.
//   This module is the instrument that makes the next one fail a build.
//
//   THE RULE: no argument-less `new Date()` / `new Date` / `Date.now()` in a
//   non-test `src/` module, unless the site is in `allowlist.ts` with its
//   reason stated (a machine-clock read that is HONEST: an id, a timer, the
//   clock implementation itself).
//
// ── WHAT IT READS ───────────────────────────────────────────────────────────
//   The TypeScript AST, per file, with no type checker. So a comment or a
//   string that SAYS `new Date()` is not a site (the tree is full of comments
//   explaining why a site was removed), and `new Date(x)` — a parse of a
//   value, not a read of the clock — is not a site either.
//
// ── THE LIMITS, STATED ──────────────────────────────────────────────────────
//   1. `Date` is matched BY NAME. `new globalThis.Date()` / `new window.Date()`
//      are matched explicitly; an alias (`const D = Date; new D()`) is not.
//      None exists today.
//   2. `new Date(Date.now())` IS caught — the inner `Date.now()` is the site.
//      `performance.now()` is a duration clock, not a calendar reading, and is
//      out of scope.
// ─────────────────────────────────────────────────────────────────────────────
import ts from 'typescript';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { isSourceFile, scriptKindOf } from '@test/sourceFiles';

export type SiteKind = 'new Date()' | 'Date.now()';

/** One machine-clock read. */
export interface ClockSite {
  readonly file: string;
  readonly line: number;
  readonly kind: SiteKind;
  /** The chain of named declarations enclosing the site — the allowlist's
   *  stable key (a line number moves on every edit above it; an owner does not). */
  readonly owner: string;
}

export interface Census {
  readonly sites: readonly ClockSite[];
  /** Files the census walked. Zero is EMPTY-INPUT-REPORTS-CLEAN-01. */
  readonly filesWalked: number;
}

/** Specs are out of scope: they may pin any clock they like. */
export function isOutOfScopePath(path: string): boolean {
  return (
    /\.(test|spec)\.[jt]sx?$/.test(path) ||
    /(^|\/)__tests__\//.test(path) ||
    /(^|\/)machineClockGate\//.test(path)
  );
}

const isDateRef = (e: ts.Expression): boolean =>
  (ts.isIdentifier(e) && e.text === 'Date') ||
  (ts.isPropertyAccessExpression(e) &&
    e.name.text === 'Date' &&
    ts.isIdentifier(e.expression) &&
    (e.expression.text === 'globalThis' || e.expression.text === 'window'));

function nameOf(n: ts.Node): string | null {
  if (
    (ts.isFunctionDeclaration(n) ||
      ts.isMethodDeclaration(n) ||
      ts.isClassDeclaration(n) ||
      ts.isVariableDeclaration(n) ||
      ts.isPropertyAssignment(n) ||
      ts.isPropertyDeclaration(n) ||
      ts.isGetAccessor(n)) &&
    n.name &&
    (ts.isIdentifier(n.name) || ts.isStringLiteral(n.name))
  ) {
    return n.name.text;
  }
  return null;
}

/** `outer.inner` — the chain of named declarations enclosing `node`. */
function ownerOf(node: ts.Node): string {
  const names: string[] = [];
  for (let n: ts.Node | undefined = node.parent; n; n = n.parent) {
    const nm = nameOf(n);
    if (nm) names.unshift(nm);
  }
  return names.length ? names.join('.') : '<module>';
}

/** Derive the sites in ONE source text. Exported so the probe can feed it synthetic input. */
export function sitesIn(file: string, text: string): ClockSite[] {
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, scriptKindOf(file));
  const out: ClockSite[] = [];
  const at = (n: ts.Node): number => sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1;
  const visit = (n: ts.Node): void => {
    if (ts.isNewExpression(n) && isDateRef(n.expression) && (!n.arguments || n.arguments.length === 0)) {
      out.push({ file, line: at(n), kind: 'new Date()', owner: ownerOf(n) });
    } else if (
      ts.isCallExpression(n) &&
      n.arguments.length === 0 &&
      ts.isPropertyAccessExpression(n.expression) &&
      n.expression.name.text === 'now' &&
      isDateRef(n.expression.expression)
    ) {
      out.push({ file, line: at(n), kind: 'Date.now()', owner: ownerOf(n) });
    }
    n.forEachChild(visit);
  };
  visit(sf);
  return out;
}

function walk(dir: string, acc: string[]): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, acc);
    else if (isSourceFile(name)) acc.push(p);
  }
  return acc;
}

/** Derive every machine-clock read under `<root>/src`, specs excluded. */
export function deriveCensus(root: string): Census {
  const files = walk(join(root, 'src'), [])
    .map((abs) => ({ abs, rel: relative(root, abs).replace(/\\/g, '/') }))
    .filter((f) => !isOutOfScopePath(f.rel));
  const sites = files.flatMap((f) => sitesIn(f.rel, readFileSync(f.abs, 'utf8')));
  return { sites, filesWalked: files.length };
}

/** `file::owner::kind` — the key an allowlist row is matched on. */
export const siteKey = (s: Pick<ClockSite, 'file' | 'owner' | 'kind'>): string =>
  `${s.file}::${s.owner}::${s.kind}`;

/** One allowlisted machine-clock read, with the reason it is honest. */
export interface AllowRow {
  /** `siteKey()` — `file::owner::kind`. */
  readonly key: string;
  /** How many sites share this key. Exact, so a SECOND read added beside an
   *  allowlisted one is not silently covered by the first one's reason. */
  readonly count: number;
  readonly why: 'unique-id' | 'time-of-day' | 'test-harness' | 'contract-pinned';
  readonly reason: string;
}

export interface Verdict {
  /** Live sites whose key has no row. The gate's subject. */
  readonly unlisted: readonly ClockSite[];
  /** Rows naming no live site — the list must shrink truthfully. */
  readonly stale: readonly AllowRow[];
  /** Rows whose count no longer matches the live count. */
  readonly miscounted: readonly { readonly row: AllowRow; readonly live: number }[];
  /** Rows with no stated reason. */
  readonly unreasoned: readonly AllowRow[];
}

/** Judge a census against an allowlist, in BOTH directions. */
export function judge(sites: readonly ClockSite[], allow: readonly AllowRow[]): Verdict {
  const live = new Map<string, ClockSite[]>();
  for (const s of sites) live.set(siteKey(s), [...(live.get(siteKey(s)) ?? []), s]);
  const rows = new Map(allow.map((r) => [r.key, r]));
  return {
    unlisted: sites.filter((s) => !rows.has(siteKey(s))),
    stale: allow.filter((r) => !live.has(r.key)),
    miscounted: allow
      .filter((r) => live.has(r.key) && live.get(r.key)!.length !== r.count)
      .map((row) => ({ row, live: live.get(row.key)!.length })),
    unreasoned: allow.filter((r) => r.reason.trim().length < 20),
  };
}
