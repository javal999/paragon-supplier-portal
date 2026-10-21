import { describe, expect, it } from 'vitest';
import { join } from 'node:path';
import { routerImports, routes, routedPageFiles } from './routerPages';
import { pageFiles } from './pageFiles';

// A synthetic router in the shapes AppRouter uses: default, aliased-default,
// named and lazy imports; one-line, multi-line and <Suspense>-wrapped routes;
// a pathless layout route; a redirect.
const SRC = `
import { lazy, Suspense } from 'react';
import { Route, Navigate } from 'react-router-dom';
import Home from '@pages-v2/Home';
import Reg, { RegHelp as Help } from '@pages-v2/Registration';
import { AdminA, AdminB } from '@pages-v2/admin/AdminRules';
const Grid = lazy(() => import('@pages-v2/Grid'));
<Route path="/home" element={<Home />} />
<Route
  path="/grid"
  element={
    <Suspense fallback={<LoadingState />}>
      <Grid />
    </Suspense>
  }
/>
<Route path="/admin/a" element={<AdminA />} />
<Route element={<Layout />}>
<Route path="/old" element={<Navigate to="/home" replace />} />
`;

describe('routerPages — the router derivation, probed both ways', () => {
  it('follows default, aliased, named and lazy imports', () => {
    const map = routerImports(SRC);
    expect(map.get('Home')).toBe('@pages-v2/Home');
    expect(map.get('Reg')).toBe('@pages-v2/Registration');
    expect(map.get('Help')).toBe('@pages-v2/Registration');
    expect(map.get('AdminA')).toBe('@pages-v2/admin/AdminRules');
    expect(map.get('AdminB')).toBe('@pages-v2/admin/AdminRules');
    expect(map.get('Grid')).toBe('@pages-v2/Grid');
    // Known-false: the imported-as name is the local one, not the export.
    expect(map.has('RegHelp')).toBe(false);
  });

  it('finds one-line, multi-line, wrapped and pathless routes; never a wrapper', () => {
    const found = routes(SRC);
    expect(found).toContainEqual({ path: '/home', component: 'Home' });
    expect(found).toContainEqual({ path: '/grid', component: 'Grid' });
    expect(found).toContainEqual({ path: '/admin/a', component: 'AdminA' });
    expect(found).toContainEqual({ path: null, component: 'Layout' });
    expect(found).toContainEqual({ path: '/old', component: 'Navigate' });
    const names = found.map((r) => r.component);
    expect(names).not.toContain('Suspense');
    expect(names).not.toContain('LoadingState');
    expect(found).toHaveLength(5);
  });

  it('on the real router, reaches routed pages that pageFiles leaves out', () => {
    const pagesDir = join(process.cwd(), 'src', 'pages-v2');
    const routed = routedPageFiles(pagesDir);
    const pages = new Set(pageFiles(pagesDir));
    const outside = routed.filter((f) => !pages.has(f));
    expect(outside).toContain('admin/AdminSuppliers.jsx');
    expect(outside).toContain('admin/AdminRuleValues/index.jsx');
    expect(outside).toContain('admin/AdminRuleValues/components/RuleRow.jsx');
    // Known-false: a feature component no route renders is not routed.
    expect(routed).not.toContain('contracts/RaisedElsewhere.jsx');
    // And the files pageFiles already had are still routed, not replaced.
    expect(routed).toContain('BuyerCommHub.jsx');
    // (BuyerCollaboration was the second member until IA P-04 made it a lazy
    // tab of Foresight commitments; the router no longer imports it.)
    expect(routed).toContain('BuyerCallOffs.jsx');
  });
});
