'use strict';

/**
 * HTML → Markdown.
 *
 * Clipboard HTML comes from browsers and word processors: well-formed but full
 * of inline styling nobody wants. This keeps the handful of tags that carry
 * meaning (headings, emphasis, links, images, lists, quotes, code, tables) and
 * drops the rest, styling included.
 *
 * Not a parser and not trying to be: what matters is that a copied article comes
 * out as Markdown someone can paste into their editor.
 */

const { decodeEntities } = require('../actions/html.cjs');

function clean(html) {
  return String(html)
    .replace(/\r\n?/g, '\n')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<(script|style|head|noscript|iframe|svg)[^>]*>[\s\S]*?<\/\1>/gi, '');
}

/** One run of text: tags dropped, entities decoded, whitespace collapsed. */
function textOf(fragment) {
  return decodeEntities(String(fragment).replace(/<[^>]+>/g, ''))
    .replace(/[ \t\u00a0]+/g, ' ')
    .replace(/\s*\n\s*/g, ' ')
    .trim();
}

/** Inline tags → Markdown. Bold before italic so `**` survives. */
function inline(text) {
  return text
    .replace(/<(strong|b)\b[^>]*>([\s\S]*?)<\/\1>/gi, (_m, _tag, inner) => `**${textOf(inner)}**`)
    .replace(/<(em|i)\b[^>]*>([\s\S]*?)<\/\1>/gi, (_m, _tag, inner) => `*${textOf(inner)}*`)
    .replace(/<(del|s|strike)\b[^>]*>([\s\S]*?)<\/\1>/gi, (_m, _tag, inner) => `~~${textOf(inner)}~~`)
    .replace(/<code\b[^>]*>([\s\S]*?)<\/code>/gi, (_m, code) => `\`${textOf(code)}\``)
    .replace(/<a\b[^>]*href=["']([^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi, (_m, href, inner) => {
      const label = textOf(inner);
      return `[${label || href}](${href})`;
    })
    .replace(/<img\b[^>]*>/gi, (tag) => {
      const src = /src=["']([^"']*)["']/i.exec(tag)?.[1] ?? '';
      const alt = /alt=["']([^"']*)["']/i.exec(tag)?.[1] ?? '';
      return src ? `![${alt}](${src})` : '';
    })
    .replace(/<br\s*\/?>/gi, '\n');
}

function tables(html) {
  return html.replace(/<table\b[^>]*>([\s\S]*?)<\/table>/gi, (_match, body) => {
    const rows = [...body.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map((row) =>
      [...row[1].matchAll(/<(td|th)\b[^>]*>([\s\S]*?)<\/\1>/gi)].map((cell) => textOf(cell[2])),
    );

    if (rows.length === 0) return '';

    const width = Math.max(...rows.map((row) => row.length));
    const pad = (row) => [...row, ...Array(width - row.length).fill('')];
    const line = (cells) => `| ${pad(cells).join(' | ')} |`;

    return `\n\n${[line(rows[0]), `| ${Array(width).fill('---').join(' | ')} |`, ...rows.slice(1).map(line)].join('\n')}\n\n`;
  });
}

function lists(html) {
  const collect = (block, numbered) => {
    const items = [...block.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)].map((item, index) =>
      numbered === true ? `${index + 1}. ${textOf(item[1])}` : `- ${textOf(item[1])}`,
    );
    return `\n\n${items.join('\n')}\n\n`;
  };

  // Ordered before unordered, and both before the stray-<li> fallback.
  return html
    .replace(/<ol\b[^>]*>([\s\S]*?)<\/ol>/gi, (_m, block) => collect(block, true))
    .replace(/<ul\b[^>]*>([\s\S]*?)<\/ul>/gi, (_m, block) => collect(block, false))
    .replace(/<li\b[^>]*>([\s\S]*?)<\/li>/gi, (_m, item) => `\n- ${textOf(item)}`);
}

function toMarkdown(html) {
  let text = clean(html);

  // Code blocks are lifted out first: the inline rules must not touch them.
  const blocks = [];
  text = text.replace(/<pre\b[^>]*>([\s\S]*?)<\/pre>/gi, (match, inner) => {
    const language = /class=["'][^"']*language-([\w-]+)/i.exec(match)?.[1] ?? '';
    const code = decodeEntities(inner.replace(/<[^>]+>/g, '')).replace(/\n+$/, '');
    blocks.push(`\`\`\`${language}\n${code}\n\`\`\``);
    return `\u0000${blocks.length - 1}\u0000`;
  });

  text = tables(text);
  text = inline(text);
  text = lists(text);

  text = text
    .replace(/<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/gi, (_m, level, inner) => {
      return `\n\n${'#'.repeat(Number(level))} ${textOf(inner)}\n\n`;
    })
    .replace(/<blockquote\b[^>]*>([\s\S]*?)<\/blockquote>/gi, (_m, inner) => {
      const quoted = textOf(inner)
        .split('\n')
        .filter(Boolean)
        .map((line) => `> ${line}`)
        .join('\n');
      return `\n\n${quoted}\n\n`;
    })
    .replace(/<hr\b[^>]*>/gi, '\n\n---\n\n')
    .replace(/<\/(p|div|section|article|header|footer|tr)>/gi, '\n\n')
    .replace(/<\/?(p|div|section|article|header|footer|thead|tbody|tr|td|th)\b[^>]*>/gi, '');

  text = text.replace(/\u0000(\d+)\u0000/g, (_match, index) => `\n\n${blocks[Number(index)]}\n\n`);

  // Whatever is left is styling: drop the tags, keep the words.
  const lines = decodeEntities(text.replace(/<[^>]+>/g, ''))
    .split('\n')
    .map((line) => line.replace(/[ \t]+$/, ''));

  const out = [];
  for (const line of lines) {
    if (!line.trim()) {
      if (out.length && out[out.length - 1] !== '') out.push('');
      continue;
    }
    out.push(line);
  }

  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

module.exports = { toMarkdown };
