/**
 * Hand-drawn action icons.
 *
 * Sticker style: 20×20, 2px dark stroke, round caps, and one accent shape per
 * icon so a column of them stays friendly without turning into confetti.
 */

const AMBER = '#FFB020';
const CORAL = '#FF6B6B';
const MINT = '#7BC47F';
const SKY = '#5AB0FF';

function svg(body, { accent = AMBER } = {}) {
  return `<svg viewBox="0 0 20 20" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" data-accent="${accent}">${body}</svg>`;
}

const ICONS = {
  'convert.plain': svg(
    '<rect x="4" y="3" width="12" height="14" rx="2.5"/><path d="M7 7h6M7 10.5h6M7 14h3.5"/>',
  ),
  'convert.markdown': svg(
    `<path d="M6.5 4v9.5M6.5 13.5l-2.4-2.4M6.5 13.5l2.4-2.4"/><path d="M11.5 6.5h5M11.5 10h5" stroke="${SKY}"/>`,
  ),
  'convert.richtext': svg(
    `<path d="M4 15V7a2 2 0 0 1 2-2h5l5 5v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" stroke-width="2"/><path d="M8.5 12l1.7-4 1.7 4M9.2 10.7h2" stroke="${MINT}"/>`,
  ),
  'clean.trim': svg(
    '<circle cx="6" cy="6.5" r="1.8"/><circle cx="6" cy="13.5" r="1.8"/><path d="M7.6 7.6L16 15M7.6 12.4L16 5"/>',
    { accent: CORAL },
  ),
  'clean.blank-lines': svg(
    `<path d="M4 4.5h12M4 8h12"/><path d="M4 15.5h12"/><path d="M8.5 11.5h3" stroke="${AMBER}"/>`,
  ),
  'clean.one-line': svg(
    `<path d="M4 4.5h12M4 15.5h12"/><path d="M4 10h8"/><path d="M13.5 10h3M15 8.2l1.8 1.8-1.8 1.8" stroke="${AMBER}"/>`,
  ),
  'clean.strip-numbers': svg(
    `<path d="M4 5.5h2.5M4 10h2.5M4 14.5h2.5"/><path d="M9.5 5.5h7M9.5 10h7M9.5 14.5h7" stroke="${CORAL}"/><path d="M9 15L16.5 4.5" stroke="${CORAL}" stroke-width="1.6"/>`,
  ),
  'clean.invisible': svg(
    `<path d="M5 16V9a5 5 0 0 1 10 0v7"/><path d="M5 16h10a1 1 0 0 0 0-2H5a1 1 0 0 0 0 2z"/><circle cx="8.2" cy="9.5" r="0.9" fill="currentColor" stroke="none"/><circle cx="11.8" cy="9.5" r="0.9" fill="currentColor" stroke="none"/>`,
    { accent: MINT },
  ),
  'clean.strip-markdown': svg(
    `<path d="M5.5 7l2.5 3-2.5 3M9 7l2.5 3L9 13"/><path d="M13 7l2.5 3L13 13"/><path d="M4 16L16 4" stroke="${CORAL}" stroke-width="1.8"/>`,
    { accent: CORAL },
  ),
  'typography.cjk-spacing': svg(
    `<path d="M4 5v10M2 10h4M8 5h1.5M8.5 5v10M6.8 10h3.4"/><path d="M14 6.5l2.5 7M13 11h5" stroke="${SKY}"/>`,
  ),
  'typography.fullwidth': svg(
    `<path d="M5 12.5a1.6 1.6 0 1 0 0 3.2 1.6 1.6 0 0 0 1.3-2.5L5.6 15"/><path d="M13 5.5a2.2 2.2 0 1 0 0 4.4 2.2 2.2 0 0 0 1.8-3.5L13 8.5" stroke="${AMBER}" stroke-width="2.4"/>`,
  ),
  'list.dedupe': svg(
    `<rect x="4" y="4" width="6.5" height="6.5" rx="1.8"/><rect x="9.5" y="9.5" width="6.5" height="6.5" rx="1.8"/><path d="M13.5 4.5l2 2M15.5 4.5l-2 2" stroke="${CORAL}"/>`,
  ),
  'list.sort': svg(
    `<path d="M5 15V10M9 15V7M13 15v-3.5"/><path d="M16 5v10M14.3 6.7L16 5l1.7 1.7" stroke="${MINT}"/>`,
    { accent: MINT },
  ),
  'link.strip-tracking': svg(
    `<path d="M8.5 11.5l3-3"/><path d="M9.5 6l1.3-1.3a3 3 0 0 1 4.2 4.2L13.7 10"/><path d="M10.3 10l-1.3 1.3a3 3 0 0 1-4.2-4.2L6 6"/>`,
    { accent: SKY },
  ),
  'link.extract': svg(
    `<path d="M4.5 13.5l5-5"/><path d="M8 5.5h3.5a3.5 3.5 0 0 1 0 7H9" stroke="${SKY}"/><path d="M13.5 11.5l3 3M16.5 12.2v2.3h-2.3" stroke="${SKY}"/>`,
  ),
  'image.upload': svg(
    `<path d="M6 15.5h8a3.2 3.2 0 0 0 .4-6.4A4.2 4.2 0 0 0 6.7 8 3.4 3.4 0 0 0 6 15.5z"/><path d="M10 14V8.5M7.8 10.7L10 8.5l2.2 2.2" stroke="${SKY}"/>`,
    { accent: SKY },
  ),
  'text.edit': svg(
    `<path d="M4.5 5.5h7M4.5 9h5M4.5 12.5h3"/><path d="M13.2 7.6l1.9 1.9-5.4 5.4-2.4.5.5-2.4 5.4-5.4z" stroke="${CORAL}"/>`,
    { accent: CORAL },
  ),
  'text.restore': svg(
    `<rect x="6.5" y="3.5" width="9" height="11" rx="2"/><path d="M13.5 6.5H6a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h7.5" stroke="${AMBER}"/>`,
    { accent: AMBER },
  ),
  'image.restore': svg(
    `<rect x="3" y="4.5" width="9.5" height="9.5" rx="2"/><path d="M8 9.2h5.5a2.3 2.3 0 0 1 2.3 2.3v2.2a2.3 2.3 0 0 1-2.3 2.3H9.5" stroke="${CORAL}"/><path d="M11.6 14.2L9.6 16l2 1.8" stroke="${CORAL}"/>`,
    { accent: CORAL },
  ),
  'image.save': svg(
    `<path d="M4 12.5v2.5a1.5 1.5 0 0 0 1.5 1.5h9A1.5 1.5 0 0 0 16 15v-2.5"/><path d="M10 3.5v9M7.3 10l2.7 2.7L12.7 10" stroke="${MINT}"/>`,
    { accent: MINT },
  ),
  'image.edit': svg(
    `<path d="M14 3.5l2.5 2.5-8 8-3.5 1 1-3.5 8-8z"/><path d="M12.5 5l2.5 2.5" stroke="${AMBER}"/>`,
  ),
};

