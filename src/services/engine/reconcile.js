// ─────────────────────────────────────────────────────────────────────────────
// RECONCILIATION — REQ-E14-07 BR-04 (METHOD-SPEC D4): SKU, brand and total
// forecasts made on their own are adjusted so the SKUs add up to their brand
// and the brands to the total, weighted by how reliable each level has been.
//
// ── THE CALCULATION ─────────────────────────────────────────────────────────
//   ŷ   the base forecasts of every node (total, brands, SKUs), one week
//   S   the summing matrix: node i = Σ of the SKUs under it
//   W   the one-step in-sample forecast-error covariance (MinT, W_h ∝ W₁)
//   b̃ = (S′W⁻¹S)⁻¹ S′W⁻¹ ŷ   the reconciled SKU forecasts; every level = S·b̃
//
//   MinT-shrink (the default): W* = λ·diag(Ŵ) + (1 − λ)·Ŵ. A node's variance
//   Ŵ_ii is the mean squared residual over its own weeks (a SKU launched
//   later has none before its launch; a stock-out week has none). Its
//   correlations are measured over all weeks with a missing residual counted
//   as 0 — Ŵ_ij = Σ_t x_it·x_jt ÷ √(Σ x_it² · Σ x_jt²) · √Ŵ_ii·√Ŵ_jj — which is
//   always a valid covariance; averaging only the weeks both nodes share is
//   not, once histories differ in length (ENG-B64). λ is Schäfer–Strimmer on
//   the standardised residuals x = e ÷ √Ŵ_ii, over the weeks each pair shares:
//     λ = Σ_{i≠j} Var̂(r_ij) ÷ Σ_{i≠j} r_ij²,   r_ij = mean(x_i·x_j),
//     Var̂(r_ij) = n ÷ (n − 1)³ · Σ_t (x_ti·x_tj − r_ij)²,   clipped to [0, 1].
//   When W* cannot be inverted (a node with no residual variance, or a matrix
//   that is not positive definite), the run falls back to WLS_struct,
//   W = diag(S·1), which needs no residuals, and says so.
//
//   Non-negative: MinT can return a negative SKU value. A negative is set to
//   0 and every level is the sum of the SKUs beneath it, so the levels still
//   add up exactly. This is simpler than the constrained solve Nixtla's
//   `MinTrace(nonnegative=True)` runs, and the run counts the cells it
//   touched (ENG-B64).
//
// Pure: matrices in, matrices out. Matrices are small (PTI: a total, a few
// brands, the SKUs), so a Cholesky factorisation in plain TypeScript does.
// ─────────────────────────────────────────────────────────────────────────────

/** @typedef {number[][]} Matrix */

/**
 * Cholesky factor L (lower) of a symmetric matrix, or null when not positive definite.
 * @param {readonly (readonly number[])[]} a
 * @returns {Matrix | null}
 */
export function cholesky(a) {
  const n = a.length;
  /** @type {Matrix} */
  const l = Array.from({ length: n }, () => /** @type {Array<number>} */ (new Array(n)).fill(0));
  for (let i = 0; i < n; i += 1) {
    for (let j = 0; j <= i; j += 1) {
      let s = a[i][j];
      for (let k = 0; k < j; k += 1) s -= l[i][k] * l[j][k];
      if (i === j) {
        if (!(s > 0) || !Number.isFinite(s)) return null;
        l[i][i] = Math.sqrt(s);
      } else {
        l[i][j] = s / l[j][j];
      }
    }
  }
  return l;
}

/**
 * Solve L·Lᵀ·x = b for one right-hand side.
 * @param {Matrix} l
 * @param {readonly number[]} b
 * @returns {number[]}
 */
function cholSolve(l, b) {
  const n = l.length;
  const y = /** @type {Array<number>} */ (new Array(n)).fill(0);
  for (let i = 0; i < n; i += 1) {
    let s = b[i];
    for (let k = 0; k < i; k += 1) s -= l[i][k] * y[k];
    y[i] = s / l[i][i];
  }
  const x = /** @type {Array<number>} */ (new Array(n)).fill(0);
  for (let i = n - 1; i >= 0; i -= 1) {
    let s = y[i];
    for (let k = i + 1; k < n; k += 1) s -= l[k][i] * x[k];
    x[i] = s / l[i][i];
  }
  return x;
}

