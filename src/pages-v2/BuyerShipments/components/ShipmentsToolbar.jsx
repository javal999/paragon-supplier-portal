/** @import React from 'react' */
/** @import { TFunction } from 'i18next' */
/** @import { ShipmentMode } from '@data/mockShipments' */
/** @import { useModeLabel } from '@hooks/useModeLabel' */
import FilterChipsBar from '@components/ui-v2/FilterChipsBar';
import SearchBar from '@components/ui-v2/SearchBar';

/**
 * @typedef {object} ShipmentsToolbarProps
 * @property {string} search  The search box text (page state).
 * @property {(value: string) => void} onSearchChange
 * @property {ShipmentMode[]} selectedModes  The mode chips switched on (page state).
 * @property {(m: ShipmentMode) => void} onToggleMode
 * @property {ReturnType<typeof useModeLabel>} ml  The mode-label translator.
 * @property {TFunction} t
 */

/**
 * The search box and the Sea / Air / Road mode chips above the table. Moved
 * out of `BuyerShipments.jsx` by the Phase 5 page split (no behaviour change).
 * @type {React.FC<ShipmentsToolbarProps>}
 */
const ShipmentsToolbar = ({ search, onSearchChange, selectedModes, onToggleMode, ml, t }) => (
  <div className="flex flex-wrap items-center gap-3 mb-4">
    <div className="flex-1 min-w-[280px]">
      <SearchBar
        value={search}
        onChange={onSearchChange}
        placeholder={t('shipments.search.placeholder')}
      />
    </div>
    {/* SEAT2-I18N-MODE-01: the chip `id` stays canonical EN (it is matched
        against `s.mode` data); only the display label localizes via the
        central modeLabel map. Same display-vs-data split as statusLabel. */}
    <FilterChipsBar
      options={[
        { id: 'Sea', label: ml('Sea') },
        { id: 'Air', label: ml('Air') },
        { id: 'Road', label: ml('Road') }
      ]}
      value={selectedModes}
      onChange={onToggleMode}
      multiSelect
    />
  </div>
);

export default ShipmentsToolbar;
