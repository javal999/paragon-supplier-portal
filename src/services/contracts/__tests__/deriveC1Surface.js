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
//   agreeing and `c1MethodSurface.contract.test.js` says so by name instead of
//   silently under-reporting.
// ─────────────────────────────────────────────────────────────────────────────

import ts from 'typescript';

// ─── The TREE half ───────────────────────────────────────────────────────────

/**
 * @typedef {object} DerivedSubService
 * @property {string} property -  The property name on `IDataService`, e.g. `procurement`.
 * @property {string} iface -  The interface it is typed as, e.g. `IProcurementService`.
 * @property {readonly string[]} methods -  Method names, in declaration order.
 * @property {boolean} halvesAgree -  False when the NODE and CHECKER halves disagree — see the header.
 */

/**
 * @typedef {object} DerivedSurface
 * @property {readonly DerivedSubService[]} subServices
 * @property {readonly string[]} topLevelMethods -  Methods declared directly on `IDataService`, e.g. `getCapabilities`.
 * @property {number} subMethodTotal
 * @property {number} grandTotal
 */

/**
 * @param {ts.SourceFile} sf
 * @param {string} name
 * @returns {ts.InterfaceDeclaration | undefined}
 */
const interfaceIn = (sf, name) => {
  /** @type {ts.InterfaceDeclaration | undefined} */
  let found;
  ts.forEachChild(sf, (n) => {
    if (ts.isInterfaceDeclaration(n) && n.name.text === name) found = n;
  });
  return found;
};

/**
 * Method names as the DECLARATION states them — blind to `extends`.
 * @param {ts.InterfaceDeclaration} decl
 * @param {ts.SourceFile} sf
 * @returns {string[]}
 */
const nodeMethods = (decl, sf) =>
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
 * @param {ts.InterfaceDeclaration | ts.JSDocTypedefTag} decl
 * @param {ts.TypeChecker} checker
 * @returns {string[]}
 */
const checkerMethods = (decl, checker) =>
  checker
    .getPropertiesOfType(checker.getTypeAtLocation(decl))
    .filter((s) =>
      s.declarations?.some(
        (d) =>
          ts.isMethodSignature(d) ||
          (ts.isJSDocPropertyTag(d) && isFunctionTypeNode(d.typeExpression?.type))
      )
    )
    .map((s) => s.getName());

/**
 * Every sub-service of `IDataService` and every method on it, from the AST.
 *
 * Throws rather than returning empty when the root interface is absent —
 * `EMPTY-INPUT-REPORTS-CLEAN-01`: a derivation that examined nothing must never
 * be able to hand back a clean-looking answer.
 * @param {ts.Program} program
 * @param {string} typesPath
 * @returns {DerivedSurface}
 */
export function deriveServiceSurface(program, typesPath) {
  const sf = program.getSourceFile(typesPath);
  if (!sf) throw new Error(`C1 derivation: cannot read ${typesPath}`);
  const checker = program.getTypeChecker();

  // Reads both forms (frontend-standard Phase 4): `interface IDataService` in a
  // `.ts` module, or `@typedef {object} IDataService` + `@property` tags in the
  // converted `types.js`. Still THROWS when neither declares it.
  const root = interfaceIn(sf, 'IDataService') ?? typedefIn(sf, 'IDataService');
  if (!root) throw new Error('C1 derivation: `IDataService` is not declared in the types module');

  /** @type {DerivedSubService[]} */
  const subServices = [];
  /** @type {string[]} */
  const topLevelMethods = [];

  // One row per root member, either form: a method name, or a property name
  // with the text of its declared type. Classification is the interface's —
  // a method signature (or a function-typed `@property`) is a METHOD; any other
  // typed member is a sub-service PROPERTY.
  /** @type {({ kind: 'method'; name: string } | { kind: 'property'; name: string; type: string })[]} */
  const rootMembers = [];
  if (ts.isInterfaceDeclaration(root)) {
    for (const member of root.members) {
      if (ts.isMethodSignature(member))
        rootMembers.push({ kind: 'method', name: member.name.getText(sf) });
      else if (ts.isPropertySignature(member) && member.type) {
        rootMembers.push({
          kind: 'property',
          name: member.name.getText(sf),
          type: member.type.getText(sf)
        });
      }
    }
  } else {
    const { methods, properties } = typedefMembers(root, sf);
    const tags = ts.isJSDocTypeLiteral(
      /** @type {NonNullable<typeof root.typeExpression>} */ (root.typeExpression)
    )
      ? (root.typeExpression.jsDocPropertyTags ?? [])
      : [];
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
        halvesAgree: false
      });
      continue;
    }

    const viaNode = ts.isInterfaceDeclaration(decl)
      ? nodeMethods(decl, sf)
      : typedefMembers(decl, sf).methods;
    const viaChecker = checkerMethods(decl, checker);
    const same =
      viaNode.length === viaChecker.length &&
      [...viaNode].sort().join() === [...viaChecker].sort().join();

    subServices.push({
      property: member.name,
      iface,
      // The checker half is authoritative for MEMBERSHIP (it sees inherited
      // members); the node half supplies declaration ORDER, which reads better
      // in the document. They agree today, and `halvesAgree` is asserted.
      methods: same ? viaNode : [...new Set([...viaNode, ...viaChecker])],
      halvesAgree: same
    });
  }

  const subMethodTotal = subServices.reduce((n, s) => n + s.methods.length, 0);
  return {
    subServices,
    topLevelMethods,
    subMethodTotal,
    grandTotal: subMethodTotal + topLevelMethods.length
  };
}

