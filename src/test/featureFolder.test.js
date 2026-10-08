// @vitest-environment node
// featureFolder — membership both ways, before any spec trusts what it reads
// (CLAUDE.md, "Deriving a population", rule 1 and "probe the guard both ways").
import { describe, it, expect } from 'vitest';
import { join } from 'node:path';
import {
  GR_WIZARD_DIR,
  folderFiles,
  globFolderEntries,
  globFolderSource,
  readSource
} from './featureFolder';

const SRC = join(__dirname, '..');
const WIZARD = join(SRC, 'components', 'v2-features', 'GRInspectionWizard');

/** @type {Record<string, string>} */
const GLOB = import.meta.glob('/src/components/v2-features/**/*.{js,jsx}', {
  query: '?raw',
  import: 'default',
  eager: true
});

describe('featureFolder — the split GR wizard is read whole, and only it', () => {
  it('fs: every file of the wizard is a member, its sibling spec is not', () => {
    const rel = folderFiles(WIZARD).map((f) => f.slice(WIZARD.length + 1).replace(/\\/g, '/'));
    // Known-true members, one per kind of file the split produced.
    for (const f of [
      'index.jsx',
      'utils.js',
      'const.js',
      'hooks/useInspectionDraft.js',
      'hooks/useCompleteReceipt.js',
      'components/QualityStep.jsx'
    ])
      expect(rel).toContain(f);
    // Known-false: nothing outside the folder, no spec.
    expect(rel.every((f) => !f.includes('..') && !/\.test\./.test(f))).toBe(true);
    const text = readSource(WIZARD);
    expect(text).toContain('bpomOf(');
    expect(text).toContain('settleGR.mutateAsync(');
    expect(text).not.toContain("describe('GRInspectionWizard");
  });

  it('fs: a plain file reads as itself, and a folder without an index is refused', () => {
    expect(readSource(join(SRC, 'test', 'featureFolder.js'))).toContain('export const readSource');
    // `components/v2-features` holds no index — reading it would hand a spec an
    // unrelated set of files, so it throws instead of returning a big string.
    expect(() => readSource(join(SRC, 'components', 'v2-features'))).toThrow(/no index/);
  });

  it('glob: the same members, specs excluded, and an absent folder throws', () => {
    const paths = globFolderEntries(GLOB, GR_WIZARD_DIR).map(([p]) => p);
    expect(paths).toContain(`${GR_WIZARD_DIR}index.jsx`);
    expect(paths).toContain(`${GR_WIZARD_DIR}hooks/useInspectionDraft.js`);
    expect(paths).not.toContain('/src/components/v2-features/GRInspectionWizard.test.jsx');
    expect(paths.every((p) => p.startsWith(GR_WIZARD_DIR))).toBe(true);
    // fs and glob agree on the population.
    expect(paths.length).toBe(folderFiles(WIZARD).length);
    expect(globFolderSource(GLOB, GR_WIZARD_DIR)).toContain('const GRInspectionWizard =');
    expect(() => globFolderSource(GLOB, '/src/components/v2-features/NoSuchFolder/')).toThrow(
      /no index/
    );
  });
});