/**
 * The inverse of a symmetric positive-definite matrix, or null.
 * @param {readonly (readonly number[])[]} a
 * @returns {Matrix | null}
 */
export function spdInverse(a) {
  const l = cholesky(a);
  if (!l) return null;
  const n = a.length;
  const cols = Array.from({ length: n }, (_, j) =>
    cholSolve(
      l,
      Array.from({ length: n }, (_, i) => (i === j ? 1 : 0))
    )
  );
  return Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => cols[j][i]));
}

/**
 * @param {readonly (readonly number[])[]} a
 * @param {readonly (readonly number[])[]} b
 * @returns {Matrix}
 */
const matMul = (a, b) =>
  a.map((row) => b[0].map((_, j) => row.reduce((s, v, k) => s + v * b[k][j], 0)));
/**
 * @param {readonly (readonly number[])[]} a
 * @returns {Matrix}
 */
const transpose = (a) => a[0].map((_, j) => a.map((row) => row[j]));

/**
 * The hierarchy: node 0…m−1 with `children[i]` the SKU columns (0…n−1) summed
 * into node i. A SKU's own node lists just itself.
 */
/**
 * @typedef {object} Hierarchy
 * @property {number} nodes
 * @property {number} skus
 * @property {readonly (readonly number[])[]} members
 */

/**
 * The summing matrix S (m × n).
 * @param {Hierarchy} h
 * @returns {Matrix}
 */
export function summingMatrix(h) {
  return h.members.map((cols) =>
    Array.from({ length: h.skus }, (_, j) => (cols.includes(j) ? 1 : 0))
  );
}

/**
 * @typedef {object} ShrunkCovariance
 * @property {Matrix} w
 * @property {number} lambda
 */

/**
 * MinT-shrink covariance from in-sample residuals, `residuals[i][t]` for node
 * i and week t, NaN where the node has none. Pairwise over weeks both have.
 * @param {readonly (readonly number[])[]} residuals
 * @returns {ShrunkCovariance | null}
 */
export function shrunkCovariance(residuals) {
  const m = residuals.length;
  const T = residuals[0]?.length ?? 0;
  /**
   * @param {number} i
   * @param {number} t
   */
  const ok = (i, t) => Number.isFinite(residuals[i][t]);
  // Each node's variance over its own weeks.
  const variance = residuals.map((row) => {
    let s = 0;
    let c = 0;
    for (let t = 0; t < T; t += 1) {
      if (Number.isFinite(row[t])) {
        s += row[t] * row[t];
        c += 1;
      }
    }
    return c > 0 ? s / c : 0;
  });
  if (variance.some((v) => !(v > 0))) return null;
  const sd = variance.map(Math.sqrt);
  // Standardised residuals, a week without one counting as 0: their Gram
  // matrix, scaled to a unit diagonal, is always a valid correlation matrix
  // (pairwise-complete estimates are not, once histories differ in length).
  const x = residuals.map((row, i) =>
    Array.from({ length: T }, (_, t) => (ok(i, t) ? row[t] / sd[i] : 0))
  );
  const norm = x.map((row) => Math.sqrt(row.reduce((a, v) => a + v * v, 0)));
  /** @type {Matrix} */
  const w = Array.from({ length: m }, () => /** @type {Array<number>} */ (new Array(m)).fill(0));
  for (let i = 0; i < m; i += 1) {
    w[i][i] = variance[i];
    for (let j = i + 1; j < m; j += 1) {
      let dot = 0;
      for (let t = 0; t < T; t += 1) dot += x[i][t] * x[j][t];
      w[i][j] = w[j][i] = (dot / (norm[i] * norm[j])) * sd[i] * sd[j];
    }
  }
  // Schäfer–Strimmer intensity over the weeks each pair shares.
  let num = 0;
  let den = 0;
  for (let i = 0; i < m; i += 1) {
    for (let j = 0; j < m; j += 1) {
      if (i === j) continue;
      /** @type {number[]} */
      const prods = [];
      for (let t = 0; t < T; t += 1) if (ok(i, t) && ok(j, t)) prods.push(x[i][t] * x[j][t]);
      const n = prods.length;
      if (n < 2) continue;
      const r = prods.reduce((a, b) => a + b, 0) / n;
      num += (n / (n - 1) ** 3) * prods.reduce((a, p) => a + (p - r) ** 2, 0);
      den += r * r;
    }
  }
  const lambda = den > 0 ? Math.min(1, Math.max(0, num / den)) : 1;
  const shrunk = w.map((row, i) => row.map((v, j) => (i === j ? v : (1 - lambda) * v)));
  return { w: shrunk, lambda };
}

