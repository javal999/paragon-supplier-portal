// ─────────────────────────────────────────────────────────────────────────────
// C1 · THE DERIVATION BEHIND THE PIN — the tree half and the document half,
// kept in one module so neither can quietly become the other.
//
// ── WHY THIS EXISTS ─────────────────────────────────────────────────────────
//   `C1-methods.md` is the method-surface contract: the interface a Phase-F1
//   backend team implements. It was harvested once and never re-harvested, and
//   NO BUILD STEP FAILS WHEN A CONTRACT STATEMENT STOPS BEING TRUE — the exact
//   cause CP-1 named across C7/C8 and CP-2 put on the floor for C9.
//
//   This module supplies the two populations the pin compares. It derives the
//   TREE from the AST and the DOCUMENT from its committed markdown. Neither is
//   read through the other, which is the §86 rule: a gate must not derive its
//   population through the code it is probing. Here the two sides are genuinely
//   independent instruments, so a mutation on either side moves exactly one of
//   them and the comparison goes red rather than collapsing to vacuous.
//
// ── BOTH HALVES OF THE TYPE, DELIBERATELY (§40e) ────────────────────────────
//   D-F measured that a population read through the declared type NODE sees
//   optionals but is blind to `extends`, while one read through the CHECKER
//   sees `extends` and loses optionals — and that widening from one to the
//   other GAINED 17 members while silently LOSING 5. So `deriveServiceSurface`
//   computes both and reports the divergence rather than picking a winner. No
//   sub-service uses `extends` today; the day one does, the node half stops
//   agreeing and `c1MethodSurface.contract.test.ts` says so by name instead of
//   silently under-reporting.
// ─────────────────────────────────────────────────────────────────────────────

import ts from 'typescript';

// ─── The TREE half ───────────────────────────────────────────────────────────

export interface DerivedSubService {
  /** The property name on `IDataService`, e.g. `procurement`. */
  readonly property: string;
  /** The interface it is typed as, e.g. `IProcurementService`. */
  readonly iface: string;
  /** Method names, in declaration order. */
  readonly methods: readonly string[];
  /** False when the NODE and CHECKER halves disagree — see the header. */
  readonly halvesAgree: boolean;
}

export interface DerivedSurface {
  readonly subServices: readonly DerivedSubService[];
  /** Methods declared directly on `IDataService`, e.g. `getCapabilities`. */
  readonly topLevelMethods: readonly string[];
  readonly subMethodTotal: number;
  readonly grandTotal: number;
}

const interfaceIn = (sf: ts.SourceFile, name: string): ts.InterfaceDeclaration | undefined => {
  let found: ts.InterfaceDeclaration | undefined;
  ts.forEachChild(sf, (n) => {
    if (ts.isInterfaceDeclaration(n) && n.name.text === name) found = n;
  });
  return found;
};

/** Method names as the DECLARATION states them — blind to `extends`. */
const nodeMethods = (decl: ts.InterfaceDeclaration, sf: ts.SourceFile): string[] =>
  decl.members.filter(ts.isMethodSignature).map((m) => m.name.getText(sf));

/**
 * Method names as the CHECKER resolves them — sees `extends`.
 *
 * Reads both forms (frontend-standard Phase 4): `decl` is an interface or a
 * JSDoc `@typedef`. For a typedef the checker follows an intersection
 * (`Base & { … }`, `Omit<Base,'k'> & { … }`) the way it follows `extends`, and a
 * member is method-shaped when it is declared as a method signature OR as a
 * `@property` whose type is a function type — the same split the NODE half
 * (`typedefMembers`) uses, so the two halves still answer the same question.
 */
const checkerMethods = (
  decl: ts.InterfaceDeclaration | ts.JSDocTypedefTag,
  checker: ts.TypeChecker,
): string[] =>
  checker
    .getPropertiesOfType(checker.getTypeAtLocation(decl))
    .filter((s) =>
      s.declarations?.some(
        (d) =>
          ts.isMethodSignature(d) ||
          (ts.isJSDocPropertyTag(d) && isFunctionTypeNode(d.typeExpression?.type)),
      ),
    )
    .map((s) => s.getName());

