/*
 * ui-overlap-scan.js — SC Hub UI layering scan (UI layering review 2026-11).
 *
 * WHAT IT REPORTS (as JSON, geometry only; it never clicks, types or changes the page):
 *   floating[]        every visible floating layer: [role=tooltip|dialog|menu|listbox],
 *                     position fixed or sticky, or position absolute with z-index above 0.
 *                     Per layer:
 *                       covers[]        visible text, inputs and buttons outside the layer that the
 *                                       layer paints over (element collision, ReDeCheck class 1).
 *                                       Fixed and sticky bars only report a covered element when
 *                                       it has keyboard focus (WCAG 2.4.11), because covering
 *                                       scrolled content is their job.
 *                       paintedOverBy[] elements outside the layer painted ON TOP of it
 *                                       (wrong stacking order).
 *                       clipped         share of the layer cut by its nearest ancestor whose
 *                                       overflow is not visible (element protrusion, class 2).
 *                       offScreen       px of the layer outside the viewport (viewport
 *                                       protrusion, class 3).
 *                       textOverflow    text or a child box running out of the layer.
 *   staticCollisions[] pairs of visible text / controls that overlap with nothing open.
 *   cellOverflow[]    table or grid cells whose content runs out of the cell box.
 *   pageHScroll       px the page scrolls sideways (WCAG 1.4.10 at 320 px).
 *   focus             the focused element and the share of it hidden by fixed/sticky bars.
 *
 * HOW TO RUN: open the portal (for example http://localhost:5395/#/supplier/forecasts), paste
 * this whole file into the browser console or the browser pane's JavaScript tool. It defines
 * window.uiOverlapScan and window.uiOverlapScanTips and returns the first scan.
 *   uiOverlapScan({ minArea: 16, maxItems: 40 })  one scan of the page as it is now. Open a
 *                                                 menu or drawer first to scan it open.
 *   await uiOverlapScanTips({ max: 30 })         opens each ⓘ term tip by keyboard focus,
 *                                                 one per label, and lists the tips that
 *                                                 collide, are cut, leave the screen or
 *                                                 overflow their box. Focus is its only action.
 * Static collisions compare line boxes (getClientRects), so a label that wraps onto a second
 * line is not reported as overlapping what sits on that line.
 * Known limits: covering is judged by paint order at the centre of the overlap; a sticky
 * header covering scrolled content is reported only when the covered element has focus.
 */
