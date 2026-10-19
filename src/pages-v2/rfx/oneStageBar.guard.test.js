// BL-220 — ONE stage-bar component for the RFQ, RFI and RFP event pages.
// Lane 1C built the RFQ's `EventStageBar`; wave 2 copied it as `RfxStageBar`
// for the RFI and RFP. The copy is gone: the three pages render `RfxStageBar`.
//
// The population is DERIVED: every shipped .jsx that renders a step list (an
// element carrying `aria-current={… 'step' …}`) under the RFx stage header
// (`'rfx.stage.label'`). Exactly one file may. (Steps alone match five other
// step strips — wizards, lessons, the forecast cycle — which are not this bar.)
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { isJsxFile } from '@test/sourceFiles';

const SRC = join(process.cwd(), 'src');

/**
 * @param {string} dir
 * @param {string[]} [out]
 * @returns {string[]}
 */
function shippedJsx(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) shippedJsx(full, out);
    else if (isJsxFile(name) && !name.includes('.test.')) out.push(full);
  }
  return out;
}

/** @param {string} source */
const rendersStageSteps = (source) =>
  /aria-current=\{[^}]*'step'/.test(source) && source.includes("'rfx.stage.label'");

describe('BL-220 — one stage bar', () => {
  it('exactly one shipped component renders stage steps, and it is RfxStageBar', () => {
    const renderers = shippedJsx(SRC)
      .filter((f) => rendersStageSteps(readFileSync(f, 'utf8')))
      .map((f) => relative(SRC, f).split('\\').join('/'));
    expect(renderers).toEqual(['pages-v2/rfx/RfxStageBar.jsx']);
  });

  it('KNOWN-BAD — the matcher fires on the deleted copy’s shape', () => {
    const copy = `t('rfx.stage.label'); <li aria-current={state === 'current' ? 'step' : undefined} />`;
    expect(rendersStageSteps(copy)).toBe(true);
    // …and not on a step strip outside the RFx stage bar, nor on the status bar's header.
    expect(rendersStageSteps(`<li aria-current={i === 0 ? 'step' : undefined} />`)).toBe(false);
    expect(rendersStageSteps(`t('rfx.stage.label')`)).toBe(false);
    expect(existsSync(join(SRC, 'pages-v2/BuyerSourcingEvent/components/EventStageBar.jsx'))).toBe(
      false
    );
  });

  it.each([
    'pages-v2/BuyerSourcingEvent/index.jsx',
    'pages-v2/BuyerRfiEvent.jsx',
    'pages-v2/BuyerRfp/BuyerRfpEvent.jsx'
  ])('%s renders RfxStageBar', (page) => {
    const source = readFileSync(join(SRC, page), 'utf8');
    expect(source).toMatch(/import RfxStageBar from '[./]+\/?(rfx\/)?RfxStageBar'/);
    expect(source).toContain('<RfxStageBar');
  });
});
