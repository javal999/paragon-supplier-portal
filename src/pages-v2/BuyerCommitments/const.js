// BuyerCommitments — module-scope constants and the page's shared typedefs.
// Moved out of the page file unchanged (frontend-standard Phase 5 split).
import { FIELD_FOCUS_RING } from '@components/forecast/focusRing';
import { inputClass } from '../inventory/inventoryDisplay';
/** @import { ForecastCommitmentLine } from '@services/data/types' */

// C2 (WCAG 2.4.7): the shared field class shows focus only as a 1 px border
// tint; the forecast fields add a ring.
export const fieldClass = `${inputClass} ${FIELD_FOCUS_RING}`;

/**
 * The planner action the side panel stands open on, and the line it acts on.
 * @typedef {{ kind: 'accept' | 'revise' | 'reassign'; line: ForecastCommitmentLine }} Action
 */
