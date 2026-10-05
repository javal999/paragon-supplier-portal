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
import { scanSource, type Finding } from './scan';

const SRC = join(__dirname, '..', '..');

function tsxFiles(dir: string): string[] {
  const out: string[] = [];
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) out.push(...tsxFiles(p));
    else if (isJsxFile(p) && !/\.(test|spec)\.[jt]sx$/.test(p)) out.push(p);
  }
  return out;
}

const FILES = tsxFiles(SRC);
const seen: Finding[] = [];
const findings: Finding[] = FILES.flatMap((f) =>
  scanSource(relative(SRC, f), readFileSync(f, 'utf8'), seen),
);

describe('BL-31 a11y gate · POPULATION — nothing below means anything without this', () => {
  it('walks the real tree and reaches known members of both populations', () => {
    const where = (s: Finding) => `${s.file} ${s.what}`;
    const sites = seen.map(where);
    // A known icon-only button that IS named: SidePanel's close (aria-label).
    expect(sites).toContain('components/ui-v2/SidePanel.jsx <button>');
    // A known text button: the Wizard's Cancel.
    expect(sites).toContain('components/ui-v2/Wizard.jsx <button>');
    // The known clickable raw row, repaired by BL-31.
    expect(sites).toContain('pages-v2/RolesCatalogue.tsx <tr onClick>');
    // A known selection row acquitted by its own checkbox.
    expect(sites).toContain('pages-v2/rfx/RfxInviteeStep.tsx <tr onClick>');
  });
});

describe('BL-31 a11y gate · PROBE — fires on the defect, accepts the fix', () => {
  it('✅ an icon-only <button> with no name is a finding; the named twin is not', () => {
    const bad = `const C = () => <button type="button" onClick={f}><X size={16} /></button>;`;
    const good = `const C = () => <button type="button" aria-label={t('ui.closePanel')} onClick={f}><X size={16} /></button>;`;
    expect(scanSource('bad.tsx', bad).map((f) => f.what)).toEqual([
      'icon-only <button> has no accessible name',
    ]);
    expect(scanSource('good.tsx', good)).toEqual([]);
  });

  it('✅ <Button icon={X} /> with no children is a finding; with a label child it is not', () => {
    expect(scanSource('b.tsx', `const C = () => <Button variant="secondary" icon={Download} />;`)).toHaveLength(1);
    expect(scanSource('g.tsx', `const C = () => <Button variant="secondary" icon={Download}>{t('x.export')}</Button>;`)).toEqual([]);
    expect(scanSource('g2.tsx', `const C = () => <Button icon={Download} title={t('x.export')} />;`)).toEqual([]);
  });

  it('✅ an aria-hidden text child does not name a button', () => {
    expect(
      scanSource('h.tsx', `const C = () => <button><span aria-hidden="true">×</span></button>;`),
    ).toHaveLength(1);
  });

  it('✅ FIRES AT THE REAL DEFECT: the roles row exactly as main shipped it before BL-31', () => {
    // Verbatim from `RolesCatalogue.tsx` @ 9ad276a — a row whose click was the
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
      '<tr onClick> is not keyboard-operable',
    ]);
    expect(scanSource('fixed.tsx', fixed)).toEqual([]);
  });

  it('✅ only the shared helper acquits a row by spread; any other spread does not', () => {
    expect(scanSource('s.tsx', `const R = () => <tr onClick={f} {...rest}><td /></tr>;`)).toHaveLength(1);
  });

  it('✅ a selection row that mirrors its own checkbox is acquitted; one with a text input is not', () => {
    const mirrors = `const R = () => <tr onClick={toggle}><td><input type="checkbox" aria-label={n} onChange={toggle} /></td></tr>;`;
    const notMirror = `const R = () => <tr onClick={open}><td><input type="text" /></td></tr>;`;
    expect(scanSource('m.tsx', mirrors)).toEqual([]);
    expect(scanSource('n.tsx', notMirror)).toHaveLength(1);
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
});
