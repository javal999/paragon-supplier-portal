// ─────────────────────────────────────────────────────────────────────────────
// D-F · THE STORED-FIELD GATE — the derivation.
//
// ── WHY THIS EXISTS ─────────────────────────────────────────────────────────
//   `certBasis` and `requiredForHalalBrands` were deleted on 2026-08-12. Both
//   were stored fields on a compliance DTO, read by NOTHING, each carrying a
//   claim that disagreed with the tree around it — and **BOTH WERE FOUND BY A
//   HUMAN READING CAREFULLY.** Neither would have failed anything. This module
//   is the instrument that makes the next one fail a build.
//
//   THE RULE: every stored field on a glossary-covered DTO has at least one
//   NON-FIXTURE READER, or an allowlisted reason with that reason stated
//   (`allowlist.js`).
//
// ── ⚠️ ENTITY-QUALIFIED, WHICH IS THE WHOLE POINT ───────────────────────────
//   Seat 3's caveat, binding: *a reader census that matches FIELD NAMES rather
//   than ENTITY-QUALIFIED READS lets a name shared across entities mask an
//   unread field.* That is exactly how `materialCategory` nearly hid — eight
//   name hits, every one of them the RFQ entities' same-named field, ZERO
//   compliance-side readers.
//
//   So this census does not match names. It resolves every property access
//   through the TypeScript CHECKER and compares the resolved symbol's
//   DECLARATION against the population's declarations. `rfq.materialCategory`
//   and `entry.materialCategory` are different fields here because they are
//   different declarations, which is what they always were.
//
//   THE CAVEAT IS NOT MERELY AVOIDED, IT IS THE DOMINANT CLASS — most of what
//   this census flags shares its name with a declaration somewhere else in the
//   tree, and a name census would have cleared every one of those on the
//   strength of the other entity's reads. **The size of that class is not
//   restated here** (§27): `sharedNameWith` on each row IS the derivation, and
//   `storedFieldGate.test.js` reports it at read time.
//
// ── ⚠️ THE LIMITS, STATED HERE BECAUSE A CENSUS THAT HIDES ITS BLIND SPOTS IS
//    WORSE THAN NO CENSUS ─────────────────────────────────────────────────────
//   A read this instrument CANNOT see, and therefore may flag as absent:
//     1. DYNAMIC KEYS — `entry[k]` where `k` is a variable. Resolvable only for
//        string-literal arguments.
//     2. WHOLE-OBJECT CONSUMPTION — `{...entry}`, `JSON.stringify(entry)`,
//        `Object.entries(entry).map(…)`. A generic table that renders every key
//        DOES display the field; this census records no read for it. Deliberate:
//        "some renderer might print it" is exactly the claim `certBasis` could
//        have made for four documents.
//     3. TYPE-LEVEL REFERENCE — `Pick<T, 'scopeText'>`, `keyof T`. A field named
//        in a type operator is not a field anybody reads.
//   And a read it counts that you might not: a read anywhere in a NON-fixture
//   module counts, including one inside dead code. This gate answers "is it
//   read", not "is it reachable"; reachability is the R1/R3 instrument.
//
// ── WHAT IS NOT A READ ──────────────────────────────────────────────────────
//   An object-literal key (`{ certBasis: 'permanent' }`) is a STORE, never a
//   read — which is why a fixture module contributes zero reads by construction
//   rather than by path classification. An assignment target (`x.cause = c`) is
//   a write, counted separately and reported, because a field only ever written
//   is the exact shape this gate exists to catch.
// ─────────────────────────────────────────────────────────────────────────────
import ts from 'typescript';
import { relative } from 'node:path';
import { scriptKindOf } from '@test/sourceFiles';

/** One site where a field was read. */
/**
 * @typedef {{
 *   readonly file: string;
 *   readonly line: number;
 *   readonly kind: 'read' | 'destructure';
 * }} ReadSite
 */

