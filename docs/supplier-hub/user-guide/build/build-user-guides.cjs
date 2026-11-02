// Builds both user-guide decks from content-complete.cjs (version A) and content-supplier.cjs (version B).
// Usage, from the repo root:  NODE_PATH=<dir holding pptxgenjs@3.12.0>/node_modules node docs/supplier-hub/user-guide/build/build-user-guides.cjs
const path = require('path');
const { build } = require('./engine.cjs');

const OUT = path.join(__dirname, '..');
const decks = [
  [require('./content-complete.cjs'), 'Paragon-Supplier-Portal-User-Guide.pptx'],
  [require('./content-supplier.cjs'), 'Paragon-Supplier-Portal-User-Guide-Supplier.pptx'],
  [require('./content-mom.cjs'), 'SC-Hub-MoM-Updates-07-14-28-Oct.pptx']
];

(async () => {
  for (const [deck, file] of decks) {
    const n = await build(deck, path.join(OUT, file));
    console.log(`${file}: ${n} slides`);
  }
})();
