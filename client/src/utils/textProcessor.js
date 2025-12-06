// 连续的非中文、非结构性符号片段：允许字母/重音符、空格、连字符、撇号以及句内逗号句号感叹问号
export const wordPattern = /[A-Za-zÀ-ÖØ-öø-ÿ](?:[A-Za-zÀ-ÖØ-öø-ÿ'’\-]|[\s.,?!])*/g;

export const articleSet = new Set([
  'un',
  'une',
  'des',
  'du',
  'de',
  'le',
  'la',
  'les',
  "l'",
  'l’',
  "d'",
  'd’',
  'au',
  'aux',
  "qu'",
  'qu’',
  "c'",
  'c’',
  "s'",
  's’',
]);

export const reflexiveSet = new Set(['se', "s'", 's’', 'me', "m'", 'm’', 'te', "t'", 't’', 'nous', 'vous']);

export const fixedCombos = ['en général'];

export const fixedComboFirsts = new Set(fixedCombos.map((c) => c.split(' ')[0]));

export const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function segmentByLanguage(text) {
  const segments = [];
  let lastIndex = 0;
  for (const match of text.matchAll(wordPattern) || []) {
    const start = match.index || 0;
    const end = start + match[0].length;
    if (start > lastIndex) {
      const non = text.slice(lastIndex, start);
      if (non.trim()) segments.push({ type: 'nonfr', value: non });
    }
    const fr = (match[0] || '').trim();
    if (fr) segments.push({ type: 'fr', value: fr });
    lastIndex = end;
  }
  if (lastIndex < text.length) {
    const tail = text.slice(lastIndex);
    if (tail.trim()) segments.push({ type: 'nonfr', value: tail });
  }
  return segments;
}

export function extractCandidates(text) {
  const matches = [...(text.matchAll(wordPattern) || [])];
  const seen = new Set();
  const results = [];

  matches.forEach((m) => {
    const raw = m[0] || '';
    const cleaned = raw
      .replace(/^[^A-Za-zÀ-ÖØ-öø-ÿ]+|[^A-Za-zÀ-ÖØ-öø-ÿ]+$/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    if (!cleaned || cleaned.length < 2) return;
    const key = cleaned.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    results.push(cleaned);
  });

  return results;
}

export function buildSegments(text, targets) {
  if (!targets.length) return [{ type: 'text', value: text }];
  const escaped = targets.map((w) => escapeRegex(w)).join('|');
  const regex = new RegExp(`(${escaped})`, 'gi');
  const parts = text.split(regex);
  let counter = 0;
  return parts.map((part) => {
    const match = targets.find((w) => w.localeCompare(part, undefined, { sensitivity: 'accent', usage: 'search' }) === 0);
    if (match) {
      counter += 1;
      return { type: 'blank', value: match, id: counter };
    }
    return { type: 'text', value: part };
  });
}