/** One stored field in the derived population. */
/**
 * `key`:  `Owner.field` — the gate's stable key. `owner` is the named declaration  the field is DECLARED in, not every type that exposes it, so a field  reachable through four aliases (`GovernedCheckStampBase.checkId`) is one  row and not four.
 * `vocab`:  Glossary unions this field itself is typed by. Empty is normal — most  fields ride a covered DTO rather than carrying the vocabulary.
 * `exposedBy`:  The covered DTOs that expose this field.
 * `sharedNameWith`:  Other declarations in `src/` declaring a field of the SAME NAME — the  masking set a name-matching census would have collapsed into this one.
 *
 * @typedef {{
 *   readonly key: string;
 *   readonly owner: string;
 *   readonly field: string;
 *   readonly file: string;
 *   readonly vocab: readonly string[];
 *   readonly exposedBy: readonly string[];
 *   readonly sharedNameWith: readonly string[];
 *   readonly reads: readonly ReadSite[];
 *   readonly nonFixtureReads: readonly ReadSite[];
 *   readonly writes: number;
 * }} StoredField
 */

/**
 * `coveredTypes`:  The DTOs the glossary covers — derived, never listed.
 * `flagged`:  Fields with zero non-fixture reads. The gate's subject.
 *
 * @typedef {{
 *   readonly coveredTypes: readonly { readonly name: string; readonly file: string; readonly via: readonly string[] }[];
 *   readonly fields: readonly StoredField[];
 *   readonly flagged: readonly StoredField[];
 * }} Census
 */

/**
 * `vocabulary`:  The vocabulary. In the repo gate this is `GLOSSARY_REGISTRIES`' source  types — imported, never re-listed.
 * `root`:  Absolute path the reported file paths are relative to.
 * `isFixture`:  Which modules are fixtures/tests, whose reads do not count as consumers.
 *
 * @typedef {{
 *   readonly vocabulary: ReadonlySet<string>;
 *   readonly root: string;
 *   readonly isFixture: (path: string) => boolean;
 * }} DeriveOptions
 */

/**
 * FIXTURE AND TEST MODULES — reads here are not consumers.
 *
 * ⚠️ **`Mock*Service.ts` IS DELIBERATELY NOT A FIXTURE.** The in-memory services
 * ARE the read path today (`mockDataService` is the whole data layer), and
 * classifying them as fixtures would discard the tree's largest population of
 * genuine consumers — a widening that manufactures false accusations, which is
 * the failure mode heuristic rule 2 records. Only DATA lives behind this
 * predicate: fixture modules, seeds, test builders, and specs.
 *
 * ⚠️ **AND IT IS NOT LOAD-BEARING TODAY — DERIVED, NOT ASSUMED.** Every read this
 * predicate silences on the current tree is in a SPEC (`*.test.ts` /
 * `__tests__/`); no fixture, seed or builder module reads a population field at
 * all. That is not luck, it is the object-literal rule above: a data module
 * STORES and never reads, so it contributes nothing to silence. The judgement
 * calls in this predicate — chiefly `*Seed.ts`, which holds logic as well as
 * data — therefore decide nothing at present. They are kept because the day one
 * of them starts reading is the day the question becomes real, and a predicate
 * written then would be written to fit the answer.
 * @param {string} path
 * @returns {boolean}
 */
export function isFixturePath(path) {
  return (
    /\.test\.[jt]sx?$/.test(path) ||
    /(^|\/)__tests__\//.test(path) ||
    /(^|\/)fixtures?(\/|\.)/i.test(path) ||
    /Fixtures?\.[jt]s$/.test(path) ||
    /Seed\.[jt]s$/.test(path) ||
    /^src\/test\//.test(path) ||
    /^src\/services\/testing\//.test(path) ||
    /^src\/data\/mock[A-Z]/.test(path)
  );
}

// ⚠️ A NAMED DECLARATION IN EITHER FORM (frontend-standard Phase 4): the
// TypeScript `interface` / `type` / `class`, or the JSDoc `@typedef` a converted
// `.js` file declares the same DTO with. Reading only the TypeScript form
// dropped every DTO in a converted folder from the population, and the
// bilateral allowlist check reported `TolerancePctOutcome.pct` as a field that
// "no longer exists" — it did, as `@typedef {…} TolerancePctOutcome`.
/**
 * @typedef {| ts.InterfaceDeclaration
 *   | ts.ClassDeclaration
 *   | ts.TypeAliasDeclaration
 *   | ts.JSDocTypedefTag} Named
 */
/**
 * @param {ts.Node} n
 * @returns {n is Named}
 */
