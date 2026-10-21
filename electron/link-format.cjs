'use strict';

/**
 * How a link is written back to the clipboard after an upload.
 *
 * The formats are the ones people actually paste into: a bare URL, a Markdown
 * image, an HTML tag, or BBCode for forums.
 */

function formatLink(url, format) {
  switch (format) {
    case 'markdown':
      return `![](${url})`;
    case 'html':
      return `<img src="${url}">`;
    case 'bbcode':
      return `[img]${url}[/img]`;
    default:
      return url;
  }
}

module.exports = { formatLink };
