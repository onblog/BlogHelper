'use strict';

/**
 * The action registry.
 *
 * Adding a tool means adding one file here — no UI change, no IPC change.
 * Actions only declare: id, group, bilingual title, which clipboard kinds they
 * accept, an optional availability predicate, and the pure transform.
 */

const modules = [
  require('./text/clean.cjs'),
  require('./text/typography.cjs'),
  require('./text/list.cjs'),
  require('./text/link.cjs'),
  require('./image.cjs'),
];

const actions = modules.flat();

/**
 * Rendering order of the groups inside the panel.
 *
 * Grouped by what a person is trying to do, not by which technology is
 * involved — the audience is anyone who copies text, not just developers.
 */
const GROUP_ORDER = ['clean', 'typography', 'list', 'link', 'image'];

const byId = new Map(actions.map((action) => [action.id, action]));

/**
 * Actions that make sense for the clipboard as it is right now.
 *
 * The panel is a menu of *what this content can become*, not a fixed toolbox:
 * an image hides every text action, and "To plain text" only shows up when the
 * clipboard really carries rich text.
 */
function listFor(input, ctx) {
  if (!input || input.kind === 'empty') return [];

  return actions
    .filter((action) => action.accepts.includes(input.kind))
    .filter((action) => !action.isAvailable || action.isAvailable(input, ctx))
    .map((action) => ({ id: action.id, group: action.group, title: action.title }));
}

function get(id) {
  return byId.get(id);
}

module.exports = { listFor, get, GROUP_ORDER, count: actions.length };