const isNamed = (n) =>
  ts.isInterfaceDeclaration(n) ||
  ts.isClassDeclaration(n) ||
  ts.isTypeAliasDeclaration(n) ||
  ts.isJSDocTypedefTag(n);

/**
 * The name node of a named declaration — a `@typedef` may omit it.
 * @param {Named} n
 * @returns {ts.Identifier | undefined}
 */
const nameOf = (n) => (n.name && ts.isIdentifier(n.name) ? n.name : undefined);

/**
 * Walk `node` AND every JSDoc comment attached to it. `forEachChild` never
 * enters a comment, so a walk without this cannot see a `@typedef` or its
 * `@property` tags.
 *
 * ⚠️ `node.jsDoc`, NOT `ts.getJSDocCommentsAndTags(node)`: the public helper
 * returns only the LAST comment above a statement, and a converted file stacks
 * several typedefs above one.
 * @param {ts.Node} node
 * @param {(n: ts.Node) => void} cb
 * @returns {void}
 */
function walkWithJsDoc(node, cb) {
  /**
   * @param {ts.Node} n
   * @returns {void}
   */
  const visit = (n) => {
    cb(n);
    for (const doc of /** @type {{ jsDoc?: readonly ts.JSDoc[] }} */ (n).jsDoc ?? []) visit(doc);
    n.forEachChild(visit);
  };
  visit(node);
}

/** A field declaration in either form: `a: T` (TypeScript or a JSDoc type
 * @param {ts.Node} n
 * @returns {n is ts.PropertySignature | ts.PropertyDeclaration | ts.JSDocPropertyTag}
 *  literal), a class property, or `@property {T} a`. */
const isFieldDecl = (n) =>
  ts.isPropertySignature(n) || ts.isPropertyDeclaration(n) || ts.isJSDocPropertyTag(n);

/**
 * The declared type node of a field, in either form.
 * @param {ts.Declaration} decl
 * @returns {ts.TypeNode | undefined}
 */
const typeNodeOf = (decl) =>
  ts.isJSDocPropertyTag(decl)
    ? decl.typeExpression?.type
    : /** @type {ts.PropertySignature | ts.PropertyDeclaration} */ (decl).type;

/**
 * @param {ts.Type} t
 * @returns {readonly ts.Type[]}
 */
const partsOf = (t) => (t.isUnion() || t.isIntersection() ? t.types : [t]);

/**
 * Which glossary unions does this property's type name?
 *
 * ⚠️ **BOTH HALVES, AND THE SECOND ONE WAS EARNED.** Reading the CHECKER's alias
 * symbol alone is correct for `certType: CertType` and WRONG for `reason?:
 * QtyRefusalReason`: an optional property's type is widened to `… | undefined`,
 * a fresh union whose `aliasSymbol` is gone and whose constituents are the bare
 * string literals. Building this on the checker alone gained 17 DTOs and
 * SILENTLY LOST 5 — heuristic rule 2, on this instrument, during its first
 * hour: widening creates blind spots exactly as readily as narrowing does.
 * Reading the declared TYPE NODE alone is the mirror error — it cannot see a
 * field inherited through `extends`, an intersection, or a mapped type. So both
 * are read and unioned, and `deriveCensus` is probed in both directions.
 * @param {ts.Type} propType
 * @param {ts.TypeNode | undefined} typeNode
 * @param {ReadonlySet<string>} vocabulary
 * @returns {string[]}
 */
function vocabularyOf(propType, typeNode, vocabulary) {
  const found = /** @type {Set<string>} */ (new Set());
  /**
   * @param {ts.Type} t
   * @returns {void}
   */
  const takeAlias = (t) => {
    const alias = t.aliasSymbol?.name;
    if (alias && vocabulary.has(alias)) found.add(alias);
  };
  takeAlias(propType);
  for (const c of partsOf(propType)) takeAlias(c);
  if (typeNode) {
    /**
     * @param {ts.Node} n
     * @returns {void}
     */
    const walk = (n) => {
      if (
        ts.isTypeReferenceNode(n) &&
        ts.isIdentifier(n.typeName) &&
        vocabulary.has(n.typeName.text)
      ) {
        found.add(n.typeName.text);
      }
      n.forEachChild(walk);
    };
    walk(typeNode);
  }
  return [...found];
}

