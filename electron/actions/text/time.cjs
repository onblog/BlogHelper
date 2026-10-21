'use strict';

/**
 * Timestamp conversions. Both directions are local time — the machine's own
 * clock is what the user is reasoning about.
 */

const SECONDS = /^\d{10}$/;
const MILLIS = /^\d{13}$/;

function pad(value) {
  return String(value).padStart(2, '0');
}

function isTimestamp(text) {
  const trimmed = text.trim();
  return SECONDS.test(trimmed) || MILLIS.test(trimmed);
}

function formatLocal(date) {
  return [
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
    `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`,
  ].join(' ');
}

module.exports = [
  {
    id: 'time.to-date',
    group: 'time',
    title: { zh: '时间戳 → 本地时间', en: 'Timestamp → local time' },
    accepts: ['text'],
    isAvailable: (input) => isTimestamp(input.text),
    run: (input) => {
      const trimmed = input.text.trim();
      const millis = SECONDS.test(trimmed) ? Number(trimmed) * 1000 : Number(trimmed);
      const date = new Date(millis);

      if (Number.isNaN(date.getTime())) return { error: 'invalid_timestamp' };

      const text = `${formatLocal(date)} (${date.toISOString()})`;
      return text === input.text ? { error: 'unchanged' } : { text };
    },
  },
  {
    id: 'time.to-timestamp',
    group: 'time',
    title: { zh: '日期 → 时间戳', en: 'Date → timestamp' },
    accepts: ['text'],
    // Only offer it when the clipboard reads like a date rather than prose.
    isAvailable: (input) =>
      input.text.length <= 40 && /[-/:]|\d{4}/.test(input.text) && !Number.isNaN(Date.parse(input.text.trim())),
    run: (input) => {
      const millis = Date.parse(input.text.trim());
      if (Number.isNaN(millis)) return { error: 'invalid_date' };

      const text = String(Math.floor(millis / 1000));
      return text === input.text ? { error: 'unchanged' } : { text };
    },
  },
];
