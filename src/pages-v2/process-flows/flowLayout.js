// ─────────────────────────────────────────────────────────────────────────────
// PF-1 · DIAGRAM LAYOUT — pure geometry over the derived flow view.
//
// Separated from the component ON PURPOSE. Layout is the one part of a diagram
// that can be WRONG rather than merely ugly (an edge that lands on the wrong
// node, a state placed off-canvas, two cycles sharing one lane so each reads as
// the other), and none of that is visible in a screenshot review — it looks
// like a diagram. A pure function of the view model is the only version of it a
// test can hold. The component does no arithmetic; it positions what this
// returns.
//
// ⚠️ IT ADDS NO INFORMATION. Every node here is a state the machine declares and
// every edge is one `edgesOf` produced. Layout may move a thing; it may never
// invent one, drop one, or relabel one.
//
// ── LAYERING IS BFS DEPTH, AND THAT CHOICE HAS A CONSEQUENCE WORTH STATING ──
// Rank is the SHORTEST path from a birth state, not the longest. The
// alternative (longest-path layering, what a Sugiyama renderer does) yields a
// strictly left-to-right spine with no same-rank edges — and turns every flow
// into a single row seven to nine columns long. On a purchase order that is a
// ~1.9k-pixel line for a machine that fits in a quarter of the screen when
// stacked. BFS keeps the diagram compact and pays for it with SAME-RANK edges,
// which get their own routing case below rather than being hidden.
//
// ── THE ROUTING CONVENTION, AND WHY IT IS FOUR CASES ────────────────────────
//   · BIRTH — a stub into the state a creation verb births into.
//   · DIRECT (one rank forward) — a plain curve. The common case.
//   · SIBLING (same rank) — a bracket through the gutter beside the column.
//     `Viewed → Acknowledged` is this: forward in meaning, level in depth. The
//     bottom lane would have drawn it as a cycle, which it is not.
//   · BACK (rank decreases) — its own lane below the rows. Reopen, revise and
//     resume edges are real cycles; a layered diagram that straightened them
//     would be drawing a different machine.
//
// ⚠️ THERE IS NO "SKIP" CASE, AND ITS ABSENCE IS A PROPERTY, NOT AN OVERSIGHT.
// Under BFS layering an edge can never span two ranks forward: if A→B exists
// and A is reachable, B is discovered at rank(A)+1 at the latest, so
// rank(B) ≤ rank(A)+1 always. An arc-over-the-top case would be code that can
// never run, which is a lie about what the diagram can contain. Pinned in
// `flowLayout.test.js`.
// ─────────────────────────────────────────────────────────────────────────────

/** @import { FlowEdge, FlowView } from '@services/transitions/catalogView' */

export const NODE_W = 176;
export const NODE_H = 72;
const COL_GAP = 92;
const ROW_GAP = 30;
/** Room to the left of rank 0 for the creation stub (an entity is born here). */
const ORIGIN_X = 72;
const BIRTH_STUB = 56;
/** Vertical pitch of one back-edge lane below the rows. */
const LANE = 18;
/** Horizontal pitch of one sibling gutter, inside the column gap. */
const GUTTER = 14;
/** Room reserved to the right of a gutter for its verb label / reason chip. */
const GUTTER_LABEL = 72;
const EDGE_PAD = 12;

/** @typedef {'birth' | 'direct' | 'sibling' | 'back' | 'self'} EdgeRoute */

/**
 * @typedef {{
 *     readonly name: string;
 *     readonly rank: number;
 *     readonly row: number;
 *     readonly x: number;
 *     readonly y: number;
 *   }} LaidOutNode
 */

