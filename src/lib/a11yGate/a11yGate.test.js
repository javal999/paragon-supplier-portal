// ────────────────────────────────────────────────────────────────────────────
// BL-31 · the source-level accessibility gate, run over the whole tree.
//
// Order is the house order (§42b): the POPULATION guard first — asserting
// MEMBERSHIP, never a count — then both directions of the probe on the same
// scanner, then the tree-wide result. A clean tree-wide result means nothing
// until the scanner has been shown to fire on the defect it exists for.
// ────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { isJsxFile } from '@test/sourceFiles';
/** @import { Finding } from './scan' */
import { scanSource } from './scan';

const SRC = join(__dirname, '..', '..');

/**
 * @param {string} dir
 * @returns {string[]}
 */
function tsxFiles(dir) {
  /** @type {string[]} */
  const out = [];
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) out.push(...tsxFiles(p));
    else if (isJsxFile(p) && !/\.(test|spec)\.[jt]sx$/.test(p)) out.push(p);
  }
  return out;
}

const FILES = tsxFiles(SRC);
/** @type {Finding[]} */
const seen = [];
/** @type {Finding[]} */
const findings = FILES.flatMap((f) => scanSource(relative(SRC, f), readFileSync(f, 'utf8'), seen));

describe('BL-31 a11y gate · POPULATION — nothing below means anything without this', () => {
  it('walks the real tree and reaches known members of both populations', () => {
    /** @param {Finding} s */
    const where = (s) => `${s.file} ${s.what}`;
    const sites = seen.map(where);
    // A known icon-only button that IS named: SidePanel's close (aria-label).
    expect(sites).toContain('components/ui-v2/SidePanel.jsx <button>');
    // A known text button: the Wizard's Cancel.
    expect(sites).toContain('components/ui-v2/Wizard.jsx <button>');
    // The known clickable raw row, repaired by BL-31.
    expect(sites).toContain('pages-v2/RolesCatalogue.jsx <tr onClick>');
    // A known selection row acquitted by its own checkbox.
    expect(sites).toContain('pages-v2/rfx/RfxInviteeStep.jsx <tr onClick>');
    // BL-84 — a known invalid field that now names its error.
    expect(sites).toContain(
      'pages-v2/SupplierRFQs/components/QuotePriceSection.jsx <input aria-invalid>'
    );
    // …and a known non-member: a field with no error state at all.
    expect(sites).not.toContain('pages/auth/Login.jsx <input aria-invalid>');
    // BL-322 — the control sites: the card's stretched button, and a TermTip
    // (a control that is not a literal <button>, which is the whole point).
    expect(sites).toContain('components/ui-v2/KpiCard.jsx <button>');
    expect(sites).toContain('components/ui-v2/TermLabel.jsx <TermTip>');
    // BL-326 — a known LITERAL description (a static binding, not `{…}`).
    expect(sites).toContain(
      'pages-v2/SupplierForecasts/components/ShipmentReportPanel.jsx <aria-describedby literal>'
    );
    // …and a known CONDITIONAL one (`refused ? 'id…' : …`), which BL-326 makes
    // decidable: the same-file check alone never examined this shape.
    expect(sites).toContain(
      'pages-v2/SupplierForecasts/components/ConfirmPanel.jsx <aria-describedby conditional>'
    );
  });
});