const GROUP_ICONS = {
  convert: svg('<path d="M4 7h9M4 13h9"/><path d="M13 4.5L16 7l-3 2.5M13 10.5L16 13l-3 2.5" stroke-width="1.8"/>', {
    accent: SKY,
  }),
  clean: svg('<path d="M5 16l6-6"/><path d="M9.5 8.5l4.5-5 2 2-5 4.5"/><path d="M4 16h3" stroke-width="2.4"/>', {
    accent: CORAL,
  }),
  typography: svg('<path d="M4 15l3-9 3 9M5.2 12h3.6"/><path d="M13 15V8h2a2 2 0 0 1 0 4h-2" stroke-width="1.8"/>', {
    accent: AMBER,
  }),
  list: svg('<path d="M4 6h3M4 10h3M4 14h3"/><path d="M9.5 6h7M9.5 10h7M9.5 14h7" stroke-width="1.8"/>', {
    accent: MINT,
  }),
  link: svg('<path d="M8.5 11.5l3-3"/><path d="M9.5 6l1.3-1.3a3 3 0 0 1 4.2 4.2L13.7 10"/><path d="M10.3 10l-1.3 1.3a3 3 0 0 1-4.2-4.2L6 6"/>', {
    accent: SKY,
  }),
  image: svg('<rect x="3" y="4.5" width="14" height="11" rx="2.5"/><circle cx="7.5" cy="8.5" r="1.3"/><path d="M4.5 13.5l4-4 3 3 2-2 2.5 2.5"/>', {
    accent: AMBER,
  }),
};

/** Icon markup for an action id, falling back to a neutral dot. */
export function actionIcon(id) {
  return ICONS[id] ?? svg('<circle cx="10" cy="10" r="3.5"/>');
}

/** Icon markup for a group id. */
export function groupIcon(group) {
  return GROUP_ICONS[group] ?? svg('<circle cx="10" cy="10" r="3.5"/>');
}