/**
 * `path`:  SVG path data. Consumed verbatim by the component.
 * `labelX`:  Where the verb label sits (its own centre).
 * `labelTrack`:  Where else on its own edge the label may sit (BL-305): the
 *   curve of a direct edge, the vertical run of a sibling bracket, or the
 *   horizontal lane of a back edge.
 *
 * @typedef {{ readonly kind: 'cubic'; readonly p: readonly number[] }
 *   | { readonly kind: 'segment'; readonly x: number; readonly y1: number; readonly y2: number }
 *   | { readonly kind: 'lane'; readonly x1: number; readonly x2: number; readonly y: number }} LabelTrack
 *
 * @typedef {{
 *     readonly edge: FlowEdge;
 *     readonly route: EdgeRoute;
 *     readonly path: string;
 *     readonly labelX: number;
 *     readonly labelY: number;
 *     readonly labelTrack?: LabelTrack;
 *   }} LaidOutEdge
 */

/**
 * @typedef {{
 *     readonly nodes: readonly LaidOutNode[];
 *     readonly edges: readonly LaidOutEdge[];
 *     readonly width: number;
 *     readonly height: number;
 *     readonly rankCount: number;
 *     readonly maxRows: number;
 *   }} DiagramLayout
 */

/**
 * THE VERB SEGMENT of a transition id — `t_po_confirm` → `confirm`.
 *
 * Derived by dropping the two fixed leading segments the id format guarantees
 * (`t_<entity>_<verb>`, format-validated in `validate.js`), so it is a slice of
 * the schema's own string and not a second name for the verb. A compound verb
 * keeps its underscore (`t_gr_partial_approve` → `partial_approve`).
 * @param {string} transitionId
 * @returns {string}
 */
export function verbOf(transitionId) {
  const parts = transitionId.split('_');
  return parts.length > 2 ? parts.slice(2).join('_') : transitionId;
}

/**
 * THE ENTITY-QUALIFIED verb — `t_rfq_create` → `rfq:create`.
 *
 * ⚠️ **`verbOf` ALONE IS AMBIGUOUS WHEREVER THE SOURCE LIVES ON ANOTHER
 * MACHINE, AND THE `firedBy` PILL IS EXACTLY THAT PLACE.** A cascade names a
 * transition on a DIFFERENT entity, so "Fired by create" rendered on the
 * purchaseRequisition flow sits in a table that also lists `t_pr_create` — the
 * reader has every reason to join them, and would be wrong. Measured across the
 * shipped registry: FIVE rows render `firedBy`, and THREE of them name a verb
 * that collides with a different transition visible in the same table
 * (`t_quotation_award` and `t_quotation_reject` both say "award" beside
 * `t_quotation_award`; `t_pr_source` says "create" beside `t_pr_create`).
 *
 * The form is NOT new: the `fansOut` pill has always rendered
 * `advanceShipNotice:discrepancy`, and this makes the two directions of the same
 * relationship read the same way. **All five rows are qualified, including the
 * two that are not ambiguous today** — a pill that reads `entity:verb` on some
 * rows and a bare verb on others teaches a reader that the two forms MEAN
 * something different, which is a worse defect than the one it fixes and it
 * arrives silently.
 *
 * `t_<entity>_<verb>` is format-validated in `validate.js`, so this is a slice
 * of the schema's own string — not a second name and not a lookup.
 * @param {string} transitionId
 * @returns {string}
 */
export function entityVerbOf(transitionId) {
  const parts = transitionId.split('_');
  return parts.length > 2 ? `${parts[1]}:${parts.slice(2).join('_')}` : transitionId;
}

/**
 * State → layer. BFS depth from the flow's seed states (`seededFrom`, which is
 * the birth set or `[initial]` per the analyzer's ruling 3).
 *
 * ⚠️ AN UNREACHABLE STATE GETS ITS OWN COLUMN PAST THE END, rather than being
 * dropped or folded into rank 0. It is a declared state of the machine — the
 * page must be able to show it — and placing it off the spine is the honest
 * picture of "nothing reaches this". Omitting it would put the diagram in
 * direct contradiction with the census three sections below it.
 * @param {FlowView} view
 * @returns {ReadonlyMap<string, number>}
 */
