// Slide engine for the two Supplier Portal user guides (complete and supplier only).
// Content lives in content-*.cjs; this file only draws. Layout copies the 6 Oct 2026 deck:
// 13.33 x 7.5 in, Cambria titles, Calibri body, navy PTI badge, teal SUPPLIER badge.
const path = require('path');
const fs = require('fs');

let PptxGenJS;
try {
  PptxGenJS = require('pptxgenjs');
} catch {
  console.error('pptxgenjs not found. Run: npm i --prefix /tmp/ugdeps pptxgenjs@3.12.0 and set NODE_PATH=/tmp/ugdeps/node_modules');
  process.exit(1);
}

const ASSETS = path.join(__dirname, 'assets');
const SCREENS = path.join(__dirname, '..', 'screens');

const COL = {
  ink: '1A1A1A',
  navy: '1E4080',
  pti: '2B5BA8',
  sup: '0E7C7B',
  ptiSoft: 'EAF0FB',
  supSoft: 'E2F1F0',
  mid: '5A6472',
  line: 'D0D5DD',
  panel: 'F5F6F8',
  white: 'FFFFFF',
  amber: '8A5606',
  amberSoft: 'FEF3D6'
};
const HEAD = 'Cambria';
const BODY = 'Calibri';
const W = 13.333;

const ACTOR = {
  PTI: { label: 'PTI', fill: COL.pti },
  SUP: { label: 'SUPPLIER', fill: COL.sup }
};

function text(slide, str, o) {
  slide.addText(str, { isTextBox: true, fontFace: BODY, color: COL.ink, margin: 0, valign: 'top', ...o });
}

function frame(pres, s, deck, n) {
  const slide = pres.addSlide();
  slide.background = { color: COL.white };
  if (s.kicker) text(slide, s.kicker.toUpperCase(), { x: 0.6, y: 0.32, w: 11.5, h: 0.28, fontSize: 11, bold: true, color: COL.pti, charSpacing: 1.5 });
  if (s.title) text(slide, s.title, { x: 0.6, y: 0.62, w: 12.1, h: 0.75, fontSize: 30, fontFace: HEAD, valign: 'middle' });
  slide.addImage({ path: path.join(ASSETS, 'paragon-logo-dark.png'), x: 0.6, y: 7.02, w: 1.03, h: 0.18 });
  text(slide, `${deck.footer} · ${n}`, { x: 7.7, y: 6.98, w: 5.03, h: 0.26, fontSize: 9, color: COL.mid, align: 'right' });
  if (s.notes) slide.addNotes(s.notes);
  return slide;
}

function badge(slide, actor, x, y) {
  const a = ACTOR[actor];
  slide.addShape('roundRect', { x, y, w: 0.95, h: 0.28, fill: { color: a.fill }, line: { color: a.fill }, rectRadius: 0.06 });
  text(slide, a.label, { x, y, w: 0.95, h: 0.28, fontSize: 9, bold: true, color: COL.white, align: 'center', valign: 'middle' });
}

function shot(slide, s, box, deck) {
  const file = s.shot && path.join(SCREENS, s.shot);
  // deck.screenshots stays false until the screens are retaken on the frozen labels
  if (file && fs.existsSync(file) && deck.screenshots && !s.placeholder) {
    slide.addShape('rect', { ...box, fill: { color: COL.white }, line: { color: COL.line, width: 0.75 } });
    slide.addImage({ path: file, x: box.x + 0.02, y: box.y + 0.02, w: box.w - 0.04, h: box.h - 0.04, sizing: { type: 'contain', w: box.w - 0.04, h: box.h - 0.04 }, altText: `Portal screen: ${s.shot}` });
    return;
  }
  slide.addShape('rect', { ...box, fill: { color: COL.panel }, line: { color: COL.line, width: 1, dashType: 'dash' } });
  text(slide, 'SCREENSHOT PLACEHOLDER', { x: box.x + 0.4, y: box.y + 0.45, w: box.w - 0.8, h: 0.3, fontSize: 11, bold: true, color: COL.mid, charSpacing: 1.5 });
  text(slide, s.shot || 'No file name yet', { x: box.x + 0.4, y: box.y + 0.85, w: box.w - 0.8, h: 0.35, fontSize: 16, bold: true, fontFace: HEAD });
  const lines = [
    { text: 'Route  ', options: { bold: true } }, { text: s.route || '–', options: { breakLine: true } },
    { text: 'Seat  ', options: { bold: true } }, { text: s.seat || '–', options: { breakLine: true } },
    { text: 'Demo record  ', options: { bold: true } }, { text: s.record || '–', options: { breakLine: true } },
    { text: ' ', options: { breakLine: true } },
    { text: 'Retaken after prod is redeployed from the main that holds the frozen term labels (BL-233).', options: { italic: true, color: COL.mid } }
  ];
  text(slide, lines, { x: box.x + 0.4, y: box.y + 1.4, w: box.w - 0.8, h: box.h - 1.8, fontSize: 13, paraSpaceAfter: 4 });
}

