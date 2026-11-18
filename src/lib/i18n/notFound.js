// ────────────────────────────────────────────────────────────────────────────
// NotFound — the real 404 surface (NAV-02). BL-84 (WCAG 3.1.2): the title and
// every other line were English literals in BOTH locales, so an Indonesian
// reader met an English page. One fragment, EN + ID on the same keys.
// ────────────────────────────────────────────────────────────────────────────

/** @type {Record<string, string>} */
export const notFoundEn = {
  'notFound.title': 'Page not found',
  'notFound.subtitle': 'The page you are looking for does not exist.',
  'notFound.code': '404 — Not found',
  'notFound.body':
    'This route does not match any page. It may have moved, or the link may be wrong.',
  'notFound.home': 'Back to Home'
};

/** @type {Record<string, string>} */
export const notFoundId = {
  'notFound.title': 'Halaman tidak ditemukan',
  'notFound.subtitle': 'Halaman yang Anda cari tidak ada.',
  'notFound.code': '404 — Tidak ditemukan',
  'notFound.body':
    'Rute ini tidak cocok dengan halaman mana pun. Mungkin sudah dipindahkan, atau tautannya salah.',
  'notFound.home': 'Kembali ke Beranda'
};