export function rankStates(view) {
  const adjacency = /** @type {Map<string, string[]>} */ (new Map());
  for (const edge of view.edges) {
    if (edge.from === null) continue;
    const bucket = adjacency.get(edge.from);
    if (bucket) bucket.push(edge.to);
    else adjacency.set(edge.from, [edge.to]);
  }

  const rank = /** @type {Map<string, number>} */ (new Map());
  /** @type {string[]} */
  const queue = [];
  for (const seed of view.seededFrom) {
    if (!rank.has(seed)) {
      rank.set(seed, 0);
      queue.push(seed);
    }
  }
  for (let head = 0; head < queue.length; head += 1) {
    const state = queue[head];
    const next = (rank.get(state) ?? 0) + 1;
    for (const target of adjacency.get(state) ?? []) {
      if (!rank.has(target)) {
        rank.set(target, next);
        queue.push(target);
      }
    }
  }

  const maxRank = rank.size > 0 ? Math.max(...rank.values()) : 0;
  for (const state of view.states) {
    if (!rank.has(state.name)) rank.set(state.name, maxRank + 1);
  }
  return rank;
}

/**
 * An orthogonal polyline with softened corners.
 * @param {readonly (readonly [number, number])[]} points
 * @returns {string}
 */
function orthogonal(points, radius = 9) {
  /**
   * @param {number} n
   * @returns {string}
   */
  const round = (n) => (Math.round(n * 10) / 10).toString();
  let d = `M ${round(points[0][0])} ${round(points[0][1])}`;
  for (let i = 1; i < points.length - 1; i += 1) {
    const [px, py] = points[i - 1];
    const [cx, cy] = points[i];
    const [nx, ny] = points[i + 1];
    const inLen = Math.hypot(cx - px, cy - py) || 1;
    const outLen = Math.hypot(nx - cx, ny - cy) || 1;
    const r = Math.min(radius, inLen / 2, outLen / 2);
    const ax = cx + ((px - cx) / inLen) * r;
    const ay = cy + ((py - cy) / inLen) * r;
    const bx = cx + ((nx - cx) / outLen) * r;
    const by = cy + ((ny - cy) / outLen) * r;
    d += ` L ${round(ax)} ${round(ay)} Q ${round(cx)} ${round(cy)} ${round(bx)} ${round(by)}`;
  }
  const [lx, ly] = points[points.length - 1];
  return `${d} L ${round(lx)} ${round(ly)}`;
}

/**
 * `twin`:  Duplicate-pair index — two edges between the same pair must not overlap.
 * `twins`:  How many edges share this pair, so the fan can be CENTRED on the true line.
 *
 * @typedef {{
 *     readonly edge: FlowEdge;
 *     readonly route: EdgeRoute;
 *     readonly twin: number;
 *     readonly twins: number;
 *   }} Classified
 */

/**
 * Symmetric offset for the n-th of `total` edges sharing one pair of states.
 * @param {number} twin
 * @param {number} total
 * @param {number} pitch
 * @returns {number}
 */
const fanOffset = (twin, total, pitch) => (total <= 1 ? 0 : (twin - (total - 1) / 2) * pitch);

/** A verb label's estimated size: mono caption, about 6.6 px a character, 4 px padding a side. */
const LABEL_CHAR_W = 6.6;
const LABEL_PAD_X = 8;
export const LABEL_H = 16;

/**
 * The fan pitch for a DIRECT pair, and why it is not the 18 the other routes use.
 *
 * ⚠️ **A DIRECT EDGE'S LABEL SITS AT THE CUBIC'S MIDPOINT, SO IT MOVES THREE
 * QUARTERS OF THE BOW.** Both control points shift by the offset, and the
 * midpoint is `(P0 + 3·P1 + 3·P2 + P3)/8` — a pitch of 18 therefore separated
 * two direct labels by 13.5 px, less than `LABEL_H`, and the pair clashed the
 * moment a second verb joined one state pair (`supplierDocument`'s
 * `Awaiting Upload → Under Review`, UCX-P5). 24 puts the label centres a full
 * pitch-and-a-clear-line apart, which is what this pitch is FOR.
 */