/**
 * The nearest named declaration a property is written inside.
 * @param {ts.Node} decl
 * @returns {string | null}
 */
function ownerOf(decl) {
  for (let n = /** @type {ts.Node | undefined} */ (decl.parent); n; n = n.parent) {
    if (isNamed(n)) {
      const name = nameOf(n);
      if (name) return name.text;
    }
  }
  return null;
}

/**
 * DERIVE THE POPULATION AND THE VERDICTS.
 *
 * The population is derived in one direction only: glossary registries →
 * covered DTOs → their stored fields. Nothing here is listed, so a DTO that
 * starts speaking the vocabulary joins the population with no edit, and a field
 * added to a covered DTO is under the gate the moment it is written.
 * @param {ts.Program} program
 * @param {DeriveOptions} opts
 * @returns {Census}
 */
export function deriveCensus(program, opts) {
  const checker = program.getTypeChecker();
  const root = opts.root.replace(/\\/g, '/');
  /**
   * @param {string} p
   * @returns {string}
   */
  const rel = (p) => relative(root, p).replace(/\\/g, '/');

  const sources = program
    .getSourceFiles()
    .filter((f) => !f.isDeclarationFile && rel(f.fileName).startsWith('src/'));

  /**
   * @param {ts.Type} t
   * @returns {boolean}
   */
  const isMethodLike = (t) => checker.getSignaturesOfType(t, ts.SignatureKind.Call).length > 0;

  // ── every property declaration in src, by name: the masking set ───────────
  const declsByName = /** @type {Map<string, Set<string>>} */ (new Map());
  // Reads both the TypeScript and the JSDoc form (frontend-standard Phase 4).
  for (const f of sources) {
    walkWithJsDoc(f, (n) => {
      if (isFieldDecl(n) && n.name && ts.isIdentifier(n.name)) {
        const owner = ownerOf(n);
        if (owner) {
          const set = declsByName.get(n.name.text) ?? /** @type {Set<string>} */ (new Set());
          set.add(owner);
          declsByName.set(n.name.text, set);
        }
      }
    });
  }

  // ── pass 1: covered DTOs and the field declarations they expose ───────────
  /**
   * @typedef {{
   *   readonly decl: ts.Declaration;
   *   readonly file: string;
   *   readonly vocab: string[];
   *   readonly exposedBy: Set<string>;
   * }} Entry
   */
  const byKey = /** @type {Map<string, Entry>} */ (new Map());
  /** @type {{ name: string; file: string; via: string[] }[]} */
  const coveredTypes = [];

  for (const f of sources) {
    // The candidates are the file's top-level named declarations in BOTH forms:
    // its statements, and every `@typedef` in a JSDoc comment anywhere in it
    // (frontend-standard Phase 4). In a `.ts` file the checker ignores a
    // `@typedef`, so `getSymbolAtLocation` returns nothing and it drops out.
    /** @type {Named[]} */
    const candidates = [];
    f.forEachChild((node) => {
      if (isNamed(node)) candidates.push(node);
    });
    walkWithJsDoc(f, (n) => {
      if (ts.isJSDocTypedefTag(n)) candidates.push(n);
    });
    for (const node of candidates) {
      const nodeName = nameOf(node);
      if (!nodeName) continue;
      const sym = checker.getSymbolAtLocation(nodeName);
      if (!sym) continue;
      /** @type {ts.Type} */
      let declared;
      try {
        declared = checker.getDeclaredTypeOfSymbol(sym);
      } catch {
        continue;
      }
      // Union type aliases expose only their COMMON properties through
      // getPropertiesOfType, so the constituents are walked individually — a
      // refusal arm's `reason` lives on one arm and would vanish otherwise.
      const props = /** @type {Map<string, ts.Symbol>} */ (new Map());
      for (const c of partsOf(declared)) {
        for (const p of checker.getPropertiesOfType(c))
          if (!props.has(p.name)) props.set(p.name, p);
      }
      if (props.size === 0) continue;

      /** @type {{ key: string; decl: ts.Declaration; file: string; vocab: string[] }[]} */
      const collected = [];
      /** @type {string[]} */
      const via = [];
      for (const p of props.values()) {
        const decl = p.declarations?.[0];
        if (!decl) continue;
        const file = rel(decl.getSourceFile().fileName);
        // Only fields DECLARED in our own source. This is what keeps a props
        // interface extending React.HTMLAttributes from dragging several
        // hundred DOM attributes into the population.
        if (!file.startsWith('src/') || decl.getSourceFile().isDeclarationFile) continue;
        if (ts.isMethodSignature(decl) || ts.isMethodDeclaration(decl)) continue;
        const propType = checker.getTypeOfSymbolAtLocation(p, decl);
        if (isMethodLike(propType)) continue;
        const typeNode = typeNodeOf(decl);
        const vocab = vocabularyOf(propType, typeNode, opts.vocabulary);
        if (vocab.length > 0) via.push(`${p.name}:${vocab.join('|')}`);
        collected.push({ key: `${ownerOf(decl) ?? nodeName.text}.${p.name}`, decl, file, vocab });
      }
      if (via.length === 0) continue;

      coveredTypes.push({ name: nodeName.text, file: rel(f.fileName), via });
      for (const c of collected) {
        const existing = byKey.get(c.key);
        if (existing) existing.exposedBy.add(nodeName.text);
        else
          byKey.set(c.key, {
            decl: c.decl,
            file: c.file,
            vocab: c.vocab,
            exposedBy: new Set([nodeName.text])
          });
      }
    }
  }

  // ── pass 2: the entity-qualified reader census ────────────────────────────
  const keyByDecl = /** @type {Map<ts.Declaration, string>} */ (new Map());
  for (const [key, e] of byKey) keyByDecl.set(e.decl, key);
  const fieldNames = new Set([...byKey.keys()].map((k) => k.slice(k.lastIndexOf('.') + 1)));

  const reads = /** @type {Map<string, ReadSite[]>} */ (new Map());
  const writes = /** @type {Map<string, number>} */ (new Map());

  /**
   * @param {ts.Symbol | undefined} sym
   * @returns {string | null}
   */
  const resolve = (sym) => {
    for (const d of sym?.declarations ?? []) {
      const key = keyByDecl.get(d);
      if (key) return key;
    }
    return null;
  };
  // `ts.isAssignmentOperator` exists at run time but is not on the public
  // typings, and the spec-typecheck gate says so — the SyntaxKind range is the
  // supported spelling of the same question.
  /**
   * @param {ts.Node} n
   * @returns {boolean}
   */
  const isWriteTarget = (n) =>
    ts.isBinaryExpression(n.parent) &&
    n.parent.left === n &&
    n.parent.operatorToken.kind >= ts.SyntaxKind.FirstAssignment &&
    n.parent.operatorToken.kind <= ts.SyntaxKind.LastAssignment;

  for (const f of sources) {
    const file = rel(f.fileName);
    /**
     * @param {string} key
     * @param {ts.Node} n
     * @param {ReadSite['kind']} kind
     * @returns {void}
     */
    const note = (key, n, kind) => {
      if (isWriteTarget(n)) {
        writes.set(key, (writes.get(key) ?? 0) + 1);
        return;
      }
      const { line } = f.getLineAndCharacterOfPosition(n.getStart());
      const sites = reads.get(key) ?? [];
      sites.push({ file, line: line + 1, kind });
      reads.set(key, sites);
    };
    /**
     * @param {ts.Node} n
     * @returns {void}
     */
    const visit = (n) => {
      if (
        ts.isPropertyAccessExpression(n) &&
        ts.isIdentifier(n.name) &&
        fieldNames.has(n.name.text)
      ) {
        const key = resolve(checker.getSymbolAtLocation(n.name));
        if (key) note(key, n, 'read');
      } else if (
        ts.isElementAccessExpression(n) &&
        n.argumentExpression &&
        ts.isStringLiteralLike(n.argumentExpression) &&
        fieldNames.has(n.argumentExpression.text)
      ) {
        const key = resolve(checker.getSymbolAtLocation(n.argumentExpression));
        if (key) note(key, n, 'read');
      } else if (ts.isBindingElement(n) && ts.isObjectBindingPattern(n.parent)) {
        const name =
          n.propertyName && ts.isIdentifier(n.propertyName)
            ? n.propertyName.text
            : ts.isIdentifier(n.name)
              ? n.name.text
              : null;
        if (name && fieldNames.has(name)) {
          const t = checker.getTypeAtLocation(n.parent);
          for (const c of partsOf(t)) {
            const key = resolve(checker.getPropertyOfType(c, name));
            if (key) {
              note(key, n, 'destructure');
              break;
            }
          }
        }
      }
      n.forEachChild(visit);
    };
    visit(f);
  }

  // ── verdicts ──────────────────────────────────────────────────────────────
  /** @type {StoredField[]} */
  const fields = [...byKey.entries()]
    .map(([key, e]) => {
      const field = key.slice(key.lastIndexOf('.') + 1);
      const owner = key.slice(0, key.lastIndexOf('.'));
      const all = reads.get(key) ?? [];
      return {
        key,
        owner,
        field,
        file: e.file,
        vocab: e.vocab,
        exposedBy: [...e.exposedBy].sort(),
        sharedNameWith: [...(declsByName.get(field) ?? [])].filter((o) => o !== owner).sort(),
        reads: all,
        nonFixtureReads: all.filter((r) => !opts.isFixture(r.file)),
        writes: writes.get(key) ?? 0
      };
    })
    .sort((a, b) => (a.file + a.key).localeCompare(b.file + b.key));

  return {
    coveredTypes: coveredTypes.sort((a, b) => (a.file + a.name).localeCompare(b.file + b.name)),
    fields,
    flagged: fields.filter((f) => f.nonFixtureReads.length === 0)
  };
}

