// PSC-4 (BL-339) — model A on Safety stock targets: the three buffers, the TWO
// per-material settings (Protection cover P, Material coverage), the event
// window, and the Material Buffer switch with its planner override and required
// reason (BR-07).
// Every expected figure is the read's; the assertions pin structure, the switch
// state and the ledger rows a change writes, never a hand-computed quantity.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { renderWithProviders, BUYER } from '@test/test-utils';
import BuyerSafetyStock from './BuyerSafetyStock';
import { osipParamStore } from '@services/data/mock/stores/osipParamStore';
import { eventCalendarStore } from '@services/transitions/eventCalendarStore';
import { ropOrderAuditStore } from '@services/data/mock/stores/ropOrderAuditStore';
import { consumptionStore } from '@services/data/mock/stores/consumptionStore';
import { goodsReceiptStore } from '@services/data/mock/stores/goodsReceiptStore';
import { sdcClock } from '@services/sdc';
import i18n from '@lib/i18n';

const MAT = 'RM-STEAR-7300';
const SUP = 'sup-002';
const ID = `sst-buffers-${SUP}`;

beforeEach(() => {
  sdcClock.reset();
  osipParamStore.reset();
  eventCalendarStore.reset();
  ropOrderAuditStore.reset();
  consumptionStore.reset();
  goodsReceiptStore.reset();
});
afterEach(() => {
  osipParamStore.reset();
  eventCalendarStore.reset();
  ropOrderAuditStore.reset();
  sdcClock.reset();
  void i18n.changeLanguage('en');
});

const openPanel = async () => {
  renderWithProviders(<BuyerSafetyStock />, {
    identity: BUYER,
    route: `/buyer/safety-stock?material=${MAT}`
  });
  return screen.findByTestId('sst-buffers');
};