const DIRECT_FAN_PITCH = Math.ceil((LABEL_H + 2) / 0.75);

/**
 * The box a verb label covers, centred on its anchor as the diagram draws it.
 * @param {LaidOutEdge} laid
 * @returns {{ left: number; right: number; top: number; bottom: number }}
 */
export const labelBox = (laid) => {
  const w = verbOf(laid.edge.transitionId).length * LABEL_CHAR_W + LABEL_PAD_X;
  return {
    left: laid.labelX - w / 2,
    right: laid.labelX + w / 2,
    top: laid.labelY - LABEL_H / 2,
    bottom: laid.labelY + LABEL_H / 2
  };
};

/** Points tried along a label's own edge, first the route's own choice. */
const CUBIC_T = [0.5, 0.42, 0.58, 0.35, 0.65, 0.28, 0.72, 0.2, 0.8, 0.12, 0.88];
const SEGMENT_F = [0.32, 0.5, 0.2, 0.42, 0.65, 0.12, 0.8, 0.9];

/**
 * The places a label may take on its own edge, the route's own first.
 * @returns {{ x: number; y: number }[]}
 */
const onTrack = (/** @type {LaidOutEdge} */ laid) => {
  const here = { x: laid.labelX, y: laid.labelY };
  const track = laid.labelTrack;
  if (!track) return [here];
  if (track.kind === 'segment')
    return SEGMENT_F.map((f) => ({ x: track.x, y: track.y1 + (track.y2 - track.y1) * f }));
  if (track.kind === 'lane')
    return [
      here,
      ...SEGMENT_F.map((f) => ({ x: track.x1 + (track.x2 - track.x1) * f, y: track.y }))
    ];
  const [x0, y0, x1, y1, x2, y2, x3, y3] = track.p;
  /** @param {number} t @param {number} a @param {number} b @param {number} c @param {number} d */
  const at = (t, a, b, c, d) =>
    (1 - t) ** 3 * a + 3 * (1 - t) ** 2 * t * b + 3 * (1 - t) * t ** 2 * c + t ** 3 * d;
  return CUBIC_T.map((t) => ({ x: at(t, x0, x1, x2, x3), y: at(t, y0, y1, y2, y3) }));
};

/** Last resort: the same spots, stepped just off the line (the label background keeps it legible). */
const OFF_LINE = [
  -(LABEL_H / 2 + 2),
  LABEL_H / 2 + 2,
  -(LABEL_H + 2),
  LABEL_H + 2,
  -(1.5 * LABEL_H + 2),
  1.5 * LABEL_H + 2
];

/**
 * The places a label may take, on its own edge first, then just beside it.
 * @param {LaidOutEdge} laid
 * @returns {{ x: number; y: number }[]}
 */
const labelSpots = (laid) => {
  const spots = onTrack(laid);
  return [...spots, ...OFF_LINE.flatMap((dy) => spots.map((p) => ({ x: p.x, y: p.y + dy })))];
};

/**
 * BL-305 (UL-07) — no two verb labels drawn on top of each other. The routes
 * place each label on its own edge, but in a busy column gap a bracket's label
 * and a curve's midpoint can land in the same spot (`adjust` over
 * `partial_deliver` on the purchase order). Labels whose route spot is free
 * keep it; each clashing label then takes the first spot ON ITS OWN EDGE that
 * clears every placed label: a curve's label slides along the curve, a
 * bracket's along its vertical run, so a label never leaves the line it
 * names. One with no free spot stays where its route put it.
 * @param {LaidOutEdge[]} edges
 * @param {readonly LaidOutNode[]} nodes
 * @returns {LaidOutEdge[]}
 */
