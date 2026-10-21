'use strict';

/**
 * Case conversions.
 *
 * They run line by line: turning a pasted multi-line block into camelCase only
 * makes sense per line, and collapsing lines into one would destroy structure
 * the user did not ask to lose.
 */

const ACRONYM_BOUNDARY = /([A-Z]+)([A-Z][a-z])/g;
const LOWER_BOUNDARY = /([a-z0-9])([A-Z])/g;
const SEPARATORS = /[_\-.]+/g;

function words(line) {
  return line
    .replace(ACRONYM_BOUNDARY, '$1 $2')
    .replace(LOWER_BOUNDARY, '$1 $2')
    .replace(SEPARATORS, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

function capitalize(word) {
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

function mapLines(text, transform) {
  return text
    .split('\n')
    .map((line) => (line.trim() ? transform(line) : line))
    .join('\n');
}

function toTitle(text) {
  return mapLines(text, (line) => words(line).map(capitalize).join(' '));
}

function toCamel(text) {
  return mapLines(text, (line) =>
    words(line)
      .map((word, index) => (index === 0 ? word.toLowerCase() : capitalize(word)))
      .join(''),
  );
}

function toSnake(text) {
  return mapLines(text, (line) => words(line).map((w) => w.toLowerCase()).join('_'));
}

function toKebab(text) {
  return mapLines(text, (line) => words(line).map((w) => w.toLowerCase()).join('-'));
}

function toConstant(text) {
  return mapLines(text, (line) => words(line).map((w) => w.toUpperCase()).join('_'));
}

function makeAction(id, zh, en, transform) {
  return {
    id,
    group: 'case',
    title: { zh, en },
    accepts: ['text'],
    run: (input) => {
      const text = transform(input.text);
      return text === input.text ? { error: 'unchanged' } : { text };
    },
  };
}

module.exports = [
  makeAction('case.upper', '全大写', 'UPPERCASE', (text) => text.toUpperCase()),
  makeAction('case.lower', '全小写', 'lowercase', (text) => text.toLowerCase()),
  makeAction('case.title', '首字母大写', 'Title Case', toTitle),
  makeAction('case.camel', '驼峰命名', 'camelCase', toCamel),
  makeAction('case.snake', '下划线命名', 'snake_case', toSnake),
  makeAction('case.kebab', '短横线命名', 'kebab-case', toKebab),
  makeAction('case.constant', '常量命名', 'CONSTANT_CASE', toConstant),
];
