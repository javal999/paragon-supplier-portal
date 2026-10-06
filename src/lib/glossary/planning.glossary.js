// ─────────────────────────────────────────────────────────────────────────────
// THE PLANNING VOCABULARY, DEFINED. EN + ID, exhaustiveness-pinned.
//
// Forecast UX phase 1, task A4 (F-09). These are the words the forecast pages
// put in front of a Material Planner without explaining them: the zones of a
// published plan (Firm, Trade-off), the plan-movement measure (MASC), the bias
// alarm (tracking signal), the reorder point and the demand range (P50/P90).
// Phase 2 task B3 adds safety stock, tipped in What to order's
// "Why this quantity" panel.
// The pages show each definition at the point of use through `TermTip`
// (`components/forecast/TermTip.tsx`), which reads it from here, so a
// correction is still one edit in one place.
//
// Unlike the refusal and governance vocabularies, this union is not a type the
// engine branches on: the engine names these measures in prose and fields. It
// is declared here, beside its definitions, so the chip and the glossary page
// share one closed list and `tsc` still refuses a term with no definition.
// ─────────────────────────────────────────────────────────────────────────────
/** @import { GlossaryOf } from './types' */

/** The planning terms a forecast page shows with a tip. */
/** @typedef {'Firm' | 'Trade-off' | 'MASC' | 'Tracking signal' | 'Reorder point' | 'P50/P90' | 'Safety stock'} PlanningTerm */

export const PLANNING_TERM_GLOSSARY = /** @satisfies {GlossaryOf<PlanningTerm>} */ ({
  Firm: {
    en: 'The nearest weeks of a published plan, at least the supplier’s lead time long. Once published, a Firm week’s quantity does not change, because the supplier is already producing to it.',
    id: 'Minggu-minggu terdekat dari rencana yang diterbitkan, paling sedikit sepanjang waktu tunggu pemasok. Setelah diterbitkan, kuantitas minggu Firm tidak berubah, karena pemasok sudah berproduksi untuknya.'
  },
  'Trade-off': {
    en: 'The weeks after the Firm weeks. Quantities may still change, but each change is damped and kept inside an agreed band so the supplier can plan materials.',
    id: 'Minggu-minggu setelah minggu Firm. Kuantitas masih boleh berubah, tetapi setiap perubahan diredam dan dijaga di dalam rentang yang disepakati agar pemasok dapat merencanakan bahan.'
  },
  MASC: {
    en: 'How much the plan moves from one version to the next, compared with the usual week-to-week movement of demand. 1.0 means the plan moves as much as demand usually does; lower is steadier for suppliers.',
    id: 'Seberapa besar rencana bergerak dari satu versi ke versi berikutnya, dibandingkan pergerakan permintaan yang biasa dari minggu ke minggu. 1,0 berarti rencana bergerak sebesar pergerakan permintaan yang biasa; makin rendah makin stabil bagi pemasok.'
  },
  'Tracking signal': {
    en: 'A running check for bias: the recent forecast errors’ average divided by their average size, so it runs from −1 to +1. Near 0 the forecast is balanced; towards +1 it is steadily too low, towards −1 steadily too high.',
    id: 'Pemeriksaan bias yang berjalan terus: rata-rata galat prakiraan terbaru dibagi rata-rata besarnya, sehingga nilainya dari −1 sampai +1. Mendekati 0 berarti prakiraan seimbang; mendekati +1 berarti terus terlalu rendah, mendekati −1 terus terlalu tinggi.'
  },
  'Reorder point': {
    en: 'The stock level at which a new order should be released: expected demand over the lead time and the review week, plus the safety stock.',
    id: 'Tingkat stok saat pesanan baru sebaiknya dirilis: perkiraan permintaan selama waktu tunggu dan minggu tinjauan, ditambah stok pengaman.'
  },
  'P50/P90': {
    en: 'The demand range. P50 is the middle estimate, with half the outcomes above it; P90 is the level demand stays under nine weeks in ten.',
    id: 'Rentang permintaan. P50 adalah perkiraan tengah, dengan separuh hasil di atasnya; P90 adalah tingkat yang tidak dilampaui permintaan pada sembilan dari sepuluh minggu.'
  },
  'Safety stock': {
    en: 'Stock kept on hand to cover demand above the forecast. The plan orders so that stock does not fall below it.',
    id: 'Stok yang disimpan untuk menutup permintaan di atas prakiraan. Rencana memesan agar stok tidak turun di bawahnya.'
  }
});
