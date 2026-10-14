// The RFQ wizard's review rows for the authoring half (provenance, items, options).
// Split out of `sourcing/RfqAuthoring.jsx` (frontend-standard Phase 5).

/** @import React from 'react' */
/** @import { TFunction } from 'i18next' */
/** @import { RfqQuantityTier } from '@services/sourcing/rfqModel' */
/** @import { RfqAuthoringDraft, RfqDraftSeed } from '../rfqDraft' */
import Data from '@components/ui-v2/Data';
import { formatDate, formatNumber } from '@lib/format';
import { rfqItemType } from '@services/sourcing/rfqItemTypes';

/** @typedef {[string, React.ReactNode]} Row */

/**
 * The review rows the authoring half adds: provenance, items, and the rest.
 * @param {TFunction} t
 * @param {RfqAuthoringDraft} d
 * @param {RfqDraftSeed['origin'] | undefined} origin
 * @returns {{ basics: Row[]; items: Row[]; options: Row[] }}
 */
export function authoringReviewRows(t, d, origin) {
  /** @param {boolean} v */
  const yesNo = (v) => t(v ? 'rfqAuthoring.review.yes' : 'rfqAuthoring.review.no');
  /** @param {readonly RfqQuantityTier[]} tiers */
  const tierList = (tiers) =>
    tiers.length === 0 ? (
      t('rfqAuthoring.review.none')
    ) : (
      <Data>
        {tiers
          .map((x) => `${formatNumber(x.qty)} ${t(`rfqAuthoring.basis.${x.basis}`)}`)
          .join(' · ')}
      </Data>
    );
  const files = d.attachments.length + d.items.reduce((s, i) => s + i.attachments.length, 0);
  return {
    basics: [
      ...(origin
        ? /** @type {Row[]} */ ([
            [
              t('rfqAuthoring.review.row.origin'),
              t(`rfqAuthoring.review.origin.${origin.kind}`, { label: origin.label })
            ]
          ])
        : []),
      [t('rfqAuthoring.review.row.project'), d.projectName.trim() || '—']
    ],
    items: d.items.map((item, i) => [
      t('rfqAuthoring.review.row.item', { n: i + 1 }),
      <span key={item.uid} data-testid={`rfq-review-item-${i + 1}`}>
        {t('rfqAuthoring.review.item', {
          type: t(rfqItemType(item.itemType).labelKey),
          description: item.description.trim() || '—',
          variants: item.variantCount || '—'
        })}
        {item.ownTiers && (
          <>
            {' · '}
            {tierList(item.tiers)}
          </>
        )}
      </span>
    ]),
    options: [
      [
        t('rfqAuthoring.review.row.tiers'),
        <span key="tiers" data-testid="rfq-review-tiers">
          {tierList(d.tiers)}
        </span>
      ],
      [
        t('rfqAuthoring.review.row.questions'),
        d.questions.length === 0
          ? t('rfqAuthoring.review.none')
          : d.questions.map((q) => t(q.promptKey)).join(' · ')
      ],
      [t('rfqAuthoring.review.row.alternatives'), yesNo(d.allowAlternatives)],
      [
        t('rfqAuthoring.review.row.samples'),
        d.samplesOn
          ? t('rfqAuthoring.review.samples', {
              qty: d.samplesQty,
              date: d.samplesNeededBy ? formatDate(d.samplesNeededBy) : '—'
            })
          : t('rfqAuthoring.review.no')
      ],
      [t('rfqAuthoring.review.row.confidential'), yesNo(d.confidential)],
      [
        t('rfqAuthoring.review.row.files'),
        files === 0 ? t('rfqAuthoring.review.none') : <Data key="files">{files}</Data>
      ]
    ]
  };
}