/**
 * Every sub-service of `IDataService` and every method on it, from the AST.
 *
 * Throws rather than returning empty when the root interface is absent —
 * `EMPTY-INPUT-REPORTS-CLEAN-01`: a derivation that examined nothing must never
 * be able to hand back a clean-looking answer.
 */
export function deriveServiceSurface(program: ts.Program, typesPath: string): DerivedSurface {
  const sf = program.getSourceFile(typesPath);
  if (!sf) throw new Error(`C1 derivation: cannot read ${typesPath}`);
  const checker = program.getTypeChecker();

  // Reads both forms (frontend-standard Phase 4): `interface IDataService` in a
  // `.ts` module, or `@typedef {object} IDataService` + `@property` tags in the
  // converted `types.js`. Still THROWS when neither declares it.
  const root = interfaceIn(sf, 'IDataService') ?? typedefIn(sf, 'IDataService');
  if (!root) throw new Error('C1 derivation: `IDataService` is not declared in the types module');

  const subServices: DerivedSubService[] = [];
  const topLevelMethods: string[] = [];

  // One row per root member, either form: a method name, or a property name
  // with the text of its declared type. Classification is the interface's —
  // a method signature (or a function-typed `@property`) is a METHOD; any other
  // typed member is a sub-service PROPERTY.
  const rootMembers: ({ kind: 'method'; name: string } | { kind: 'property'; name: string; type: string })[] = [];
  if (ts.isInterfaceDeclaration(root)) {
    for (const member of root.members) {
      if (ts.isMethodSignature(member)) rootMembers.push({ kind: 'method', name: member.name.getText(sf) });
      else if (ts.isPropertySignature(member) && member.type) {
        rootMembers.push({ kind: 'property', name: member.name.getText(sf), type: member.type.getText(sf) });
      }
    }
  } else {
    const { methods, properties } = typedefMembers(root, sf);
    const tags = ts.isJSDocTypeLiteral(root.typeExpression!) ? root.typeExpression.jsDocPropertyTags ?? [] : [];
    for (const name of methods) rootMembers.push({ kind: 'method', name });
    for (const name of properties) {
      const t = tags.find((p) => p.name.getText(sf) === name)?.typeExpression?.type;
      if (t) rootMembers.push({ kind: 'property', name, type: t.getText(sf) });
    }
  }

  for (const member of rootMembers) {
    if (member.kind === 'method') {
      topLevelMethods.push(member.name);
      continue;
    }

    const iface = member.type;
    const decl = interfaceIn(sf, iface) ?? typedefIn(sf, iface);
    if (!decl) {
      // A sub-service typed as something the module does not declare. Recorded
      // rather than skipped: silently dropping it is how a surface shrinks
      // without anyone noticing.
      subServices.push({
        property: member.name,
        iface,
        methods: [],
        halvesAgree: false,
      });
      continue;
    }

    const viaNode = ts.isInterfaceDeclaration(decl) ? nodeMethods(decl, sf) : typedefMembers(decl, sf).methods;
    const viaChecker = checkerMethods(decl, checker);
    const same =
      viaNode.length === viaChecker.length && [...viaNode].sort().join() === [...viaChecker].sort().join();

    subServices.push({
      property: member.name,
      iface,
      // The checker half is authoritative for MEMBERSHIP (it sees inherited
      // members); the node half supplies declaration ORDER, which reads better
      // in the document. They agree today, and `halvesAgree` is asserted.
      methods: same ? viaNode : [...new Set([...viaNode, ...viaChecker])],
      halvesAgree: same,
    });
  }

  const subMethodTotal = subServices.reduce((n, s) => n + s.methods.length, 0);
  return {
    subServices,
    topLevelMethods,
    subMethodTotal,
    grandTotal: subMethodTotal + topLevelMethods.length,
  };
}

/**
 * The `@typedef` named `name`, wherever its JSDoc comment hangs in the file.
 *
 * Reads both forms (frontend-standard Phase 4): after the TS → JS conversion an
 * `interface X { … }` is written `/** @typedef {object} X  @property … *\/`.
 * JSDoc hangs off the node it documents (a trailing typedef hangs off the
 * end-of-file token) and is not reached by `forEachChild`, so every node's
 * `jsDoc` is visited explicitly — all of a node's comments, not just the last.
 */
