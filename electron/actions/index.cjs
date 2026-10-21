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
  require('./text/case.cjs'),
  require('./text/codec.cjs'),
  require('./text/json.cjs'),
  require('./text/lines.cjs'),
  require('./text/time.cjs'),
];

const actions = modules.flat();

/** Rendering order of the groups inside the panel. */
const GROUP_ORDER = ['clean', 'case', 'codec', 'data', 'lines', 'time'];

const byId = new Map(actions.map((action) => [action.id, action]));

/**
 * Actions that make sense for the clipboard as it is right now.
 *
 * The panel is a menu of *what this content can become*, not a fixed toolbox:
 * an image hides every text action, and "To plain text" only shows up when the
 * clipboard really carries rich text.
 */
function listFor(input) {
  if (!input || input.kind === 'empty') return [];

  return actions
    .filter((action) => action.accepts.includes(input.kind))
    .filter((action) => !action.isAvailable || action.isAvailable(input))
    .map((action) => ({ id: action.id, group: action.group, title: action.title }));
}

function get(id) {
  return byId.get(id);
}

module.exports = { listFor, get, GROUP_ORDER, count: actions.length };
