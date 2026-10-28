// Columns pinned to the left or right edge of a shared `Table`, so the columns
// a row is identified by, or acted on from, stay on screen while the rest of
// the table scrolls under them. `TableCell` and `TableHeaderCell` apply these
// through their `pin` prop ('left' | 'right'); nothing else should spell them
// out.
//
// - Several columns may pin to each side. Left pins are the table's FIRST
//   columns and right pins its LAST, in that order; a pin in the middle of a
//   row would sit on top of its neighbours. A column before the left pins (a
//   row expander, say) scrolls away under them.
// - `Table` measures the pinned header cells and writes each pinned cell's
//   offset (`left` / `right`), and marks the pinned column nearest the
//   scrolling columns on each side with `data-pin-edge="true"`. The offsets are
//   measured because they are the widths of the columns pinned before them,
//   which only the browser knows.
// - A pinned cell paints the row's own background, so scrolled content never
//   shows through: white, the hover tint while the row is hovered
//   (`group/row` is set by `TableRow`), and the highlight tint on a highlighted
//   row (`HIGHLIGHTED_ROW_CLASS`, `bg-action-soft`). The header cell paints the
//   header band.
// - The edge column carries a 1px `border-subtle` divider on the side facing
//   the scrolling columns, so a column it covers reads as covered, not cut off.
//   It is a pseudo-element rather than a cell border because the shared
//   `Table` collapses borders, where a border is shared with the neighbour.
// - The edge column also carries a shadow on that side whenever the table is
//   wider than its container, at any scroll position, so a reader can see that
//   there are columns to scroll to. A table that fits shows no shadow: there is
//   nothing behind the pins to point at. `placePinnedColumns` sets
//   `data-overflow="true"` on the scroll container (`group/scroll`) when it
//   overflows. It is WeekGrid's pinned-column shadow, mirrored for the right
//   side.

const BASE = 'sticky z-[1]';

const EDGE_DIVIDER =
  "data-[pin-edge=true]:after:absolute data-[pin-edge=true]:after:inset-y-0 data-[pin-edge=true]:after:w-px data-[pin-edge=true]:after:bg-border-subtle data-[pin-edge=true]:after:content-['']";

const SIDE = {
  left: `${EDGE_DIVIDER} data-[pin-edge=true]:after:right-0 group-data-[overflow=true]/scroll:data-[pin-edge=true]:shadow-[4px_0_6px_-4px_rgba(13,27,42,0.18)]`,
  right: `${EDGE_DIVIDER} data-[pin-edge=true]:after:left-0 group-data-[overflow=true]/scroll:data-[pin-edge=true]:shadow-[-4px_0_6px_-4px_rgba(13,27,42,0.18)]`
};

const BODY_BG =
  'bg-bg-surface transition-colors group-[.bg-action-soft]/row:bg-action-soft group-hover/row:bg-bg-hover';

/** @typedef {'left' | 'right'} PinSide */

/**
 * @param {PinSide | undefined} pin
 * @returns {string}
 */
export const pinnedBodyClass = (pin) => (pin ? `${BASE} ${SIDE[pin]} ${BODY_BG}` : '');

/**
 * @param {PinSide | undefined} pin
 * @returns {string}
 */
export const pinnedHeaderClass = (pin) => (pin ? `${BASE} ${SIDE[pin]} bg-bg-hover` : '');

/**
 * Writes each pinned cell's offset, marks the edge column on each side, and
 * records on the scroll container whether the table overflows it. Called by
 * `Table` whenever its layout or rows change.
 * @param {HTMLTableElement} table
 */
export const placePinnedColumns = (table) => {
  const scroller = table.parentElement;
  if (scroller) {
    const overflow = scroller.scrollWidth > scroller.clientWidth + 1 ? 'true' : 'false';
    if (scroller.dataset.overflow !== overflow) scroller.dataset.overflow = overflow;
  }
  const head = table.tHead?.rows[0];
  if (!head) return;
  const cells = [...head.cells];
  const left = cells.filter((c) => c.dataset.pin === 'left');
  const right = cells.filter((c) => c.dataset.pin === 'right').reverse();
  if (left.length === 0 && right.length === 0) return;
  /** @type {Map<number, { side: PinSide, px: number, edge: boolean }>} */
  const offsets = new Map();
  /**
   * @param {HTMLTableCellElement[]} side
   * @param {PinSide} name
   */
  const stack = (side, name) => {
    let px = 0;
    side.forEach((c, i) => {
      offsets.set(c.cellIndex, { side: name, px, edge: i === side.length - 1 });
      px += c.getBoundingClientRect().width;
    });
  };
  stack(left, 'left');
  stack(right, 'right');
  for (const row of table.rows) {
    for (const cell of row.cells) {
      const o = cell.dataset.pin ? offsets.get(cell.cellIndex) : undefined;
      if (!o) continue;
      const value = `${o.px}px`;
      if (cell.style[o.side] !== value) cell.style[o.side] = value;
      const edge = o.edge ? 'true' : 'false';
      if (cell.dataset.pinEdge !== edge) cell.dataset.pinEdge = edge;
    }
  }
};