function stepSlide(pres, s, deck, n) {
  const slide = frame(pres, s, deck, n);
  shot(slide, s, { x: 0.6, y: 1.65, w: 7.1, h: 4.75 }, deck);
  const X = 8.0;
  const RW = 4.73;
  text(slide, [{ text: 'Menu  ', options: { bold: true, color: COL.mid } }, { text: s.menu, options: { bold: true } }], { x: X, y: 1.6, w: RW, h: 0.5, fontSize: 12 });
  const boxTop = s.test ? 4.7 : 5.6;
  const statusTop = s.statusAfter ? boxTop : 6.4;
  const k = s.steps.length;
  const gap = Math.min(0.9, (statusTop - 2.25) / k);
  const fsz = gap < 0.62 ? 11.5 : 12.5;
  let y = 2.25;
  s.steps.forEach((st, i) => {
    slide.addShape('ellipse', { x: X, y, w: 0.32, h: 0.32, fill: { color: COL.white }, line: { color: COL.navy, width: 1 } });
    text(slide, String(i + 1), { x: X, y, w: 0.32, h: 0.32, fontSize: 11, bold: true, align: 'center', valign: 'middle', color: COL.navy });
    badge(slide, st.actor, X + 0.42, y + 0.02);
    text(slide, st.text, { x: X + 1.47, y: y - 0.02, w: RW - 1.47, h: gap - 0.04, fontSize: fsz });
    y += gap;
  });
  if (s.statusAfter) {
    slide.addShape('rect', { x: X, y: boxTop, w: RW, h: 0.75, fill: { color: COL.ptiSoft }, line: { color: COL.ptiSoft } });
    text(slide, [{ text: 'STATUS AFTER', options: { bold: true, fontSize: 9, color: COL.navy, breakLine: true } }, { text: s.statusAfter, options: { fontSize: 11 } }], { x: X + 0.13, y: boxTop + 0.07, w: RW - 0.26, h: 0.64 });
  }
  if (s.test) {
    slide.addShape('rect', { x: X, y: 5.55, w: RW, h: 0.85, fill: { color: COL.amberSoft }, line: { color: COL.amberSoft } });
    text(slide, [{ text: `TEST TASK ${s.testId || ''}`.trim() + '  ', options: { bold: true, fontSize: 9, color: COL.amber, breakLine: true } }, { text: s.test, options: { fontSize: 11 } }], { x: X + 0.13, y: 5.61, w: RW - 0.26, h: 0.76 });
  }
}

function tableSlide(pres, s, deck, n) {
  const slide = frame(pres, s, deck, n);
  const head = s.columns.map((c) => ({ text: c, options: { bold: true, color: COL.white, fill: { color: COL.navy } } }));
  const rows = s.rows.map((r) => r.map((c) => (typeof c === 'string' ? { text: c } : c)));
  const fs2 = s.fontSize || (s.rows.length > 12 ? 10.5 : s.rows.length > 8 ? 12 : 13);
  slide.addTable([head, ...rows], {
    x: 0.6, y: s.intro ? 2.0 : 1.6, w: 12.13, colW: s.colW, fontFace: BODY, fontSize: fs2, color: COL.ink,
    border: { type: 'solid', pt: 0.5, color: COL.line }, valign: 'middle', margin: [4, 6, 4, 6], autoPage: false
  });
  if (s.intro) text(slide, s.intro, { x: 0.6, y: 1.45, w: 12.1, h: 0.45, fontSize: 13, color: COL.mid });
  if (s.caption) text(slide, s.caption, { x: 0.6, y: 6.55, w: 12.1, h: 0.35, fontSize: 10.5, italic: true, color: COL.mid });
}