/**
 * Build the program the repo gate reads.
 * @param {string} root
 * @returns {ts.Program}
 */
export function buildRepoProgram(root, tsconfig = 'tsconfig.vitest.json') {
  const normalized = root.replace(/\\/g, '/');
  const configPath = `${normalized}/${tsconfig}`;
  const raw = ts.readConfigFile(configPath, ts.sys.readFile);
  if (raw.error)
    throw new Error(`cannot read ${tsconfig}: ${/** @type {string} */ (raw.error.messageText)}`);
  const parsed = ts.parseJsonConfigFileContent(raw.config, ts.sys, normalized);
  return ts.createProgram(parsed.fileNames, { ...parsed.options, noEmit: true });
}

/**
 * Build a program from source strings — the harness the self-probe uses.
 *
 * ⚠️ **THE ONLY WAY RULE 4 CAN BE HONOURED HERE.** A gate is habitually probed
 * in one direction — "does it catch the bad thing?" — so a gate that is wrong
 * about what it should ACCEPT ships looking like a working gate. The repo tree
 * cannot supply a known-bad input without planting a defect in `src/`, and it
 * cannot supply a controlled known-good one at all. This can supply both, in
 * the same program, and `storedFieldGate.test.js` asserts the good one PASSES
 * before it believes the bad one FAILED.
 * @param {Readonly<Record<string, string>>} files
 * @returns {ts.Program}
 */