const separateLabels = (edges, nodes) => {
  // State boxes are obstacles too: a label slid off a clash must not land on a
  // state name (it did, "reject" over "Delivered", before this).
  // A route's own spot may touch a state box (a self-loop's label does, by
  // design); only a MOVED label must clear them.
  const states = nodes.map((n) => ({
    left: n.x,
    right: n.x + NODE_W,
    top: n.y,
    bottom: n.y + NODE_H
  }));
  /** @type {ReturnType<typeof labelBox>[]} */
  const placed = [];
  /**
   * @param {ReturnType<typeof labelBox>} b
   * @param {readonly ReturnType<typeof labelBox>[]} boxes
   */
  const meets = (b, boxes) =>
    boxes.some((p) => b.left < p.right && b.right > p.left && b.top < p.bottom && b.bottom > p.top);
  const hits = (/** @type {ReturnType<typeof labelBox>} */ b) => meets(b, placed);
  const out = [...edges];
  /** Which edge each placed box belongs to, parallel to `placed`. @type {number[]} */
  const owner = [];
  /** @param {number} i @param {LaidOutEdge} laid */
  const put = (i, laid) => {
    out[i] = laid;
    placed.push(labelBox(laid));
    owner.push(i);
  };
  /** @param {number} i  The first free spot on edge `i`'s own edge, if any. */
  const freeSpot = (i) => {
    for (const spot of labelSpots(edges[i])) {
      const moved = { ...edges[i], labelX: spot.x, labelY: spot.y };
      const box = labelBox(moved);
      if (!hits(box) && !meets(box, states)) return moved;
    }
    return null;
  };
  // Pass 1: every label whose route spot is free keeps it; earlier labels win.
  /** @type {number[]} */
  const clashing = [];
  edges.forEach((laid, i) => {
    if (laid.path === '') return;
    if (hits(labelBox(laid))) clashing.push(i);
    else put(i, laid);
  });
  // Pass 2: each clashing label takes the first free spot on its own edge.
  // When it has none, the label it lands on moves instead, if THAT label has
  // a free spot on its own edge once the clashing one is in place.
  for (const i of clashing) {
    const moved = freeSpot(i);
    if (moved) {
      put(i, moved);
      continue;
    }
    const mine = labelBox(edges[i]);
    const k = placed.findIndex((b) => meets(mine, [b]));
    if (k >= 0) {
      const j = owner[k];
      const [blocker] = placed.splice(k, 1);
      owner.splice(k, 1);
      placed.push(mine);
      owner.push(i);
      const relocated = freeSpot(j);
      if (relocated && !meets(labelBox(relocated), [mine])) {
        out[i] = edges[i];
        put(j, relocated);
        continue;
      }
      placed.pop();
      owner.pop();
      placed.splice(k, 0, blocker);
      owner.splice(k, 0, j);
    }
    put(i, edges[i]);
  }
  return out;
};

/**
 * Lay one flow out. Pure; the component performs no arithmetic of its own.
 * @param {FlowView} view
 * @param {{ separate?: boolean }} [opts]  `separate: false` returns the routes'
 *   own label spots, before BL-305's separation pass (for its tests).
 * @returns {DiagramLayout}
 */