function titleSlide(pres, s, deck, n) {
  const slide = pres.addSlide();
  slide.background = { color: COL.navy };
  slide.addImage({ path: path.join(ASSETS, 'paragon-logo-white.png'), x: 0.6, y: 0.55, w: 1.9, h: 0.45 });
  text(slide, s.title, { x: 0.6, y: 2.3, w: 11.5, h: 1.0, fontSize: 40, fontFace: HEAD, color: COL.white, valign: 'middle' });
  text(slide, s.subtitle, { x: 0.6, y: 3.35, w: 11.5, h: 0.6, fontSize: 20, color: COL.white });
  text(slide, s.meta, { x: 0.6, y: 5.6, w: 11.5, h: 0.8, fontSize: 12, color: 'D6E0F2' });
  if (s.notes) slide.addNotes(s.notes);
}

function cardsSlide(pres, s, deck, n) {
  // 2 to 4 numbered cards, then optional legend and footnote
  const slide = frame(pres, s, deck, n);
  if (s.intro) text(slide, s.intro, { x: 0.6, y: 1.45, w: 12.1, h: 0.45, fontSize: 13, color: COL.mid });
  const k = s.cards.length;
  const cw = (12.13 - 0.3 * (k - 1)) / k;
  const ch = s.cardH || 2.2;
  s.cards.forEach((c, i) => {
    const x = 0.6 + i * (cw + 0.3);
    slide.addShape('roundRect', { x, y: 2.05, w: cw, h: ch, fill: { color: COL.panel }, line: { color: COL.panel }, rectRadius: 0.08 });
    slide.addShape('ellipse', { x: x + 0.25, y: 2.3, w: 0.42, h: 0.42, fill: { color: c.actor ? ACTOR[c.actor].fill : COL.navy }, line: { color: COL.white } });
    text(slide, c.mark || String(i + 1), { x: x + 0.25, y: 2.3, w: 0.42, h: 0.42, fontSize: 13, bold: true, color: COL.white, align: 'center', valign: 'middle' });
    text(slide, c.head, { x: x + 0.25, y: 2.85, w: cw - 0.5, h: 0.45, fontSize: 16, fontFace: HEAD, bold: true });
    text(slide, c.body, { x: x + 0.25, y: 3.32, w: cw - 0.5, h: ch - 1.35, fontSize: 12, color: COL.mid });
  });
  let y = 2.05 + ch + 0.35;
  (s.legend || []).forEach((l) => {
    badge(slide, l.actor, 0.6, y);
    text(slide, l.text, { x: 1.75, y: y - 0.02, w: 10.9, h: 0.34, fontSize: 12, valign: 'middle' });
    y += 0.42;
  });
  if (s.footnote) text(slide, s.footnote, { x: 0.6, y: Math.max(y + 0.1, 6.35), w: 12.1, h: 0.4, fontSize: 11, italic: true, color: COL.mid });
}

