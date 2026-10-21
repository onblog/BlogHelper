'use strict';

/**
 * Format conversions — the ones a writer switches between all day.
 *
 * Rich text → plain / Markdown, and Markdown → rich text. The rich direction
 * returns both flavours so the clipboard carries `text/html` and `text/plain`
 * at once: paste into Word and it is formatted, paste into a terminal and it is
 * still the Markdown source.
 */

const { stripHtml } = require('../html.cjs');
const { toHtml } = require('../../convert/markdown-to-html.cjs');
const { toMarkdown } = require('../../convert/html-to-markdown.cjs');

/** Does this read like Markdown rather than prose? */
function looksLikeMarkdown(text) {
  return /(^#{1,6}\s)|\*\*[^*\n]{1,200}\*\*|^\s*[-*+]\s+\S|\]\([^)]+\)|^\s*```/m.test(text);
}

const actions = [
  {
    id: 'convert.plain',
    group: 'convert',
    title: { zh: '转纯文本', en: 'To plain text' },
    accepts: ['text'],
    isAvailable: (input) => Boolean(input.html),
    run: (input) => {
      const text = stripHtml(input.html);
      return text ? { text } : { error: 'empty_result' };
    },
  },
  {
    id: 'convert.markdown',
    group: 'convert',
    title: { zh: '转 Markdown', en: 'To Markdown' },
    accepts: ['text'],
    isAvailable: (input) => Boolean(input.html),
    run: (input) => {
      const text = toMarkdown(input.html);
      return text ? { text } : { error: 'empty_result' };
    },
  },
  {
    id: 'convert.richtext',
    group: 'convert',
    title: { zh: '转富文本', en: 'To rich text' },
    accepts: ['text'],
    isAvailable: (input) => looksLikeMarkdown(input.text),
    run: (input) => {
      const html = toHtml(input.text);
      if (!html) return { error: 'empty_result' };
      return { text: input.text, html, toast: 'convert.richDone' };
    },
  },
];

module.exports = { actions, looksLikeMarkdown };
