// RFx UX X-01 (owner ruling Q8, 2026-10-19) — one name per module, in both
// languages: the menu's acronym leads the page title and the To do row, and the
// section header reads "Pengadaan" in Bahasa Indonesia.
import { describe, expect, it } from 'vitest';
import { hubEn, hubId } from './hub';
import { rfxEn, rfxId } from './rfx';
import { rfqsEn, rfqsId } from './rfqs';
import { sourcingEn, sourcingId } from './sourcing';

describe('X-01 — one name per module', () => {
  it('the menu keeps the acronyms: RFI · RFQ · RFP (buyer) and their invitations (supplier)', () => {
    expect([hubEn['hub.nav.pti.rfi'], hubEn['hub.nav.pti.rfq'], hubEn['hub.nav.pti.rfp']]).toEqual([
      'RFI',
      'RFQ',
      'RFP'
    ]);
    expect([
      hubEn['hub.nav.sup.rfiInvitations'],
      hubEn['hub.nav.sup.rfqInvitations'],
      hubEn['hub.nav.sup.rfpInvitations']
    ]).toEqual(['RFI invitations', 'RFQ invitations', 'RFP invitations']);
  });

  it('page titles lead with the acronym, EN and ID', () => {
    expect([
      rfxEn['rfx.rfi.title'],
      rfxEn['rfx.rfi.supplier.title'],
      sourcingEn['sourcing.header.title'],
      rfqsEn['rfqs.header.title'],
      rfxEn['rfx.rfp.title'],
      rfxEn['rfx.rfp.supplier.title']
    ]).toEqual([
      'RFI · Information requests',
      'RFI · Information requests',
      'RFQ · Quotation requests',
      'RFQ · Quotation requests',
      'RFP · Proposal requests',
      'RFP · Proposal requests'
    ]);
    expect([
      rfxId['rfx.rfi.title'],
      sourcingId['sourcing.header.title'],
      rfqsId['rfqs.header.title'],
      rfxId['rfx.rfp.title']
    ]).toEqual([
      'RFI · Permintaan informasi',
      'RFQ · Permintaan penawaran harga',
      'RFQ · Permintaan penawaran harga',
      'RFP · Permintaan proposal'
    ]);
  });

  it('the To do rows name the module the menu names, EN and ID', () => {
    const keys = [
      'hub.home.task.sup.rfq',
      'hub.home.task.rfiToAnswer',
      'hub.home.task.rfpToAnswer',
      'hub.home.task.revisedQuote'
    ];
    expect(keys.map((k) => hubEn[k])).toEqual([
      'RFQ invitations to answer',
      'RFI to answer',
      'RFP to answer',
      'RFQ round to answer'
    ]);
    expect(keys.map((k) => hubId[k])).toEqual([
      'Undangan RFQ untuk dijawab',
      'RFI untuk dijawab',
      'RFP untuk dijawab',
      'Putaran RFQ untuk dijawab'
    ]);
    // KNOWN-BAD — the old fourth name for the RFQ module is gone in both languages.
    expect(Object.values(hubEn)).not.toContain('Sourcing invitations to answer');
    expect(Object.values(hubId)).not.toContain('Undangan sourcing yang perlu dijawab');
  });

  it('the section header is "Sourcing" in English and "Pengadaan" in Bahasa Indonesia', () => {
    expect(hubEn['hub.nav.section.sourcing']).toBe('Sourcing');
    expect(hubId['hub.nav.section.sourcing']).toBe('Pengadaan');
  });
});