describe('BL-31 a11y gate · PROBE — fires on the defect, accepts the fix', () => {
  it('✅ an icon-only <button> with no name is a finding; the named twin is not', () => {
    const bad = `const C = () => <button type="button" onClick={f}><X size={16} /></button>;`;
    const good = `const C = () => <button type="button" aria-label={t('ui.closePanel')} onClick={f}><X size={16} /></button>;`;
    expect(scanSource('bad.tsx', bad).map((f) => f.what)).toEqual([
      'icon-only <button> has no accessible name'
    ]);
    expect(scanSource('good.tsx', good)).toEqual([]);
  });

  it('✅ <Button icon={X} /> with no children is a finding; with a label child it is not', () => {
    expect(
      scanSource('b.tsx', `const C = () => <Button variant="secondary" icon={Download} />;`)
    ).toHaveLength(1);
    expect(
      scanSource(
        'g.tsx',
        `const C = () => <Button variant="secondary" icon={Download}>{t('x.export')}</Button>;`
      )
    ).toEqual([]);
    expect(
      scanSource('g2.tsx', `const C = () => <Button icon={Download} title={t('x.export')} />;`)
    ).toEqual([]);
  });

  it('✅ an aria-hidden text child does not name a button', () => {
    expect(
      scanSource('h.tsx', `const C = () => <button><span aria-hidden="true">×</span></button>;`)
    ).toHaveLength(1);
  });

  it('✅ FIRES AT THE REAL DEFECT: the roles row exactly as main shipped it before BL-31', () => {
    // Verbatim from `RolesCatalogue.jsx` @ 9ad276a — a row whose click was the
    // only way into a role's page, with no tab stop and no key handler.
    const shipped = `
      const RoleRow = ({ role }) => (
        <tr
          className="border-t border-border-subtle hover:bg-bg-hover cursor-pointer"
          data-testid={\`role-row-\${role.id}\`}
          onClick={() => navigate(\`/buyer/roles/\${role.id}\`)}
        >
          <td className="py-3 px-4 align-middle">{role.id}</td>
        </tr>
      );`;
    const fixed = `
      const RoleRow = ({ role }) => (
        <tr onClick={open} {...rowActivation(open)}>
          <td>{role.id}</td>
        </tr>
      );`;
    expect(scanSource('shipped.tsx', shipped).map((f) => f.what)).toEqual([
      '<tr onClick> is not keyboard-operable'
    ]);
    expect(scanSource('fixed.tsx', fixed)).toEqual([]);
  });

  it('✅ only the shared helper acquits a row by spread; any other spread does not', () => {
    expect(
      scanSource('s.tsx', `const R = () => <tr onClick={f} {...rest}><td /></tr>;`)
    ).toHaveLength(1);
  });

  it('✅ a selection row that mirrors its own checkbox is acquitted; one with a text input is not', () => {
    const mirrors = `const R = () => <tr onClick={toggle}><td><input type="checkbox" aria-label={n} onChange={toggle} /></td></tr>;`;
    const notMirror = `const R = () => <tr onClick={open}><td><input type="text" /></td></tr>;`;
    expect(scanSource('m.tsx', mirrors)).toEqual([]);
    expect(scanSource('n.tsx', notMirror)).toHaveLength(1);
  });

  it('✅ BL-322: a control inside a control is a finding; siblings are not', () => {
    // The literal shape: the glossary (i) is a <button> rendered by TermTip.
    const bad = `const C = () => <button type="button" aria-label="Draft 1"><TermTip term="asnDraft">Draft</TermTip></button>;`;
    expect(scanSource('bad.tsx', bad).map((f) => f.what)).toEqual([
      'nested control: <TermTip> inside <button>'
    ]);
    // The fixed shape: one stretched button for the card, the label layer a
    // sibling outside it.
    const good = `const C = () => (
      <div>
        <button type="button" aria-label="Draft 1" />
        <div><TermLabel term="asnDraft" /></div>
      </div>
    );`;
    expect(scanSource('good.tsx', good)).toEqual([]);
    // A field inside a button is the same rule, not only one control component.
    expect(
      scanSource(
        'field.tsx',
        `const C = () => <button type="button" aria-label="x"><input /></button>;`
      ).map((f) => f.what)
    ).toEqual(['nested control: <input> inside <button>']);
    // An anchor with an href navigates; a plain <a name> is not a control.
    expect(
      scanSource('anchor.tsx', `const C = () => <a href="/x"><button type="button">x</button></a>;`)
    ).toHaveLength(1);
    expect(
      scanSource('named.tsx', `const C = () => <a name="x"><button type="button">x</button></a>;`)
    ).toEqual([]);
  });

  it('✅ FIRES AT THE REAL DEFECT: the KpiCard exactly as main shipped it before BL-322', () => {
    // Verbatim shape of `src/components/ui-v2/KpiCard.jsx` @ 04d096d0: the card
    // WAS a <button> and its children came from a `content` const held above it,
    // with the term's (i) inside. A scan of literal JSX children only would
    // report a clean tree here — `{content}` must be resolved.
    const shipped = `
      const KpiCard = ({ eyebrow, term, value, subtitle, icon: Icon, onClick, active = false }) => {
        const content = (
          <>
            {Icon ? <Icon size={18} className="absolute top-5 right-5 text-text-tertiary" /> : null}
            <div className="text-eyebrow text-text-tertiary uppercase">
              {term ? <TermLabel term={term} /> : eyebrow}
            </div>
            <div className="text-kpi font-mono tabular-nums text-data-navy mt-3">{value}</div>
            {subtitle ? <div className="text-meta text-text-secondary mt-2">{subtitle}</div> : null}
          </>
        );
        if (onClick) {
          return (
            <button type="button" onClick={onClick} aria-pressed={active}>
              {content}
            </button>
          );
        }
        return <div>{content}</div>;
      };`;
    expect(scanSource('shipped.jsx', shipped).map((f) => f.what)).toEqual([
      'nested control: <TermLabel> inside <button>'
    ]);
    // The control: the same file with the (i) outside the button is accepted.
    const fixed = shipped.replace(
      '<button type="button" onClick={onClick} aria-pressed={active}>\n              {content}\n            </button>',
      '<div>\n              <button type="button" onClick={onClick} aria-pressed={active} aria-label="card" />\n              {content}\n            </div>'
    );
    expect(fixed).not.toBe(shipped);
    expect(scanSource('fixed.jsx', fixed)).toEqual([]);
  });

  it('✅ BL-84: an invalid field with no aria-describedby is a finding; the wired twin is not', () => {
    const bad = `const F = () => <input aria-invalid={!ok} value={v} onChange={f} />;`;
    const good = `const F = () => <input aria-invalid={!ok} aria-describedby={errorId} value={v} onChange={f} />;`;
    expect(scanSource('bad.tsx', bad).map((f) => f.what)).toEqual([
      '<input aria-invalid> does not describe its error'
    ]);
    expect(scanSource('good.tsx', good)).toEqual([]);
    // A spread may carry the association, so it acquits — the same rule button
    // naming uses, and said out loud rather than discovered later.
    expect(scanSource('spread.tsx', `const F = () => <input aria-invalid {...rest} />;`)).toEqual(
      []
    );
    // A select and a textarea are the same rule, not only inputs.
    expect(scanSource('s.tsx', `const F = () => <select aria-invalid={!ok} />;`)).toHaveLength(1);
    expect(scanSource('t.tsx', `const F = () => <textarea aria-invalid={!ok} />;`)).toHaveLength(1);
  });

  it('✅ BL-326: a literal aria-describedby whose id the file never renders is a finding', () => {
    const bad = `const F = () => <input aria-invalid aria-describedby="qty-refusal" />;`;
    const good = `const F = () => (
      <>
        <input aria-invalid aria-describedby="qty-refusal" />
        <p id="qty-refusal">That is not a quantity.</p>
      </>
    );`;
    expect(scanSource('bad.tsx', bad).map((f) => f.what)).toEqual([
      'aria-describedby names "qty-refusal", which this file never renders'
    ]);
    expect(scanSource('good.tsx', good)).toEqual([]);
    // A space-separated pair needs BOTH ids; one alone does not acquit.
    const pair = `const F = () => (
      <>
        <input aria-invalid aria-describedby="hint refusal" />
        <p id="hint">Digits only.</p>
      </>
    );`;
    expect(scanSource('pair.tsx', pair).map((f) => f.what)).toEqual([
      'aria-describedby names "refusal", which this file never renders'
    ]);
  });

  it('✅ BL-326: a CONDITIONAL description is decided too — a missing id fails', () => {
    const good = `const F = ({ refused }) => (
      <>
        <input aria-invalid={refused} aria-describedby={refused ? 'qty-refusal' : undefined} />
        {refused && <p id="qty-refusal">That is not a quantity.</p>}
      </>
    );`;
    expect(scanSource('good.tsx', good)).toEqual([]);
    const bad = `const F = ({ refused }) => (
      <>
        <input aria-invalid={refused} aria-describedby={refused ? 'qty-refusal' : undefined} />
        <p>That is not a quantity.</p>
      </>
    );`;
    expect(scanSource('bad.tsx', bad).map((f) => f.what)).toEqual([
      'aria-describedby names "qty-refusal", which this file never renders'
    ]);
    // BOTH branches are read: the always-present hint alone does not acquit.
    const pair = `const F = ({ refused }) => (
      <>
        <input aria-invalid={refused} aria-describedby={refused ? 'qty-refusal qty-hint' : 'qty-hint'} />
        <p id="qty-hint">Digits only.</p>
      </>
    );`;
    expect(scanSource('pair.tsx', pair).map((f) => f.what)).toEqual([
      'aria-describedby names "qty-refusal", which this file never renders'
    ]);
    // An identifier or a template is not decided, and is said to be.
    expect(
      scanSource(
        'undecided.tsx',
        `const F = ({ refused, id }) => <input aria-invalid={refused} aria-describedby={refused ? id : undefined} />;`
      )
    ).toEqual([]);
  });

  it('✅ BL-326: the id must render in the SAME TREE as the field, not merely the file', () => {
    // KNOWN-GOOD: one tree — the field and its message co-render.
    const sameTree = `const F = ({ refused }) => (
      <div>
        <input aria-invalid={refused} aria-describedby={refused ? 'qty-refusal' : undefined} />
        {refused && <p id="qty-refusal">That is not a quantity.</p>}
      </div>
    );`;
    expect(scanSource('same.tsx', sameTree)).toEqual([]);
    // KNOWN-BAD: two exclusive returns of ONE component can never co-render.
    const otherTree = `const F = ({ refused }) => {
      if (refused) return <input aria-invalid aria-describedby="qty-refusal" />;
      return <p id="qty-refusal">That is not a quantity.</p>;
    };`;
    expect(scanSource('other.tsx', otherTree).map((f) => f.what)).toEqual([
      'aria-describedby names "qty-refusal", which does not render in the same tree'
    ]);
    // An id rendered ONLY by another component of the file is acquitted: a
    // parent this scan cannot see may render both (the stated limit).
    const across = `const Field = ({ refused }) => <input aria-invalid={refused} aria-describedby={refused ? 'qty-refusal' : undefined} />;
      const Refusal = () => <p id="qty-refusal">That is not a quantity.</p>;
      const Form = () => <div><Field refused /><Refusal /></div>;`;
    expect(scanSource('across.tsx', across)).toEqual([]);
    // A LOCAL component invoked in the field's tree, given the id as a literal
    // prop, is rendering it there — the FieldRefusal shape.
    const forwarded = `const Refusal = ({ testId, text }) => <div id={testId}>{text}</div>;
      const Field = ({ refused }) => (
        <div>
          <input aria-invalid={refused} aria-describedby={refused ? 'qty-refusal' : undefined} />
          <Refusal testId="qty-refusal" text="That is not a quantity." />
        </div>
      );`;
    expect(scanSource('forwarded.tsx', forwarded)).toEqual([]);
    // An id held in a const is acquitted: where the const is spliced is not
    // followed here, and the site may well be in this very tree.
    const held = `const Field = ({ refused }) => {
      const hint = <p id="qty-refusal">That is not a quantity.</p>;
      return (
        <div>
          <input aria-invalid={refused} aria-describedby={refused ? 'qty-refusal' : undefined} />
          {hint}
        </div>
      );
    };`;
    expect(scanSource('held.tsx', held)).toEqual([]);
  });

  it('✅ BL-326 FIRES AT THE REAL DEFECT: the shipped ConfirmPanel binding, refusal id deleted', () => {
    // The conditional pair ConfirmPanel really carries on `main`.
    const shipped = `const F = ({ qtyRefused }) => (
      <>
        <input aria-invalid={qtyRefused} aria-describedby={qtyRefused ? 'sdcsup-qty-refusal sdcsup-qty-hint' : 'sdcsup-qty-hint'} />
        {qtyRefused && <div id="sdcsup-qty-refusal" role="alert">{t('sdcSup.panel.qty.refused.empty')}</div>}
        <div id="sdcsup-qty-hint">{t('sdcSup.panel.qty.hint')}</div>
      </>
    );`;
    // The defect MR !151 shipped, reached by deleting the id from that pair:
    // the attribute stays, the description stops rendering.
    const mutant = shipped.replace(' id="sdcsup-qty-refusal"', '');
    expect(mutant).not.toBe(shipped);
    expect(scanSource('shipped.tsx', shipped)).toEqual([]);
    expect(scanSource('mutant.tsx', mutant).map((f) => f.what)).toEqual([
      'aria-describedby names "sdcsup-qty-refusal", which this file never renders'
    ]);
  });

  it('✅ BL-326 FIRES AT THE REAL DEFECT: the shipped ConfirmPanel pairing, id deleted', () => {
    // The literal pair ConfirmPanel @ 399bdc91 really carries.
    const shipped = `const F = () => (
      <>
        <input aria-invalid aria-describedby="sdcsup-qty-hint" />
        <div id="sdcsup-qty-hint">{t('sdcSup.panel.qty.hint')}</div>
      </>
    );`;
    const mutant = `const F = () => (
      <>
        <input aria-invalid aria-describedby="sdcsup-qty-hint" />
        <div>{t('sdcSup.panel.qty.hint')}</div>
      </>
    );`;
    expect(scanSource('shipped.tsx', shipped)).toEqual([]);
    expect(scanSource('mutant.tsx', mutant).map((f) => f.what)).toEqual([
      'aria-describedby names "sdcsup-qty-hint", which this file never renders'
    ]);
    // An unrelated id does not acquit — the name must match.
    const neighbour = `const F = () => (
      <>
        <input aria-invalid aria-describedby="sdcsup-qty-hint" />
        <div id="sdcsup-ship-qty-hint">{hint}</div>
      </>
    );`;
    expect(scanSource('neighbour.tsx', neighbour)).toHaveLength(1);
  });

  it('⚠️ SAID, NOT DISCOVERED: a CONDITIONAL binding is not decidable here', () => {
    // `aria-describedby={refused ? id : undefined}` may render `undefined` — the
    // static gate cannot tell, and does not claim to. Those controls are covered
    // by runtime page tests (stockEntryA11y, ResponseDocumentsSection,
    // quoteTermsSectionA11y, asnLinesA11y).
    expect(
      scanSource('c.tsx', `const F = () => <input aria-invalid aria-describedby={id} />;`)
    ).toEqual([]);
  });
});