/**
 * The `&#64;typedef` named `name`, wherever its JSDoc comment hangs in the file.
 *
 * Reads both forms (frontend-standard Phase 4): after the TS → JS conversion an
 * `interface X { … }` is written `/** &#64;typedef {object} X  &#64;property … *\/`.
 * JSDoc hangs off the node it documents (a trailing typedef hangs off the
 * end-of-file token) and is not reached by `forEachChild`, so every node's
 * `jsDoc` is visited explicitly — all of a node's comments, not just the last.
 * @param {ts.SourceFile} sf
 * @param {string} name
 * @returns {ts.JSDocTypedefTag | undefined}
 */
function typedefIn(sf, name) {
  /** @type {ts.JSDocTypedefTag | undefined} */
  let found;
  /**
   * @param {ts.Node} n
   * @returns {void}
   */
  const visit = (n) => {
    for (const doc of /** @type {{ jsDoc?: ts.JSDoc[] }} */ (n).jsDoc ?? []) {
      for (const tag of doc.tags ?? []) {
        if (
          ts.isJSDocTypedefTag(tag) &&
          tag.name &&
          ts.isIdentifier(tag.name) &&
          tag.name.text === name
        ) {
          found ??= tag;
        }
      }
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);
  return found;
}

/**
 * A JSDoc `&#64;property {T}` is method-shaped exactly when `T` is a function type.
 * @param {ts.TypeNode | undefined} t
 * @returns {boolean}
 */
function isFunctionTypeNode(t) {
  let u = t;
  while (u && (ts.isParenthesizedTypeNode(u) || u.kind === ts.SyntaxKind.JSDocOptionalType)) {
    u = /** @type {ts.ParenthesizedTypeNode | ts.JSDocOptionalType} */ (u).type;
  }
  return !!u && (ts.isFunctionTypeNode(u) || ts.isJSDocFunctionType(u));
}

/**
 * The members a typedef declares, split as `deriveInterfaceMembers` splits an
 * interface's. Two typedef shapes reach here:
 *   - `&#64;typedef {object} X` + `&#64;property` tags → a `JSDocTypeLiteral`. A tag
 *     whose type is a function type (`{(id: string) => string}`) is the JSDoc
 *     spelling of a METHOD signature; any other type is a PROPERTY.
 *   - `&#64;typedef {{ … }} X` or `&#64;typedef {Base & { … }} X` → TS type-literal
 *     members, classified exactly as an interface's are. Like the interface
 *     read (`nodeMethods`), only the members WRITTEN here count: a named base
 *     in an intersection is the `extends` clause, and is not followed.
 * @param {ts.JSDocTypedefTag} tag
 * @param {ts.SourceFile} sf
 * @returns {{ methods: string[]; properties: string[] }}
 */
function typedefMembers(tag, sf) {
  /** @type {string[]} */
  const methods = [];
  /** @type {string[]} */
  const properties = [];
  const te = tag.typeExpression;
  if (te && ts.isJSDocTypeLiteral(te)) {
    for (const p of te.jsDocPropertyTags ?? []) {
      (isFunctionTypeNode(p.typeExpression?.type) ? methods : properties).push(p.name.getText(sf));
    }
  } else if (te) {
    /** @type {ts.TypeLiteralNode[]} */
    const literals = [];
    /**
     * @param {ts.TypeNode} t
     * @returns {void}
     */
    const collect = (t) => {
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
}

/**
 * Every member of an interface, split by kind — used for `CommandTarget`.
 *
 * Reads both forms (frontend-standard Phase 4): a TS `interface`, or a JSDoc
 * `@typedef` in a converted `.js` file. Still THROWS when neither declares the
 * name — `EMPTY-INPUT-REPORTS-CLEAN-01`.
 * @param {ts.Program} program
 * @param {string} filePath
 * @param {string} ifaceName
 * @returns {{ readonly methods: readonly string[]; readonly properties: readonly string[] }}
 */
export function deriveInterfaceMembers(program, filePath, ifaceName) {
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
    methods: /** @type {NonNullable<typeof decl>} */ (decl).members
      .filter(ts.isMethodSignature)
      .map((m) => m.name.getText(sf)),
    properties: /** @type {NonNullable<typeof decl>} */ (decl).members
      .filter(ts.isPropertySignature)
      .map((m) => m.name.getText(sf))
  };
}

/**
 * The string-literal members of a union type alias, e.g. `CommandOutcome`.
 *
 * Reads both forms (frontend-standard Phase 4): `export type X = 'a' | 'b';`
 * in a `.ts` module, or `/** &#64;typedef {'a' | 'b'} X *\/` in a converted `.js`
 * one. Read from the AST, never the text, so a member renamed or added in
 * either spelling moves the answer. THROWS when neither form declares the name
 * (`EMPTY-INPUT-REPORTS-CLEAN-01`); a non-literal member is reported by its
 * type text rather than dropped, so a widened union cannot read as unchanged.
 * @param {ts.Program} program
 * @param {string} filePath
 * @param {string} name
 * @returns {string[]}
 */
export function deriveUnionLiterals(program, filePath, name) {
  const sf = program.getSourceFile(filePath);
  if (!sf) throw new Error(`C1 derivation: cannot read ${filePath}`);
  /** @type {ts.TypeNode | undefined} */
  let type;
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
    ts.isLiteralTypeNode(t) && ts.isStringLiteral(t.literal) ? t.literal.text : t.getText(sf)
  );
}

/**
 * The parameters of one METHOD of an interface or typedef, as `name: Type`
 * strings in declaration order — e.g. `['scope: QueryScope', 'correlationId: string']`.
 *
 * Reads both forms (frontend-standard Phase 4): a TS method signature, or a
 * JSDoc `&#64;property {(…) => R} name`. THROWS when the owner is undeclared or the
 * member is absent or not method-shaped, so a removed method cannot read as an
 * empty parameter list.
 * @param {ts.Program} program
 * @param {string} filePath
 * @param {string} ownerName
 * @param {string} method
 * @returns {string[]}
 */
export function deriveMethodParams(program, filePath, ownerName, method) {
  const sf = program.getSourceFile(filePath);
  if (!sf) throw new Error(`C1 derivation: cannot read ${filePath}`);
  /** @type {ts.NodeArray<ts.ParameterDeclaration> | undefined} */
  let params;
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
    params =
      t && (ts.isFunctionTypeNode(t) || ts.isJSDocFunctionType(t)) ? t.parameters : undefined;
  }
  if (!params)
    throw new Error(`C1 derivation: \`${ownerName}.${method}\` is not a method in ${filePath}`);
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
 * @type {Readonly<Record<string, number>>}
 */
export const NUMBER_WORDS = Object.freeze({
  zero: 0,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12
});

/**
 * One `## ` section of the contract, heading included, up to the next `## `.
 * @param {string} doc
 * @param {string} headingStartsWith
 * @returns {string}
 */
export function section(doc, headingStartsWith) {
  const lines = doc.split(/\r?\n/);
  const start = lines.findIndex((l) => l.startsWith('## ') && l.includes(headingStartsWith));
  if (start === -1)
    throw new Error(`C1 document: no section heading contains "${headingStartsWith}"`);
  const rest = lines.slice(start + 1).findIndex((l) => l.startsWith('## '));
  return lines.slice(start, rest === -1 ? undefined : start + 1 + rest).join('\n');
}

/**
 * Every `` `identifier` `` in a string, in order, de-duplicated.
 * @param {string} s
 * @returns {string[]}
 */
export const backticked = (s) => [
  ...new Set([...s.matchAll(/`([A-Za-z_][\w.]*)`/g)].map((m) => m[1]))
];

/**
 * @typedef {object} DocIfaceRow
 * @property {string} iface
 * @property {number} count
 * @property {readonly string[]} methods
 */

/**
 * Rows of the Axis-1 table: `| \`IX\` | N | \`a\`, \`b\` |`.
 * @param {string} sectionText
 * @returns {DocIfaceRow[]}
 */
export function parseIfaceTable(sectionText) {
  /** @type {DocIfaceRow[]} */
  const rows = [];
  for (const line of sectionText.split(/\r?\n/)) {
    const m = line.match(/^\|\s*`(I\w+)`\s*\|\s*(\d+)\s*\|(.*)\|\s*$/);
    if (m) rows.push({ iface: m[1], count: Number(m[2]), methods: backticked(m[3]) });
  }
  return rows;
}

/**
 * The `property: IInterface;` lines of the Axis-1 composition block.
 * @param {string} sectionText
 * @returns {{ property: string; iface: string }[]}
 */
export function parseComposition(sectionText) {
  /** @type {{ property: string; iface: string }[]} */
  const out = [];
  for (const line of sectionText.split(/\r?\n/)) {
    const m = line.match(/^\s{2}(\w+):\s*(I\w+);/);
    if (m) out.push({ property: m[1], iface: m[2] });
  }
  return out;
}

/**
 * @typedef {object} DocFlowRow
 * @property {string} file
 * @property {string} entity
 * @property {number} count
 * @property {readonly string[]} transitionIds
 * @property {string} wiring -  The wiring cell verbatim, and the boolean the contract actually claims.
 * @property {boolean} claimsWired
 */

/**
 * Rows of the Axis-2 table: `| \`x.flow.js\` | \`entity\` | N | \`t_a\`, … | wiring |`.
 * Reads both forms (frontend-standard Phase 4): converted flows are `.flow.js`,
 * the forecast flows are still `.flow.ts`.
 * @param {string} sectionText
 * @returns {DocFlowRow[]}
 */
export function parseFlowTable(sectionText) {
  /** @type {DocFlowRow[]} */
  const rows = [];
  for (const line of sectionText.split(/\r?\n/)) {
    const m = line.match(
      /^\|\s*`([\w.]+\.flow\.[jt]s)`\s*\|\s*`(\w+)`\s*\|\s*(\d+)\s*\|([^|]*)\|([^|]*)\|/
    );
    if (m) {
      rows.push({
        file: m[1],
        entity: m[2],
        count: Number(m[3]),
        transitionIds: backticked(m[4]),
        wiring: m[5].trim(),
        claimsWired: /\*\*wired\*\*/.test(m[5])
      });
    }
  }
  return rows;
}

/**
 * The `**TOTAL** | **N**` figure of a table, or `null` when the row is absent.
 * @param {string} sectionText
 * @returns {number | null}
 */
export function parseTotal(sectionText) {
  const m = sectionText.match(/^\|\s*\*\*TOTAL\*\*\s*\|[^|]*\|\s*\*\*(\d+)\*\*/m);
  if (m) return Number(m[1]);
  const m2 = sectionText.match(/^\|\s*\*\*TOTAL\*\*\s*\|\s*\*\*(\d+)\*\*/m);
  return m2 ? Number(m2[1]) : null;
}

/**
 * The backticked identifiers on the single line that starts with `marker`.
 * @param {string} doc
 * @param {string} marker
 * @returns {string[]}
 */
export function markedList(doc, marker) {
  const line = doc.split(/\r?\n/).find((l) => l.trimStart().startsWith(marker));
  if (line === undefined) throw new Error(`C1 document: no line starts with "${marker}"`);
  return backticked(line);
}