export function buildProgramFromSources(files) {
  // `allowJs` + `checkJs`: the harness reads both the TypeScript and the JSDoc
  // form, as `tsconfig.json` does for the real tree (frontend-standard Phase 4).
  // Without them a `.js` synthetic file is silently dropped from the program.
  /** @type {ts.CompilerOptions} */
  const options = {
    noLib: true,
    strict: true,
    noEmit: true,
    target: ts.ScriptTarget.ES2020,
    allowJs: true,
    checkJs: true
  };
  const sourceFiles = /** @type {Map<string, ts.SourceFile>} */ (new Map());
  for (const [name, text] of Object.entries(files)) {
    sourceFiles.set(
      name,
      ts.createSourceFile(name, text, ts.ScriptTarget.ES2020, true, scriptKindOf(name))
    );
  }
  /** @type {ts.CompilerHost} */
  const host = {
    getSourceFile: (name) => sourceFiles.get(name),
    getDefaultLibFileName: () => 'lib.d.ts',
    writeFile: () => undefined,
    getCurrentDirectory: () => '/',
    getCanonicalFileName: (n) => n,
    useCaseSensitiveFileNames: () => true,
    getNewLine: () => '\n',
    fileExists: (name) => sourceFiles.has(name),
    readFile: (name) => files[name]
  };
  return ts.createProgram([...sourceFiles.keys()], options, host);
}
