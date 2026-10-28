import icons from './icon-data.js';

/**
 * Correctly spelled names for glyphs whose Figma layer names carry a typo or a duplicate. Both names render
 * the same glyph; the Figma spelling stays valid until the design file is renamed.
 */
export const ICON_ALIASES = {
  FileFilledIcon: "FileFiledIcon",
  WifiAvailableIcon: "WifiAvailbleIcon",
  CheckAltIcon: "CheckIcon2",
};

export function Icon({ name, size, ...rest }) {
  const d = icons[ICON_ALIASES[name] ?? name];
  if (!d) return null;
  return (
    <svg
      width={size}
      height={size}
      viewBox={d.viewBox}
      fill="none"
      // body strings are emitter-controlled <path> markup — geometry,
      // numeric fills and transforms only; no .fig-authored text reaches them.
      dangerouslySetInnerHTML={{ __html: d.body }}
      {...rest}
    />
  );
}
export default Icon;