/**
 * P = (S′W⁻¹S)⁻¹ S′W⁻¹ (n × m), or null when either inverse fails.
 * @param {Matrix} s
 * @param {Matrix} w
 * @returns {Matrix | null}
 */
export function mintProjection(s, w) {
  const wInv = spdInverse(w);
  if (!wInv) return null;
  const stWinv = matMul(transpose(s), wInv);
  const inner = spdInverse(matMul(stWinv, s));
  if (!inner) return null;
  return matMul(inner, stWinv);
}

/**
 * WLS_struct: W = diag(S·1), the number of SKUs beneath each node.
 * @param {Hierarchy} h
 * @returns {Matrix}
 */
export function structuralCovariance(h) {
  return Array.from({ length: h.nodes }, (_, i) =>
    Array.from({ length: h.nodes }, (_, j) => (i === j ? h.members[i].length : 0))
  );
}

/** @typedef {'mintShrink' | 'wlsStruct'} ReconciliationMethod */

/**
 * @typedef {object} Reconciler
 * @property {ReconciliationMethod} method
 * @property {number | null} lambda -  λ of MinT-shrink; null on WLS_struct.
 * @property {'noResidualVariance' | 'notPositiveDefinite' | null} fallback -  Why MinT-shrink could not be used; null when it was.
 * @property {Matrix} projection
 */

/**
 * MinT-shrink when the residual covariance allows it, else WLS_struct.
 * @param {Hierarchy} h
 * @param {readonly (readonly number[])[]} residuals
 * @returns {Reconciler}
 */
export function buildReconciler(h, residuals) {
  const s = summingMatrix(h);
  const shrunk = shrunkCovariance(residuals);
  if (shrunk) {
    const p = mintProjection(s, shrunk.w);
    if (p) return { method: 'mintShrink', lambda: shrunk.lambda, fallback: null, projection: p };
  }
  return {
    method: 'wlsStruct',
    lambda: null,
    fallback: shrunk ? 'notPositiveDefinite' : 'noResidualVariance',
    projection: /** @type {Matrix} */ (mintProjection(s, structuralCovariance(h)))
  };
}

/**
 * @typedef {object} ReconciledWeek
 * @property {readonly number[]} skus -  One value per SKU, never negative.
 * @property {readonly number[]} nodes -  One value per node: the sum of the SKUs beneath it.
 * @property {number} clipped -  SKUs whose MinT value was negative and set to 0.
 */

/**
 * Reconcile one week's base forecasts (one per node).
 * @param {Hierarchy} h
 * @param {Matrix} p
 * @param {readonly number[]} base
 * @returns {ReconciledWeek}
 */
export function reconcileWeek(h, p, base) {
  const raw = p.map((row) => row.reduce((s, v, k) => s + v * base[k], 0));
  let clipped = 0;
  const skus = raw.map((v) => {
    if (v < 0) {
      // Rounding noise around 0 is not a negative forecast; only a real one counts.
      if (v < -1e-6) clipped += 1;
      return 0;
    }
    return v;
  });
  const nodes = h.members.map((cols) => cols.reduce((s, j) => s + skus[j], 0));
  return { skus, nodes, clipped };
}