describe('PSC-4 — the buffers on Safety stock targets', () => {
  it('shows the three buffers per supplier, the one cover setting (default 4) and the switch', async () => {
    const panel = await openPanel();
    expect(screen.getByTestId('sst-buffers-table')).toBeInTheDocument();
    // No LTP B and no LTP Festive uploaded: both read "Not available" (BR-08).
    expect(screen.getByTestId(`${ID}-protection`)).toHaveTextContent('Not available');
    expect(screen.getByTestId(`${ID}-festive`)).toHaveTextContent('Not available');
    // The Material Buffer is a quantity from LTP A (the forecast source here).
    expect(screen.getByTestId(`${ID}-material`)).not.toHaveTextContent('Not available');
    // Two settings (owner ruling 2026-11-19): cover P = 4, coverage = 2.
    expect(within(panel).getByTestId('sst-cover-weeks')).toHaveValue(4);
    expect(within(panel).getByTestId('sst-coverage-weeks')).toHaveValue(2);
    // The hub week is outside every seeded window: off, from the calendar.
    expect(screen.getByTestId('sst-material-switch-state')).toHaveTextContent('Off');
    expect(screen.getByTestId('sst-material-switch-source')).toHaveTextContent(
      'from the event calendar'
    );
    expect(screen.getByTestId('sst-event-window')).toHaveTextContent('No event window');
  });

  it('the event window switches it on inside the Typhoon window, from the calendar', async () => {
    // The seed carries a Typhoon window 2026-09-28..2026-10-12.
    sdcClock.set('2026-09-29T12:00:00.000Z');
    await openPanel();
    expect(screen.getByTestId('sst-material-switch-state')).toHaveTextContent('On');
    expect(screen.getByTestId('sst-event-window')).toHaveTextContent('Typhoon window');
    // On, so the Material Buffer enters the Strategic total.
    expect(screen.getByTestId(`${ID}-strategic`)).not.toHaveTextContent('Not available');
  });

  it('the Material coverage setting is its own value: saving 4 moves the Material Buffer', async () => {
    await openPanel();
    const before = screen.getByTestId(`${ID}-material`).textContent;
    fireEvent.change(screen.getByTestId('sst-coverage-weeks'), { target: { value: '4' } });
    fireEvent.click(screen.getByTestId('sst-coverage-save'));
    await waitFor(() =>
      expect(osipParamStore.all().map((r) => [r.key, r.value])).toEqual([
        [`coverageWeeks|${MAT}`, 4]
      ])
    );
    await waitFor(() => expect(screen.getByTestId(`${ID}-material`).textContent).not.toBe(before));
    expect(screen.getByTestId(`${ID}-material-basis`)).toHaveTextContent('4 weeks');
    // BR-10 — ROP-Order-only, audited with its inputs (DRC-D16).
    expect(ropOrderAuditStore.all().map((r) => [r.field, r.value])).toEqual([['coverageWeeks', 4]]);
  });

  it('the Protection cover setting is separate: saving 6 records its own row and leaves the Material figure', async () => {
    await openPanel();
    const before = screen.getByTestId(`${ID}-material`).textContent;
    fireEvent.change(screen.getByTestId('sst-cover-weeks'), { target: { value: '6' } });
    fireEvent.click(screen.getByTestId('sst-cover-save'));
    await waitFor(() =>
      expect(osipParamStore.all().map((r) => [r.key, r.value])).toEqual([[`coverWeeks|${MAT}`, 6]])
    );
    expect(screen.getByTestId(`${ID}-material`).textContent).toBe(before);
    expect(ropOrderAuditStore.all().map((r) => [r.field, r.value])).toEqual([['coverWeeks', 6]]);
  });

  it('the planner overrides the switch: a reason of 10+ characters, then the ledger row', async () => {
    await openPanel();
    fireEvent.change(screen.getByTestId('sst-material-pick'), { target: { value: 'on' } });
    const save = screen.getByTestId('sst-material-save');
    expect(save).toBeDisabled();
    fireEvent.change(screen.getByTestId('sst-material-reason'), {
      target: { value: 'short' }
    });
    expect(save).toBeDisabled();
    fireEvent.change(screen.getByTestId('sst-material-reason'), {
      target: { value: 'Stock ahead of the storm season' }
    });
    expect(save).toBeEnabled();
    fireEvent.click(save);
    await waitFor(() =>
      expect(osipParamStore.all().map((r) => [r.key, r.value, r.reason])).toEqual([
        [`materialBufferOn|${MAT}`, true, 'Stock ahead of the storm season']
      ])
    );
    await waitFor(() =>
      expect(screen.getByTestId('sst-material-switch-state')).toHaveTextContent('On')
    );
    expect(screen.getByTestId('sst-material-switch-source')).toHaveTextContent(
      'from the planner override'
    );
    // Cleared back to the calendar: the second row's value is null.
    fireEvent.change(screen.getByTestId('sst-material-pick'), { target: { value: 'calendar' } });
    fireEvent.change(screen.getByTestId('sst-material-reason'), {
      target: { value: 'Follow the calendar again' }
    });
    fireEvent.click(screen.getByTestId('sst-material-save'));
    await waitFor(() => expect(osipParamStore.all()).toHaveLength(2));
    expect(osipParamStore.all()[1]).toMatchObject({
      key: `materialBufferOn|${MAT}`,
      value: null
    });
  });

  it('a seat without osipparam:set reads the buffers and the settings, and cannot change them', async () => {
    renderWithProviders(<BuyerSafetyStock />, {
      identity: { ...BUYER, businessRoles: ['procurement'] },
      route: `/buyer/safety-stock?material=${MAT}`
    });
    await screen.findByTestId('sst-buffers');
    expect(screen.getByTestId('sst-cover-weeks')).toBeDisabled();
    expect(screen.getByTestId('sst-coverage-weeks')).toBeDisabled();
    expect(screen.queryByTestId('sst-cover-save')).toBeNull();
    expect(screen.queryByTestId('sst-coverage-save')).toBeNull();
    expect(screen.getByTestId('handoff-cover-setting')).toBeInTheDocument();
    expect(screen.queryByTestId('sst-material-save')).toBeNull();
    expect(screen.getByTestId(`${ID}-protection`)).toHaveTextContent('Not available');
  });

  it('reads in Indonesian', async () => {
    await i18n.changeLanguage('id');
    await openPanel();
    expect(screen.getByTestId('sst-buffers')).toHaveTextContent('Buffer (model A)');
  });
});
