'use strict';

/**
 * Markdown → HTML.
 *
 * Hand-written on purpose: the subset writers actually paste (headings,
 * bold/italic, links, images, lists, quotes, code, rules, tables) is small, and
 * a dependency for it would cost more than it is worth.
 *
 * The HTML is written to the clipboard as the `text/html` flavour, so pasting
 * into Word, WeChat or Mail keeps the formatting.
 */

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };

function escapeHtml(text) {
  return String(text).replace(/[&<>"]/g, (char) => ESCAPES[char]);
}

/** Inline rules. Code spans are protected first so nothing rewrites them. */
function inline(text) {
  const codes = [];
  let out = escapeHtml(text).replace(/`([^`]+)`/g, (_match, code) => {
    codes.push(code);
    return `\u0000${codes.length - 1}\u0000`;
  });

  out = out
    .replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, '<img src="$2" alt="$1">')
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2">$1</a>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/__([^_]+)__/g, '<strong>$1</strong>')
    .replace(/~~([^~]+)~~/g, '<del>$1</del>')
    .replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>')
    .replace(/(^|[^_])_([^_\n]+)_/g, '$1<em>$2</em>');

  return out.replace(/\u0000(\d+)\u0000/g, (_match, index) => `<code>${codes[Number(index)]}</code>`);
}

function splitRow(line) {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim());
}

function toHtml(markdown) {
  const lines = String(markdown).replace(/\r\n?/g, '\n').split('\n');
  const blocks = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];

    if (/^\s*```/.test(line)) {
      const language = line.replace(/^\s*```/, '').trim();
      const body = [];
      index += 1;
      while (index < lines.length && !/^\s*```/.test(lines[index])) {
        body.push(lines[index]);
        index += 1;
      }
      index += 1;
      const className = language ? ` class="language-${escapeHtml(language)}"` : '';
      blocks.push(`<pre><code${className}>${escapeHtml(body.join('\n'))}</code></pre>`);
      continue;
    }

    if (!line.trim()) {
      index += 1;
      continue;
    }

    const heading = /^(#{1,6})\s+(.*)$/.exec(line);
    if (heading) {
      const level = heading[1].length;
      blocks.push(`<h${level}>${inline(heading[2].trim())}</h${level}>`);
      index += 1;
      continue;
    }

    if (/^\s*([-*_])(\s*\1){2,}\s*$/.test(line)) {
      blocks.push('<hr>');
      index += 1;
      continue;
    }

    if (/^\s*>/.test(line)) {
      const quoted = [];
      while (index < lines.length && /^\s*>/.test(lines[index])) {
        quoted.push(lines[index].replace(/^\s*>\s?/, ''));
        index += 1;
      }
      blocks.push(`<blockquote>${toHtml(quoted.join('\n'))}</blockquote>`);
      continue;
    }

    if (/^\s*([-*+]|\d+\.)\s+/.test(line)) {
      const ordered = /^\s*\d+\./.test(line);
      const items = [];

      while (index < lines.length && /^\s*([-*+]|\d+\.)\s+/.test(lines[index])) {
        const parts = [lines[index].replace(/^\s*([-*+]|\d+\.)\s+/, '')];
        index += 1;
        while (
          index < lines.length &&
          /^\s{2,}\S/.test(lines[index]) &&
          !/^\s*([-*+]|\d+\.)\s+/.test(lines[index])
        ) {
          parts.push(lines[index].trim());
          index += 1;
        }
        items.push(`<li>${inline(parts.join(' '))}</li>`);
      }

      blocks.push(ordered ? `<ol>${items.join('')}</ol>` : `<ul>${items.join('')}</ul>`);
      continue;
    }

    if (
      /\|/.test(line) &&
      index + 1 < lines.length &&
      /^\s*\|?[\s:|-]+\|[\s:|-]*$/.test(lines[index + 1])
    ) {
      const header = splitRow(line);
      index += 2;
      const rows = [];

      while (index < lines.length && /\|/.test(lines[index]) && lines[index].trim()) {
        rows.push(splitRow(lines[index]));
        index += 1;
      }

      const head = header.map((cell) => `<th>${inline(cell)}</th>`).join('');
      const body = rows
        .map((row) => `<tr>${row.map((cell) => `<td>${inline(cell)}</td>`).join('')}</tr>`)
        .join('');

      blocks.push(`<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`);
      continue;
    }

    const paragraph = [];
    while (
      index < lines.length &&
      lines[index].trim() &&
      !/^\s*(#{1,6}\s|```|>|[-*+]\s|\d+\.\s)/.test(lines[index])
    ) {
      paragraph.push(lines[index]);
      index += 1;
    }

    blocks.push(`<p>${inline(paragraph.join('\n')).replace(/\n/g, '<br>')}</p>`);
  }

  return blocks.join('\n');
}

module.exports = { toHtml, inline, escapeHtml };
