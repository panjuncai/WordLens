// 连续的非中文、非结构性符号片段：允许字母/重音符、空格、连字符、撇号以及句内逗号句号感叹问号
export const wordPattern = /[A-Za-zÀ-ÖØ-öø-ÿ](?:[A-Za-zÀ-ÖØ-öø-ÿ'’-]|[\s.,?!])*/g;

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

const CHINESE_CHAR = /[\u4E00-\u9FFF]/;
const LATIN_CHAR = /[A-Za-zÀ-ÖØ-öø-ÿ]/;
// 拆出常见中文标点、空白和换行，保持分隔符本身
const CN_PUNCT_SPLIT = /([，,。.;；;！？!?、：:\s\r\n]+)/;

const splitChineseText = (value) => {
  if (!value) return [];
  if (!CHINESE_CHAR.test(value) && !LATIN_CHAR.test(value)) return [value];
  return value
    .split(CN_PUNCT_SPLIT)
    .filter((part) => part !== '');
};

export function segmentByLanguage(text) {
  const segments = [];
  let lastIndex = 0;
  for (const match of text.matchAll(wordPattern) || []) {
    const start = match.index || 0;
    const end = start + match[0].length;
    if (start > lastIndex) {
      const non = text.slice(lastIndex, start);
      splitChineseText(non).forEach((part) => {
        if (part) segments.push({ type: 'nonfr', value: part });
      });
    }
    const fr = (match[0] || '').trim();
    if (fr) segments.push({ type: 'fr', value: fr });
    lastIndex = end;
  }
  if (lastIndex < text.length) {
    const tail = text.slice(lastIndex);
    splitChineseText(tail).forEach((part) => {
      if (part) segments.push({ type: 'nonfr', value: part });
    });
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

const detectChunkType = (value) => {
  if (!value) return 'punct';
  if (CHINESE_CHAR.test(value)) return 'cn';
  if (LATIN_CHAR.test(value)) return 'fr';
  // 标点、空白、数字等
  return 'punct';
};

const normalizeSegments = (parts) => {
  let textId = 0;
  let order = 0;
  return parts.flatMap((part) => {
    if (part.type === 'blank') {
      order += 1;
      return [{
        index: order - 1,
        id: part.id,
        role: 'blank',
        type: 'fr',
        value: part.value,
      }];
    }
    return splitChineseText(part.value).map((textPart) => {
      textId += 1;
      order += 1;
      return {
        index: order - 1,
        id: `chunk-${textId}`,
        role: 'text',
        type: detectChunkType(textPart),
        value: textPart,
      };
    });
  });
};

export function buildSegments(text, targets) {
  const safeTargets = (targets || []).filter(Boolean);
  if (!safeTargets.length) {
    return normalizeSegments([{ type: 'text', value: text }]);
  }
  const escaped = safeTargets.map((w) => escapeRegex(w)).join('|');
  const regex = new RegExp(`(${escaped})`, 'gi');
  const parts = [];
  let lastIndex = 0;
  let blankId = 0;
  text.replace(regex, (match, _p, offset) => {
    if (offset > lastIndex) {
      parts.push({ type: 'text', value: text.slice(lastIndex, offset) });
    }
    blankId += 1;
    parts.push({ type: 'blank', value: match, id: blankId });
    lastIndex = offset + match.length;
    return match;
  });
  if (lastIndex < text.length) {
    parts.push({ type: 'text', value: text.slice(lastIndex) });
  }
  return normalizeSegments(parts);
}