function overviewSlide(pres, s, deck, n) {
  const slide = frame(pres, s, deck, n);
  text(slide, s.purpose, { x: 0.6, y: 1.45, w: 12.1, h: 0.6, fontSize: 13 });
  let x = 0.6;
  (s.menus || []).forEach((m) => {
    badge(slide, m.actor, x, 2.15);
    text(slide, m.text, { x: x + 1.05, y: 2.13, w: 4.9, h: 0.32, fontSize: 11, valign: 'middle' });
    x += 6.1;
  });
  const lanes = s.lanes.sup && s.lanes.sup.length && s.lanes.pti && s.lanes.pti.length ? ['pti', 'sup'] : s.lanes.pti && s.lanes.pti.length ? ['pti'] : ['sup'];
  const top = 2.65;
  const lh = lanes.length === 2 ? 1.65 : 2.2;
  const all = [...(s.lanes.pti || []), ...(s.lanes.sup || [])];
  const maxN = Math.max(...all.map((b) => b.n));
  const bw = Math.min(1.45, (11.0 - 0.15 * (maxN - 1)) / maxN);
  const pos = {};
  lanes.forEach((ln, li) => {
    const y = top + li * lh;
    slide.addShape('rect', { x: 0.6, y, w: 12.13, h: lh - 0.05, fill: { color: ln === 'pti' ? COL.ptiSoft : COL.supSoft }, line: { color: COL.white } });
    text(slide, ln === 'pti' ? 'PTI' : 'SUPPLIER', { x: 0.75, y, w: 1.0, h: lh - 0.05, fontSize: 10, bold: true, color: ln === 'pti' ? COL.pti : COL.sup, valign: 'middle' });
    s.lanes[ln].forEach((b) => {
      const bx = 1.7 + (b.n - 1) * (bw + 0.15);
      const by = y + (lh - 0.05 - 0.95) / 2;
      pos[b.n] = { x: bx, y: by, lane: li };
      slide.addShape('roundRect', { x: bx, y: by, w: bw, h: 0.95, fill: { color: COL.white }, line: { color: ln === 'pti' ? COL.pti : COL.sup, width: 1 }, rectRadius: 0.06 });
      text(slide, [{ text: `${b.n}  `, options: { bold: true, color: ln === 'pti' ? COL.pti : COL.sup } }, { text: b.label }], { x: bx + 0.07, y: by + 0.06, w: bw - 0.14, h: 0.85, fontSize: 11 });
    });
  });
  // handoff arrows between consecutive steps in different lanes
  for (let i = 1; i < maxN; i++) {
    const a = pos[i];
    const b = pos[i + 1];
    if (a && b && a.lane !== b.lane) {
      const down = b.lane > a.lane;
      slide.addShape('line', { x: a.x + bw / 2, y: down ? a.y + 0.95 : b.y + 0.95, w: Math.max(0.01, b.x - a.x), h: down ? b.y - a.y - 0.95 : a.y - b.y - 0.95, flipV: !down, line: { color: COL.mid, width: 1, dashType: 'dash', endArrowType: 'triangle' } });
    }
  }
  if (s.caption) text(slide, s.caption, { x: 0.6, y: top + lanes.length * lh + 0.1, w: 12.1, h: 0.5, fontSize: 11, color: COL.mid });
}

function sectionSlide(pres, s, deck, n) {
  const slide = pres.addSlide();
  slide.background = { color: COL.navy };
  text(slide, s.kicker.toUpperCase(), { x: 0.6, y: 2.4, w: 11, h: 0.35, fontSize: 12, bold: true, color: 'D6E0F2', charSpacing: 2 });
  text(slide, s.title, { x: 0.6, y: 2.85, w: 11.5, h: 0.9, fontSize: 34, fontFace: HEAD, color: COL.white });
  if (s.body) text(slide, s.body, { x: 0.6, y: 3.85, w: 11, h: 1.4, fontSize: 15, color: COL.white });
  text(slide, `${deck.footer} · ${n}`, { x: 7.7, y: 6.98, w: 5.03, h: 0.26, fontSize: 9, color: 'D6E0F2', align: 'right' });
  if (s.notes) slide.addNotes(s.notes);
}

function listSlide(pres, s, deck, n) {
  // one column of short items, each with a bold lead
  const slide = frame(pres, s, deck, n);
  if (s.intro) text(slide, s.intro, { x: 0.6, y: 1.45, w: 12.1, h: 0.45, fontSize: 13, color: COL.mid });
  const runs = [];
  s.items.forEach((it, i) => {
    runs.push({ text: it.lead + '  ', options: { bold: true, bullet: true } });
    runs.push({ text: it.text, options: { breakLine: i < s.items.length - 1 } });
  });
  text(slide, runs, { x: 0.6, y: 2.05, w: 12.1, h: 4.7, fontSize: s.fontSize || 14, paraSpaceAfter: 9 });
}

const DRAW = { title: titleSlide, step: stepSlide, table: tableSlide, cards: cardsSlide, overview: overviewSlide, section: sectionSlide, list: listSlide };

async function build(deck, outFile) {
  const pres = new PptxGenJS();
  pres.layout = 'LAYOUT_WIDE';
  pres.title = deck.docTitle;
  pres.author = 'Paragon Supplier Hub team';
  pres.theme = { headFontFace: HEAD, bodyFontFace: BODY };
  deck.slides.forEach((s, i) => {
    const fn = DRAW[s.type];
    if (!fn) throw new Error(`unknown slide type ${s.type}`);
    fn(pres, s, deck, i + 1);
  });
  await pres.writeFile({ fileName: outFile });
  return deck.slides.length;
}

module.exports = { build };
