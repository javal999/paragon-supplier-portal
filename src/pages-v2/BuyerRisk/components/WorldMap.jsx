/** @import React from 'react' */
import { useTranslation } from 'react-i18next';
import { CHART_SEMANTIC, CHART_IDENTITY, MAP_BASE } from '@lib/chartPalette';

// DP2-PALETTE-01 (Commit 4): chart/map colour sourced from the central palette
// (SSoT), not page-local hex. Values unchanged except the stray categorical blue
// (#1E5BAE) — that TOKEN_INFO is removed; DC/hub markers now use the sanctioned
// identity blue CHART_IDENTITY (#2A6FBF).
const TOKEN_SUCCESS = CHART_SEMANTIC.success;
const TOKEN_WARNING = CHART_SEMANTIC.warning;
const TOKEN_DANGER = CHART_SEMANTIC.danger;
const TOKEN_MUTED = CHART_SEMANTIC.neutral;

// MAP-BASE-AXIS-01 — the SUBSTRATE axis, bound in the same idiom as the STATE
// axis above. These are the geography the risk dots are plotted ON; they are
// deliberately NOT CHART_SEMANTIC values, because this map's legend gives
// CHART_SEMANTIC a meaning (critical / high / low / hub) that a landmass does
// not carry. Byte-identical to what this page rendered before the ramp existed.
const MAP_LAND = MAP_BASE.land;
const MAP_LAND_STROKE = MAP_BASE.landStroke;
const MAP_LAND_HIGHLIGHT = MAP_BASE.highlight;
const MAP_LAND_HIGHLIGHT_STROKE = MAP_BASE.highlightStroke;

/**
 * The illustrative supply-risk world map: a stylised SVG landmass with one
 * risk dot per region (critical / high / low / hub) and its legend. Every
 * colour is bound from `chartPalette` above; no props.
 * @type {React.FC}
 */
const WorldMap = () => {
  const { t } = useTranslation();
  const dots = [
    { label: t('risk.map.region.taiwan'), cx: 745, cy: 185, color: TOKEN_DANGER, size: 8 },
    { label: t('risk.map.region.china'), cx: 720, cy: 175, color: TOKEN_DANGER, size: 6 },
    { label: t('risk.map.region.redSea'), cx: 590, cy: 210, color: TOKEN_WARNING, size: 7 },
    { label: t('risk.map.region.ukraine'), cx: 555, cy: 140, color: TOKEN_WARNING, size: 5 },
    { label: t('risk.map.region.saudiArabia'), cx: 600, cy: 220, color: TOKEN_WARNING, size: 5 },
    { label: t('risk.map.region.germany'), cx: 510, cy: 135, color: TOKEN_SUCCESS, size: 4 },
    { label: t('risk.map.region.mexico'), cx: 195, cy: 225, color: TOKEN_SUCCESS, size: 4 },
    { label: t('risk.map.region.dallas'), cx: 190, cy: 215, color: CHART_IDENTITY, size: 5 }
  ];
  return (
    <div className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm p-5">
      <div className="text-sm font-semibold text-text-primary mb-3">{t('risk.map.title')}</div>
      <svg viewBox="0 0 900 440" className="w-full h-auto max-h-80">
        <rect width="900" height="440" className="fill-bg-page" rx="6" />
        <path
          d="M80 80 L280 80 L310 140 L290 200 L260 240 L200 260 L160 250 L120 230 L80 200 L60 160 Z"
          fill={MAP_LAND}
          stroke={MAP_LAND_STROKE}
          strokeWidth="1"
        />
        <path
          d="M170 270 L240 270 L250 290 L240 360 L200 400 L170 390 L155 350 L150 310 Z"
          fill={MAP_LAND}
          stroke={MAP_LAND_STROKE}
          strokeWidth="1"
        />
        <path
          d="M460 80 L580 80 L585 120 L570 160 L540 165 L490 160 L460 140 Z"
          fill={MAP_LAND}
          stroke={MAP_LAND_STROKE}
          strokeWidth="1"
        />
        <path
          d="M490 180 L580 180 L595 230 L580 340 L540 380 L500 370 L475 320 L470 250 Z"
          fill={MAP_LAND}
          stroke={MAP_LAND_STROKE}
          strokeWidth="1"
        />
        <path
          d="M575 185 L640 185 L645 230 L610 245 L575 240 Z"
          fill={MAP_LAND_HIGHLIGHT}
          stroke={MAP_LAND_HIGHLIGHT_STROKE}
          strokeWidth="1"
        />
        <path
          d="M640 80 L810 80 L820 160 L800 200 L760 210 L700 200 L655 170 L645 130 Z"
          fill={MAP_LAND}
          stroke={MAP_LAND_STROKE}
          strokeWidth="1"
        />
        <path
          d="M700 210 L770 210 L775 250 L740 270 L700 255 Z"
          fill={MAP_LAND}
          stroke={MAP_LAND_STROKE}
          strokeWidth="1"
        />
        <path
          d="M720 300 L820 300 L830 380 L770 400 L720 380 Z"
          fill={MAP_LAND}
          stroke={MAP_LAND_STROKE}
          strokeWidth="1"
        />
        {dots.map((d) => (
          <g key={d.label}>
            <circle cx={d.cx} cy={d.cy} r={d.size + 4} fill={d.color} opacity={0.2} />
            <circle cx={d.cx} cy={d.cy} r={d.size} fill={d.color} />
            <title>{d.label}</title>
          </g>
        ))}
        {[
          { color: TOKEN_DANGER, label: t('risk.map.legend.critical') },
          { color: TOKEN_WARNING, label: t('risk.map.legend.high') },
          { color: TOKEN_SUCCESS, label: t('risk.map.legend.low') },
          { color: CHART_IDENTITY, label: t('risk.map.legend.hub') }
        ].map((l, i) => (
          <g key={l.label} transform={`translate(20, ${360 + i * 16})`}>
            <circle r={4} cx={6} cy={0} fill={l.color} />
            <text x={14} y={4} fontSize={11} fill={TOKEN_MUTED}>
              {l.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
};

export default WorldMap;