(() => {
  const MAX_TARGETS = 4000;

  const isVisible = (el) => {
    const s = getComputedStyle(el);
    if (s.display === 'none' || s.visibility === 'hidden' || Number(s.opacity) === 0) return false;
    const r = el.getBoundingClientRect();
    return r.width > 1 && r.height > 1;
  };

  const describe = (el) => {
    const tid = el.getAttribute('data-testid');
    const role = el.getAttribute('role');
    const text = (el.getAttribute('aria-label') || el.innerText || el.value || el.placeholder || '')
      .trim()
      .replace(/\s+/g, ' ')
      .slice(0, 70);
    return `${el.tagName.toLowerCase()}${role ? `[role=${role}]` : ''}${tid ? `[data-testid=${tid}]` : ''}${text ? ` "${text}"` : ''}`;
  };

  const rect = (el) => {
    const r = el.getBoundingClientRect();
    return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height };
  };

  const overlap = (a, b) => {
    const w = Math.min(a.right, b.right) - Math.max(a.left, b.left);
    const h = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
    return w > 0 && h > 0 ? { w, h, area: w * h, x: Math.max(a.left, b.left) + w / 2, y: Math.max(a.top, b.top) + h / 2 } : null;
  };

  const related = (a, b) => a === b || a.contains(b) || b.contains(a);

  const kindOf = (el) => {
    // BL-301: the visible term tip box is a portal element marked data-tip-popup.
    if (el.hasAttribute('data-tip-popup')) return 'tooltip';
    const role = el.getAttribute('role');
    if (['tooltip', 'dialog', 'menu', 'listbox', 'alertdialog'].includes(role)) return role;
    const s = getComputedStyle(el);
    if (s.position === 'fixed' || s.position === 'sticky') return s.position;
    const z = parseInt(s.zIndex, 10);
    if (s.position === 'absolute' && z > 0) return 'absolute-z';
    return null;
  };

  const clipAncestor = (el) => {
    for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
      const s = getComputedStyle(p);
      if (s.overflowX !== 'visible' || s.overflowY !== 'visible') return p;
    }
    return null;
  };

  // The element painted on top at a point, ignoring pointer-events: none layers by
  // walking elementsFromPoint (which lists every box under the point, topmost first).
  const topmostAt = (x, y) => {
    const list = document.elementsFromPoint(x, y);
    return list.length ? list[0] : null;
  };
  const stackAt = (x, y) => document.elementsFromPoint(x, y);

  const intersect = (a, b) => {
    const left = Math.max(a.left, b.left);
    const top = Math.max(a.top, b.top);
    const right = Math.min(a.right, b.right);
    const bottom = Math.min(a.bottom, b.bottom);
    return right > left && bottom > top ? { left, top, right, bottom, width: right - left, height: bottom - top } : null;
  };

  // The part of the screen an element can paint into: the viewport cut by every ancestor
  // whose overflow is not visible, stopping at a position: fixed ancestor.
  const clipRectOf = (el) => {
    let box = { left: 0, top: 0, right: window.innerWidth, bottom: window.innerHeight };
    for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
      const s = getComputedStyle(p);
      if (s.overflowX !== 'visible' || s.overflowY !== 'visible') {
        const r = p.getBoundingClientRect();
        box = intersect(box, { left: r.left, top: r.top, right: r.right, bottom: r.bottom }) || { left: 0, top: 0, right: 0, bottom: 0 };
      }
      if (s.position === 'fixed') break;
    }
    return box;
  };

  const hasOwnText = (el) =>
    Array.from(el.childNodes).some((n) => n.nodeType === 3 && n.textContent.trim().length > 0);

  window.uiOverlapScan = (opts = {}) => {
    const minArea = opts.minArea ?? 16;
    const maxItems = opts.maxItems ?? 40;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const all = Array.from(document.body.querySelectorAll('*'));
    const targets = [];
    const floating = [];
    for (const el of all) {
      if (!isVisible(el)) continue;
      const tag = el.tagName;
      if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'svg' || tag === 'path') continue;
      const k = kindOf(el);
      if (k) floating.push({ el, kind: k });
      const control = ['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON'].includes(tag) || el.getAttribute('role') === 'button';
      if ((control || hasOwnText(el)) && targets.length < MAX_TARGETS) {
        const r = rect(el);
        // Line boxes, not the bounding box: an inline label that wraps has one wide bounding
        // box that "overlaps" whatever sits on its second line.
        // Clip each line box by every scrolling ancestor: content scrolled out of its
        // container is not on screen and cannot collide with anything.
        const clip = clipRectOf(el);
        const lines = (Array.from(el.getClientRects()).length ? Array.from(el.getClientRects()) : [r])
          .map((q) => intersect({ left: q.left, top: q.top, right: q.right, bottom: q.bottom }, clip))
          .filter(Boolean);
        if (lines.length && r.bottom > 0 && r.top < vh && r.right > 0 && r.left < vw) targets.push({ el, r, control, lines });
      }
    }

    const active = document.activeElement && document.activeElement !== document.body ? document.activeElement : null;

    const floatingOut = [];
    for (const { el, kind } of floating) {
      const fr = rect(el);
      if (fr.width < 8 || fr.height < 8) continue;
      const pinned = kind === 'fixed' || kind === 'sticky';
      const covers = [];
      const paintedOverBy = [];
      for (const t of targets) {
        if (related(el, t.el)) continue;
        const o = overlap(fr, t.r);
        if (!o || o.area < minArea) continue;
        const stack = stackAt(o.x, o.y);
        const iF = stack.findIndex((n) => el === n || el.contains(n));
        const iT = stack.findIndex((n) => t.el === n || t.el.contains(n));
        if (iF === -1 && getComputedStyle(el).pointerEvents !== 'none') continue;
        const layerOnTop = iF !== -1 && (iT === -1 || iF < iT);
        if (layerOnTop || (iF === -1 && iT !== -1 && getComputedStyle(el).pointerEvents === 'none')) {
          if (pinned && t.el !== active && !t.el.contains(active)) continue;
          covers.push({ el: describe(t.el), area: Math.round(o.area), share: +(o.area / (t.r.width * t.r.height)).toFixed(2) });
        } else if (iT !== -1 && iT < iF && !pinned) {
          paintedOverBy.push({ el: describe(t.el), area: Math.round(o.area) });
        }
      }

      let clipped = null;
      // A position: fixed layer escapes its ancestors' overflow (no transformed ancestor in
      // this app), so only the screen can cut it.
      const anc = getComputedStyle(el).position === 'fixed' ? null : clipAncestor(el);
      if (anc) {
        const ar = rect(anc);
        const o = overlap(fr, ar);
        const visibleArea = o ? o.area : 0;
        const cut = 1 - visibleArea / (fr.width * fr.height);
        if (cut > 0.01) clipped = { by: describe(anc).slice(0, 90), share: +cut.toFixed(2) };
      }

      const offScreen = {
        left: Math.max(0, Math.round(-fr.left)),
        right: Math.max(0, Math.round(fr.right - vw)),
        top: Math.max(0, Math.round(-fr.top)),
        bottom: Math.max(0, Math.round(fr.bottom - vh))
      };
      // A sticky cell or header below the fold is ordinary scrolled content, not protrusion.
      const anyOff = kind !== 'sticky' && Object.values(offScreen).some((v) => v > 0);

      let textOverflow = null;
      if (el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).overflowX === 'visible') {
        textOverflow = { scrollWidth: el.scrollWidth, clientWidth: el.clientWidth };
      }
      for (const c of el.querySelectorAll('*')) {
        if (!isVisible(c)) continue;
        const cr = rect(c);
        if (cr.right > fr.right + 2 || cr.left < fr.left - 2) {
          textOverflow = { child: describe(c), overflowPx: Math.round(Math.max(cr.right - fr.right, fr.left - cr.left)) };
          break;
        }
      }

      const transient = !pinned;
      if (transient || covers.length || paintedOverBy.length || clipped || anyOff) {
        if (!(covers.length || paintedOverBy.length || clipped || anyOff || textOverflow) && kind === 'absolute-z') continue;
        floatingOut.push({
          layer: describe(el),
          kind,
          box: { x: Math.round(fr.left), y: Math.round(fr.top), w: Math.round(fr.width), h: Math.round(fr.height) },
          covers: covers.slice(0, maxItems),
          coversCount: covers.length,
          paintedOverBy: paintedOverBy.slice(0, maxItems),
          clipped,
          offScreen: anyOff ? offScreen : null,
          textOverflow
        });
      }
    }

    // Static collisions: visible text / controls that overlap each other.
    const staticCollisions = [];
    const cell = 64;
    const grid = new Map();
    targets.forEach((t, i) => {
      for (let gx = Math.floor(t.r.left / cell); gx <= Math.floor(t.r.right / cell); gx++)
        for (let gy = Math.floor(t.r.top / cell); gy <= Math.floor(t.r.bottom / cell); gy++) {
          const key = `${gx},${gy}`;
          if (!grid.has(key)) grid.set(key, []);
          grid.get(key).push(i);
        }
    });
    const seen = new Set();
    for (const bucket of grid.values()) {
      for (let a = 0; a < bucket.length; a++)
        for (let b = a + 1; b < bucket.length; b++) {
          const i = bucket[a];
          const j = bucket[b];
          const key = i < j ? `${i}-${j}` : `${j}-${i}`;
          if (seen.has(key)) continue;
          seen.add(key);
          const A = targets[i];
          const B = targets[j];
          if (related(A.el, B.el)) continue;
          // One side inside a floating or pinned layer and the other not: that is a layer
          // question (reported above), not a static collision.
          if (floating.some((f) => f.el.contains(A.el) !== f.el.contains(B.el))) continue;
          let o = null;
          for (const la of A.lines) for (const lb of B.lines) { const q = overlap(la, lb); if (q && (!o || q.area > o.area)) o = q; }
          if (!o || o.area < minArea) continue;
          const smaller = Math.min(A.r.width * A.r.height, B.r.width * B.r.height);
          if (o.area / smaller < 0.15) continue;
          // A small element drawn wholly inside a button (a count badge) is decoration of
          // that control, not a collision; a partial overlap still reports.
          const big = A.r.width * A.r.height >= B.r.width * B.r.height ? A : B;
          if (big.control && o.area / smaller > 0.99) continue;
          const top = topmostAt(o.x, o.y);
          staticCollisions.push({ a: describe(A.el), b: describe(B.el), area: Math.round(o.area), share: +(o.area / smaller).toFixed(2), onTop: top ? describe(top).slice(0, 60) : null });
          if (staticCollisions.length >= maxItems) break;
        }
      if (staticCollisions.length >= maxItems) break;
    }

    // Cells whose content runs out of the cell.
    const cellOverflow = [];
    for (const c of document.querySelectorAll('td, th, [role=cell], [role=gridcell], [role=columnheader], [role=rowheader]')) {
      if (!isVisible(c)) continue;
      const cr = rect(c);
      if (cr.bottom < 0 || cr.top > vh) continue;
      for (const k of c.querySelectorAll('*')) {
        if (!isVisible(k) || kindOf(k)) continue;
        if (floating.some((f) => f.el.contains(k))) continue;
        const kr = rect(k);
        const out = Math.max(kr.right - cr.right, cr.left - kr.left, kr.bottom - cr.bottom);
        if (out > 2 && getComputedStyle(c).overflow === 'visible') {
          cellOverflow.push({ cell: describe(c).slice(0, 80), child: describe(k).slice(0, 80), overflowPx: Math.round(out) });
          break;
        }
      }
      if (cellOverflow.length >= maxItems) break;
    }

    let focus = null;
    if (active) {
      const ar = rect(active);
      let hidden = 0;
      for (const { el, kind } of floating) {
        if (kind !== 'fixed' && kind !== 'sticky') continue;
        if (related(el, active)) continue;
        const o = overlap(ar, rect(el));
        if (o) hidden = Math.max(hidden, o.area / (ar.width * ar.height));
      }
      focus = { el: describe(active), hiddenShare: +hidden.toFixed(2) };
    }

    return {
      url: location.href,
      viewport: `${vw}x${vh}`,
      lang: document.documentElement.lang || null,
      pageHScroll: Math.max(0, document.documentElement.scrollWidth - vw),
      floating: floatingOut.slice(0, maxItems),
      staticCollisions,
      cellOverflow,
      focus
    };
  };

  // Opens each ⓘ term tip on the page in turn by keyboard focus (the way a keyboard user
  // opens it), scans with it open, and returns only the tips that collide, clip, leave the
  // screen or overflow their box. Focus is the only action; nothing is clicked or typed.
  // uiOverlapScanTips({ max: 30 }) — one tip per distinct label.
  window.uiOverlapScanTips = async (opts = {}) => {
    const max = opts.max ?? 30;
    const seenLabels = new Set();
    const buttons = Array.from(document.querySelectorAll('button[aria-describedby]')).filter((b) => {
      const id = b.getAttribute('aria-describedby');
      const tip = id && document.getElementById(id);
      if (!tip || tip.getAttribute('role') !== 'tooltip') return false;
      const key = b.getAttribute('aria-label') || id;
      if (seenLabels.has(key)) return false;
      seenLabels.add(key);
      return true;
    });
    const out = [];
    for (const b of buttons.slice(0, max)) {
      b.scrollIntoView({ block: 'center', inline: 'nearest' });
      b.focus();
      // A background or unfocused window sets focus without firing focus events,
      // and a tip opened from JavaScript state (BL-301) listens for them.
      b.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
      await new Promise((r) => setTimeout(r, 120));
      // The visible box: the portal box (BL-301, data-tip-popup) when there is one,
      // else the in-place role=tooltip box of the earlier TermTip.
      const tip =
        document.querySelector('[data-tip-popup]') ||
        document.getElementById(b.getAttribute('aria-describedby'));
      const res = window.uiOverlapScan({ maxItems: 8 });
      const layer = res.floating.find((f) => f.kind === 'tooltip');
      const shown = tip && getComputedStyle(tip).display !== 'none' && tip.getBoundingClientRect().width > 8;
      if (!shown) out.push({ trigger: b.getAttribute('aria-label'), problem: 'did not open on focus' });
      else if (layer && (layer.coversCount || layer.clipped || layer.offScreen || layer.textOverflow))
        out.push({ trigger: b.getAttribute('aria-label'), covers: layer.covers.map((c) => c.el), clipped: layer.clipped, offScreen: layer.offScreen, textOverflow: layer.textOverflow });
      b.blur();
      b.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
    }
    window.scrollTo(0, 0);
    return { url: location.href, viewport: `${innerWidth}x${innerHeight}`, tipsTested: Math.min(buttons.length, max), tipsOnPage: buttons.length, flagged: out };
  };

  return window.uiOverlapScan();
})();
