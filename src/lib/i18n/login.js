// ────────────────────────────────────────────────────────────────────────────
// The sign-in page (`/login`) — its own dark design, outside the hub shell.
// BL-84 (WCAG 1.3.1 / 1.4.3 / 3.1.2): the page had no page heading and every
// label, tab and the demo notice were English literals in both locales. The
// strings below are one fragment so the page can render EN and ID.
// ────────────────────────────────────────────────────────────────────────────

/** @type {Record<string, string>} */
export const loginEn = {
  // The page's one heading. It is also the product name the brand block shows.
  'login.title': 'Paragon Supplier Portal',
  'login.brandLine2': 'Supplier Collaboration Portal',
  'login.tab.buyer': 'Paragon Team',
  'login.tab.supplier': 'Supplier Login',
  'login.email': 'Email',
  'login.password': 'Password',
  'login.signIn': 'Sign In',
  'login.register': 'New supplier? Register here →',
  'login.forgot': 'Forgot password?',
  'login.demoMode': 'Demo Mode',
  'login.viewAsBuyer': 'View as Buyer',
  'login.viewAsSupplier': 'View as Supplier',
  'login.footer': '© 2026 PT Paragon Technology and Innovation. All rights reserved.'
};

/** @type {Record<string, string>} */
export const loginId = {
  'login.title': 'Portal Pemasok Paragon',
  'login.brandLine2': 'Portal Kolaborasi Pemasok',
  'login.tab.buyer': 'Tim Paragon',
  'login.tab.supplier': 'Masuk Pemasok',
  'login.email': 'Email',
  'login.password': 'Kata sandi',
  'login.signIn': 'Masuk',
  'login.register': 'Pemasok baru? Daftar di sini →',
  'login.forgot': 'Lupa kata sandi?',
  'login.demoMode': 'Mode Demo',
  'login.viewAsBuyer': 'Lihat sebagai Pembeli',
  'login.viewAsSupplier': 'Lihat sebagai Pemasok',
  'login.footer': '© 2026 PT Paragon Technology and Innovation. Hak cipta dilindungi.'
};
