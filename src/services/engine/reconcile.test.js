import { describe, it, expect } from 'vitest';
/** @import { Hierarchy } from './reconcile' */
import {
  buildReconciler,
  cholesky,
  mintProjection,
  reconcileWeek,
  shrunkCovariance,
  spdInverse,
  structuralCovariance,
  summingMatrix
} from './reconcile';

// ─────────────────────────────────────────────────────────────────────────────
// REQ-E14-07 BR-04 — reconciliation, on a total over two SKUs worked by hand.
//   nodes: 0 = total (SKU a + SKU b), 1 = a, 2 = b
// ─────────────────────────────────────────────────────────────────────────────

/** @type {Hierarchy} */
const TWO = { nodes: 3, skus: 2, members: [[0, 1], [0], [1]] };
const I3 = [
  [1, 0, 0],
  [0, 1, 0],
  [0, 0, 1]
];
/** @param {readonly number[]} xs */
const round = (xs) => xs.map((v) => Math.round(v * 1e9) / 1e9);

describe('linear algebra', () => {
  it('Cholesky and the inverse of [[4, 2], [2, 3]]; a matrix that is not positive definite is refused', () => {
    expect(
      cholesky([
        [4, 2],
        [2, 3]
      ])
    ).toEqual([
      [2, 0],
      [1, Math.sqrt(2)]
    ]);
    const inv = /** @type {import('./reconcile').Matrix} */ (
      spdInverse([
        [4, 2],
        [2, 3]
      ])
    );
    expect(inv.map(round)).toEqual([round([3 / 8, -2 / 8]), round([-2 / 8, 4 / 8])]);
    expect(
      cholesky([
        [1, 2],
        [2, 1]
      ])
    ).toBeNull();
  });

  it('the summing matrix of total = a + b', () => {
    expect(summingMatrix(TWO)).toEqual([
      [1, 1],
      [1, 0],
      [0, 1]
    ]);
  });
});

describe('reconciliation, worked by hand', () => {
  it('equal weights (W = I): base total 10, a 3, b 5 → a 11/3, b 17/3, total 28/3', () => {
    const p = /** @type {import('./reconcile').Matrix} */ (mintProjection(summingMatrix(TWO), I3));
    const r = reconcileWeek(TWO, p, [10, 3, 5]);
    expect(round(r.skus)).toEqual(round([11 / 3, 17 / 3]));
    expect(round(r.nodes)).toEqual(round([28 / 3, 11 / 3, 17 / 3]));
    expect(r.clipped).toBe(0);
  });

  it('WLS_struct (W = diag 2, 1, 1): the same base → a 3.5, b 5.5, total 9', () => {
    const p = /** @type {import('./reconcile').Matrix} */ (
      mintProjection(summingMatrix(TWO), structuralCovariance(TWO))
    );
    const r = reconcileWeek(TWO, p, [10, 3, 5]);
    expect(round(r.skus)).toEqual([3.5, 5.5]);
    expect(round(r.nodes)).toEqual([9, 3.5, 5.5]);
  });

  it('a negative SKU value is set to 0 and every level stays the sum beneath it', () => {
    // W = I, base total 0, a 10, b 0 → a 20/3, b −10/3.
    const p = /** @type {import('./reconcile').Matrix} */ (mintProjection(summingMatrix(TWO), I3));
    const r = reconcileWeek(TWO, p, [0, 10, 0]);
    expect(round(r.skus)).toEqual(round([20 / 3, 0]));
    expect(round(r.nodes)).toEqual(round([20 / 3, 20 / 3, 0]));
    expect(r.clipped).toBe(1);
  });
});

describe('MinT-shrink covariance', () => {
  it('two perfectly correlated nodes: variances 1 and 4, covariance 2, no shrinkage (λ = 0)', () => {
    const s = /** @type {import('./reconcile').ShrunkCovariance} */ (
      shrunkCovariance([
        [1, -1, 1, -1],
        [2, -2, 2, -2]
      ])
    );
    expect(s.lambda).toBe(0);
    expect(s.w.map(round)).toEqual([
      [1, 2],
      [2, 4]
    ]);
  });

  it('noisy, weakly related residuals shrink the covariance toward its diagonal (0 < λ ≤ 1)', () => {
    const s = /** @type {import('./reconcile').ShrunkCovariance} */ (
      shrunkCovariance([
        [1, -2, 3, -1, 2, -3],
        [2, 1, -1, 3, -2, -1]
      ])
    );
    expect(s.lambda).toBeGreaterThan(0);
    expect(s.lambda).toBeLessThanOrEqual(1);
    expect(s.w[0][0]).toBeCloseTo((1 + 4 + 9 + 1 + 4 + 9) / 6, 12); // the diagonal is never shrunk
  });

  it('histories of different lengths still give a valid covariance, where averaging shared weeks would not', () => {
    // Node 2 has residuals only in the two weeks where 0 and 1 disagree. The
    // pairwise estimate is [[1, ⅓, −1], [⅓, 1, 1], [−1, 1, 1]], which is not
    // positive definite; the Gram form is.
    const res = [
      [1, -1, 1, -1, 1, -1],
      [1, -1, 1, -1, -1, 1],
      [NaN, NaN, NaN, NaN, -1, 1]
    ];
    expect(
      cholesky([
        [1, 1 / 3, -1],
        [1 / 3, 1, 1],
        [-1, 1, 1]
      ])
    ).toBeNull();
    const s = /** @type {import('./reconcile').ShrunkCovariance} */ (shrunkCovariance(res));
    expect(cholesky(s.w)).not.toBeNull();
  });

  it('a node with no residual variance cannot be weighted: MinT falls back to WLS_struct and says why', () => {
    const r = buildReconciler(TWO, [
      [1, -1, 1],
      [0, 0, 0],
      [1, -1, 1]
    ]);
    expect(r.method).toBe('wlsStruct');
    expect(r.fallback).toBe('noResidualVariance');
    expect(r.lambda).toBeNull();
  });

  it('MinT-shrink is used when the residuals allow it', () => {
    const r = buildReconciler(TWO, [
      [3, -1, 2, -2, 1, -3],
      [1, -2, 1, -1, 2, -1],
      [2, 1, 1, -1, -1, -2]
    ]);
    expect(r.method).toBe('mintShrink');
    expect(r.fallback).toBeNull();
    const week = reconcileWeek(TWO, r.projection, [100, 30, 60]);
    expect(week.nodes[0]).toBeCloseTo(week.skus[0] + week.skus[1], 9);
  });
});