export function layoutFlow(view, { separate = true } = {}) {
  const rank = rankStates(view);
  const rowOf = /** @type {Map<string, number>} */ (new Map());
  const perRank = /** @type {Map<number, number>} */ (new Map());
  for (const state of view.states) {
    const r = rank.get(state.name) ?? 0;
    const row = perRank.get(r) ?? 0;
    rowOf.set(state.name, row);
    perRank.set(r, row + 1);
  }

  const rankCount = perRank.size > 0 ? Math.max(...perRank.keys()) + 1 : 1;
  const maxRows = perRank.size > 0 ? Math.max(...perRank.values()) : 1;

  /** @type {LaidOutNode[]} */
  const nodes = view.states.map((state) => {
    const r = rank.get(state.name) ?? 0;
    const row = rowOf.get(state.name) ?? 0;
    return {
      name: state.name,
      rank: r,
      row,
      x: ORIGIN_X + r * (NODE_W + COL_GAP),
      y: EDGE_PAD + row * (NODE_H + ROW_GAP)
    };
  });
  const nodeAt = new Map(nodes.map((n) => [n.name, n]));

  // Classify first: the back-edge count fixes the canvas height, and a lane
  // allocated before the count is known is a lane that can fall off the bottom.
  /**
   * @param {FlowEdge} edge
   * @returns {string}
   */
  const pairKey = (edge) => `${edge.from ?? '·'}→${edge.to}`;
  const pairTotal = /** @type {Map<string, number>} */ (new Map());
  for (const edge of view.edges) {
    pairTotal.set(pairKey(edge), (pairTotal.get(pairKey(edge)) ?? 0) + 1);
  }
  const pairSeen = /** @type {Map<string, number>} */ (new Map());
  /** @type {Classified[]} */
  const classified = view.edges.map((edge) => {
    const key = pairKey(edge);
    const twin = pairSeen.get(key) ?? 0;
    pairSeen.set(key, twin + 1);
    const base = { edge, twin, twins: pairTotal.get(key) ?? 1 };
    if (edge.from === null) return { ...base, route: 'birth' };
    if (edge.from === edge.to) return { ...base, route: 'self' };
    const from = rank.get(edge.from) ?? 0;
    const to = rank.get(edge.to) ?? 0;
    if (to === from) return { ...base, route: 'sibling' };
    if (to < from) return { ...base, route: 'back' };
    return { ...base, route: 'direct' };
  });

  const backCount = classified.filter((c) => c.route === 'back').length;
  const rowsBottom = EDGE_PAD + maxRows * (NODE_H + ROW_GAP) - ROW_GAP;
  const backBase = rowsBottom + EDGE_PAD + LANE;
  const height = backCount > 0 ? backBase + backCount * LANE : rowsBottom + EDGE_PAD;

  // The canvas must be as wide as the widest thing DRAWN, not as wide as the
  // last column. A sibling bracket in the final rank lives in the gutter to the
  // right of it, and a canvas measured from the nodes alone cuts it off.
  let rightMost = ORIGIN_X + rankCount * (NODE_W + COL_GAP) - COL_GAP;
  let backLane = 0;
  const gutterLane = /** @type {Map<number, number>} */ (new Map());
  /** @type {LaidOutEdge[]} */
  const edges = classified.map(({ edge, route, twin, twins }) => {
    const target = nodeAt.get(edge.to);
    const source = edge.from === null ? undefined : nodeAt.get(edge.from);
    // Validation guarantees every edge names declared states, so a missing node
    // is impossible; the fallback keeps the type honest rather than throwing.
    if (!target || (edge.from !== null && !source)) {
      return { edge, route, path: '', labelX: 0, labelY: 0 };
    }
    /**
     * @param {LaidOutNode} n
     * @returns {number}
     */
    const midY = (n) => n.y + NODE_H / 2;

    if (route === 'birth') {
      const x1 = target.x - BIRTH_STUB;
      // Two creation verbs can birth into ONE state (requirementResponse both
      // submits and drafts into `Draft`). Fanning them apart is the only way
      // both stay readable; stacking would draw one verb over the other.
      const y = midY(target) + fanOffset(twin, twins, 18);
      return {
        edge,
        route,
        path: `M ${x1} ${y} L ${target.x} ${y}`,
        labelX: x1 + BIRTH_STUB / 2,
        labelY: y - 13
      };
    }

    const from = /** @type {LaidOutNode} */ (source);
    if (route === 'self') {
      const x = from.x + NODE_W;
      const top = from.y + 16;
      const bottom = from.y + NODE_H - 16;
      rightMost = Math.max(rightMost, x + 96);
      return {
        edge,
        route,
        path: `M ${x} ${top} C ${x + 46} ${top - 14}, ${x + 46} ${bottom + 14}, ${x} ${bottom}`,
        labelX: x + 36,
        // Two self-loops on one state (rfq: award_partial and
        // award_cancel_partial on Partly awarded) fan their labels apart.
        labelY: midY(from) + fanOffset(twin, twins, LABEL_H + 2),
        labelTrack: {
          kind: 'segment',
          x: x + 36,
          y1: from.y - LABEL_H,
          y2: from.y + NODE_H + LABEL_H
        }
      };
    }
    if (route === 'direct') {
      const x1 = from.x + NODE_W;
      const y1 = midY(from);
      const x2 = target.x;
      const y2 = midY(target);
      const bow = fanOffset(twin, twins, DIRECT_FAN_PITCH);
      const dx = COL_GAP * 0.55;
      const c1y = y1 + bow;
      const c2y = y2 + bow;
      return {
        edge,
        route,
        path: `M ${x1} ${y1} C ${x1 + dx} ${c1y}, ${x2 - dx} ${c2y}, ${x2} ${y2}`,
        // The cubic's midpoint, exactly: (P0 + 3·P1 + 3·P2 + P3) / 8.
        labelX: (x1 + 3 * (x1 + dx) + 3 * (x2 - dx) + x2) / 8,
        labelY: (y1 + 3 * c1y + 3 * c2y + y2) / 8,
        labelTrack: { kind: 'cubic', p: [x1, y1, x1 + dx, c1y, x2 - dx, c2y, x2, y2] }
      };
    }
    if (route === 'sibling') {
      // A bracket out of the source's right edge, down (or up) the gutter that
      // sits inside the column gap, and back into the target's right edge. It
      // never crosses a node, and it never reads as a cycle.
      const lane = gutterLane.get(from.rank) ?? 0;
      gutterLane.set(from.rank, lane + 1);
      const x = from.x + NODE_W;
      const gutterX = x + 18 + lane * GUTTER;
      rightMost = Math.max(rightMost, gutterX + GUTTER_LABEL);
      const y1 = midY(from);
      const y2 = midY(target);
      return {
        edge,
        route,
        path: orthogonal(
          [
            [x, y1],
            [gutterX, y1],
            [gutterX, y2],
            [x, y2]
          ],
          7
        ),
        labelX: gutterX + 4,
        // NOT the midpoint. A direct edge between the two ROWS this bracket
        // spans puts ITS label at the midpoint too, a couple of dozen pixels
        // away, and the two render on top of each other — `deliver` and `close`
        // overlapped into "deli close" on the purchase order before this.
        // Sitting a third of the way down separates them without moving the
        // label off its own line.
        //
        // ⚠️ **AND TWO BRACKETS BETWEEN THE SAME PAIR SHARE THAT Y**, so their
        // lanes differ by GUTTER (14 px) while the labels are wider than that:
        // they overlapped the day a second verb joined one pair (UCX-P5's
        // `supplierDocument`: `submit` and `answer_coa`). The pair's fan pushes
        // them apart along their own vertical runs, as the self-loops do.
        labelY: y1 + (y2 - y1) * 0.32 + fanOffset(twin, twins, LABEL_H + 2),
        labelTrack: { kind: 'segment', x: gutterX + 4, y1, y2 }
      };
    }
    // BACK — a real cycle, in its own lane below the rows. When the two states
    // share a column the drop and the climb would be the same line, so the exit
    // and entry points step apart along the node edges.
    const sameColumn = Math.abs(from.x - target.x) < 1;
    const sx = from.x + NODE_W / 2 + (sameColumn ? 26 : 0);
    const tx = target.x + NODE_W / 2 - (sameColumn ? 26 : 0);
    const laneY = backBase + backLane * LANE;
    backLane += 1;
    return {
      edge,
      route,
      path: orthogonal([
        [sx, from.y + NODE_H],
        [sx, laneY],
        [tx, laneY],
        [tx, target.y + NODE_H]
      ]),
      labelX: (sx + tx) / 2,
      labelY: laneY,
      labelTrack: { kind: 'lane', x1: sx, x2: tx, y: laneY }
    };
  });

  return {
    nodes,
    edges: separate ? separateLabels(edges, nodes) : edges,
    width: rightMost + EDGE_PAD,
    height,
    rankCount,
    maxRows
  };
}