const typedefIn = (sf: ts.SourceFile, name: string): ts.JSDocTypedefTag | undefined => {
  let found: ts.JSDocTypedefTag | undefined;
  const visit = (n: ts.Node): void => {
    for (const doc of (n as { jsDoc?: ts.JSDoc[] }).jsDoc ?? []) {
      for (const tag of doc.tags ?? []) {
        if (ts.isJSDocTypedefTag(tag) && tag.name && ts.isIdentifier(tag.name) && tag.name.text === name) {
          found ??= tag;
        }
      }
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);
  return found;
};

/** A JSDoc `@property {T}` is method-shaped exactly when `T` is a function type. */
const isFunctionTypeNode = (t: ts.TypeNode | undefined): boolean => {
  let u = t;
  while (u && (ts.isParenthesizedTypeNode(u) || u.kind === ts.SyntaxKind.JSDocOptionalType)) {
    u = (u as ts.ParenthesizedTypeNode | ts.JSDocOptionalType).type;
  }
  return !!u && (ts.isFunctionTypeNode(u) || ts.isJSDocFunctionType(u));
};

/**
 * The members a typedef declares, split as `deriveInterfaceMembers` splits an
 * interface's. Two typedef shapes reach here:
 *   - `@typedef {object} X` + `@property` tags → a `JSDocTypeLiteral`. A tag
 *     whose type is a function type (`{(id: string) => string}`) is the JSDoc
 *     spelling of a METHOD signature; any other type is a PROPERTY.
 *   - `@typedef {{ … }} X` or `@typedef {Base & { … }} X` → TS type-literal
 *     members, classified exactly as an interface's are. Like the interface
 *     read (`nodeMethods`), only the members WRITTEN here count: a named base
 *     in an intersection is the `extends` clause, and is not followed.
 */
const typedefMembers = (
  tag: ts.JSDocTypedefTag,
  sf: ts.SourceFile,
): { methods: string[]; properties: string[] } => {
  const methods: string[] = [];
  const properties: string[] = [];
  const te = tag.typeExpression;
  if (te && ts.isJSDocTypeLiteral(te)) {
    for (const p of te.jsDocPropertyTags ?? []) {
      (isFunctionTypeNode(p.typeExpression?.type) ? methods : properties).push(p.name.getText(sf));
    }
  } else if (te) {
    const literals: ts.TypeLiteralNode[] = [];
    const collect = (t: ts.TypeNode): void => {
      if (ts.isTypeLiteralNode(t)) literals.push(t);
      else if (ts.isIntersectionTypeNode(t)) t.types.forEach(collect);
      else if (ts.isParenthesizedTypeNode(t)) collect(t.type);
    };
    collect(te.type);
    for (const lit of literals) {
      methods.push(...lit.members.filter(ts.isMethodSignature).map((m) => m.name.getText(sf)));
      properties.push(...lit.members.filter(ts.isPropertySignature).map((m) => m.name.getText(sf)));
    }
  }
  return { methods, properties };
};

/**
 * Every member of an interface, split by kind — used for `CommandTarget`.
 *
 * Reads both forms (frontend-standard Phase 4): a TS `interface`, or a JSDoc
 * `@typedef` in a converted `.js` file. Still THROWS when neither declares the
 * name — `EMPTY-INPUT-REPORTS-CLEAN-01`.
 */
export function deriveInterfaceMembers(
  program: ts.Program,
  filePath: string,
  ifaceName: string,
): { readonly methods: readonly string[]; readonly properties: readonly string[] } {
  const sf = program.getSourceFile(filePath);
  if (!sf) throw new Error(`C1 derivation: cannot read ${filePath}`);
  const decl = interfaceIn(sf, ifaceName);
  const typedef = decl ? undefined : typedefIn(sf, ifaceName);
  if (!decl && !typedef) {
    throw new Error(`C1 derivation: \`${ifaceName}\` is not declared in ${filePath}`);
  }

  // ⚠️ **THE SPLIT IS THE POINT, AND IT IS WHY THIS RETURNS TWO LISTS.** The
  // first matcher written for this read `\w+\??\(` — method-call shape — and
  // reported `CommandTarget` as SIX members. It has seven: `requireCreationOwner`
  // is a `boolean` PROPERTY, not a method, and a matcher keyed on the call shape
  // cannot see it. Rule 2 in miniature, and the document had the same six.
  if (typedef) return typedefMembers(typedef, sf);
  return {
    methods: decl!.members.filter(ts.isMethodSignature).map((m) => m.name.getText(sf)),
    properties: decl!.members.filter(ts.isPropertySignature).map((m) => m.name.getText(sf)),
  };
}

/**
 * The string-literal members of a union type alias, e.g. `CommandOutcome`.
 *
 * Reads both forms (frontend-standard Phase 4): `export type X = 'a' | 'b';`
 * in a `.ts` module, or `/** @typedef {'a' | 'b'} X *\/` in a converted `.js`
 * one. Read from the AST, never the text, so a member renamed or added in
 * either spelling moves the answer. THROWS when neither form declares the name
 * (`EMPTY-INPUT-REPORTS-CLEAN-01`); a non-literal member is reported by its
 * type text rather than dropped, so a widened union cannot read as unchanged.
 */
export function deriveUnionLiterals(program: ts.Program, filePath: string, name: string): string[] {
  const sf = program.getSourceFile(filePath);
  if (!sf) throw new Error(`C1 derivation: cannot read ${filePath}`);
  let type: ts.TypeNode | undefined;
  ts.forEachChild(sf, (n) => {
    if (ts.isTypeAliasDeclaration(n) && n.name.text === name) type = n.type;
  });
  if (!type) {
    const te = typedefIn(sf, name)?.typeExpression;
    // A `@typedef {object} X` + `@property` form is an object, never a union.
    if (te && !ts.isJSDocTypeLiteral(te)) type = te.type;
  }
  if (!type) throw new Error(`C1 derivation: \`${name}\` is not declared in ${filePath}`);
  while (ts.isParenthesizedTypeNode(type)) type = type.type;
  const parts = ts.isUnionTypeNode(type) ? type.types : [type];
  return parts.map((t) =>
    ts.isLiteralTypeNode(t) && ts.isStringLiteral(t.literal) ? t.literal.text : t.getText(sf),
  );
}

/**
 * The parameters of one METHOD of an interface or typedef, as `name: Type`
 * strings in declaration order — e.g. `['scope: QueryScope', 'correlationId: string']`.
 *
 * Reads both forms (frontend-standard Phase 4): a TS method signature, or a
 * JSDoc `@property {(…) => R} name`. THROWS when the owner is undeclared or the
 * member is absent or not method-shaped, so a removed method cannot read as an
 * empty parameter list.
 */
export function deriveMethodParams(
  program: ts.Program,
  filePath: string,
  ownerName: string,
  method: string,
): string[] {
  const sf = program.getSourceFile(filePath);
  if (!sf) throw new Error(`C1 derivation: cannot read ${filePath}`);
  let params: ts.NodeArray<ts.ParameterDeclaration> | undefined;
  const decl = interfaceIn(sf, ownerName);
  if (decl) {
    const m = decl.members.find((x) => ts.isMethodSignature(x) && x.name.getText(sf) === method);
    params = m && ts.isMethodSignature(m) ? m.parameters : undefined;
  } else {
    const tag = typedefIn(sf, ownerName);
    if (!tag) throw new Error(`C1 derivation: \`${ownerName}\` is not declared in ${filePath}`);
    const te = tag.typeExpression;
    const prop =
      te && ts.isJSDocTypeLiteral(te)
        ? te.jsDocPropertyTags?.find((p) => p.name.getText(sf) === method)
        : undefined;
    let t = prop?.typeExpression?.type;
    while (t && ts.isParenthesizedTypeNode(t)) t = t.type;
    params = t && (ts.isFunctionTypeNode(t) || ts.isJSDocFunctionType(t)) ? t.parameters : undefined;
  }
  if (!params) throw new Error(`C1 derivation: \`${ownerName}.${method}\` is not a method in ${filePath}`);
  return params.map((p) => `${p.name.getText(sf)}: ${p.type?.getText(sf) ?? '?'}`);
}

// ─── The DOCUMENT half ───────────────────────────────────────────────────────

/**
 * Spelled-out cardinals, so a contract can read like prose and still be pinned.
 *
 * ⚠️ A number written as a WORD is the one a count-guard never checks, because
 * no digit-matching regex sees it — `FLOOR-IN-PROSE-01` with better camouflage.
 * Both contracts use them ("exactly **two** carry it today"), so the pin maps
 * rather than parses, and fails loudly on a word it cannot map instead of
 * silently skipping the claim.
 */
export const NUMBER_WORDS: Readonly<Record<string, number>> = Object.freeze({
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6,
  seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12,
});

/** One `## ` section of the contract, heading included, up to the next `## `. */
export function section(doc: string, headingStartsWith: string): string {
  const lines = doc.split(/\r?\n/);
  const start = lines.findIndex((l) => l.startsWith('## ') && l.includes(headingStartsWith));
  if (start === -1) throw new Error(`C1 document: no section heading contains "${headingStartsWith}"`);
  const rest = lines.slice(start + 1).findIndex((l) => l.startsWith('## '));
  return lines.slice(start, rest === -1 ? undefined : start + 1 + rest).join('\n');
}

/** Every `` `identifier` `` in a string, in order, de-duplicated. */
export const backticked = (s: string): string[] => [
  ...new Set([...s.matchAll(/`([A-Za-z_][\w.]*)`/g)].map((m) => m[1])),
];

export interface DocIfaceRow {
  readonly iface: string;
  readonly count: number;
  readonly methods: readonly string[];
}

/** Rows of the Axis-1 table: `| \`IX\` | N | \`a\`, \`b\` |`. */
export function parseIfaceTable(sectionText: string): DocIfaceRow[] {
  const rows: DocIfaceRow[] = [];
  for (const line of sectionText.split(/\r?\n/)) {
    const m = line.match(/^\|\s*`(I\w+)`\s*\|\s*(\d+)\s*\|(.*)\|\s*$/);
    if (m) rows.push({ iface: m[1], count: Number(m[2]), methods: backticked(m[3]) });
  }
  return rows;
}

/** The `property: IInterface;` lines of the Axis-1 composition block. */
export function parseComposition(sectionText: string): { property: string; iface: string }[] {
  const out: { property: string; iface: string }[] = [];
  for (const line of sectionText.split(/\r?\n/)) {
    const m = line.match(/^\s{2}(\w+):\s*(I\w+);/);
    if (m) out.push({ property: m[1], iface: m[2] });
  }
  return out;
}

export interface DocFlowRow {
  readonly file: string;
  readonly entity: string;
  readonly count: number;
  readonly transitionIds: readonly string[];
  /** The wiring cell verbatim, and the boolean the contract actually claims. */
  readonly wiring: string;
  readonly claimsWired: boolean;
}

/**
 * Rows of the Axis-2 table: `| \`x.flow.js\` | \`entity\` | N | \`t_a\`, … | wiring |`.
 * Reads both forms (frontend-standard Phase 4): converted flows are `.flow.js`,
 * the forecast flows are still `.flow.ts`.
 */
export function parseFlowTable(sectionText: string): DocFlowRow[] {
  const rows: DocFlowRow[] = [];
  for (const line of sectionText.split(/\r?\n/)) {
    const m = line.match(
      /^\|\s*`([\w.]+\.flow\.[jt]s)`\s*\|\s*`(\w+)`\s*\|\s*(\d+)\s*\|([^|]*)\|([^|]*)\|/,
    );
    if (m) {
      rows.push({
        file: m[1],
        entity: m[2],
        count: Number(m[3]),
        transitionIds: backticked(m[4]),
        wiring: m[5].trim(),
        claimsWired: /\*\*wired\*\*/.test(m[5]),
      });
    }
  }
  return rows;
}

/** The `**TOTAL** | **N**` figure of a table, or `null` when the row is absent. */
export function parseTotal(sectionText: string): number | null {
  const m = sectionText.match(/^\|\s*\*\*TOTAL\*\*\s*\|[^|]*\|\s*\*\*(\d+)\*\*/m);
  if (m) return Number(m[1]);
  const m2 = sectionText.match(/^\|\s*\*\*TOTAL\*\*\s*\|\s*\*\*(\d+)\*\*/m);
  return m2 ? Number(m2[1]) : null;
}

/** The backticked identifiers on the single line that starts with `marker`. */
export function markedList(doc: string, marker: string): string[] {
  const line = doc.split(/\r?\n/).find((l) => l.trimStart().startsWith(marker));
  if (line === undefined) throw new Error(`C1 document: no line starts with "${marker}"`);
  return backticked(line);
}