describe('BL-31 a11y gate · THE TREE', () => {
  it('every icon-only button in src/ has an accessible name', () => {
    const f = findings.filter((x) => x.what.startsWith('icon-only'));
    expect(f, f.map((x) => `${x.file}:${x.line} ${x.what}`).join('\n')).toEqual([]);
  });

  it('every raw clickable <tr> in src/ is keyboard-operable', () => {
    const f = findings.filter((x) => x.what.startsWith('<tr'));
    expect(f, f.map((x) => `${x.file}:${x.line} ${x.what}`).join('\n')).toEqual([]);
  });

  it('every field marked aria-invalid in src/ describes its error (BL-84)', () => {
    const f = findings.filter((x) => x.what.includes('does not describe its error'));
    expect(f, f.map((x) => `${x.file}:${x.line} ${x.what}`).join('\n')).toEqual([]);
  });

  it('no interactive control is rendered inside another control (BL-322)', () => {
    const f = findings.filter((x) => x.what.startsWith('nested control'));
    expect(f, f.map((x) => `${x.file}:${x.line} ${x.what}`).join('\n')).toEqual([]);
  });

  it('every decidable aria-describedby in src/ names an id rendered in the same tree (BL-326)', () => {
    const f = findings.filter(
      (x) =>
        x.what.includes('which this file never renders') ||
        x.what.includes('which does not render in the same tree')
    );
    expect(f, f.map((x) => `${x.file}:${x.line} ${x.what}`).join('\n')).toEqual([]);
  });
});
