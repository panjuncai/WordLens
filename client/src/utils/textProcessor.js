// 逻辑：匹配一个“单词”，后面可选跟上“空格+单词”的组合
export const wordPattern = /[a-zA-Z\u00C0-\u024F'’-]+(?:\s+[a-zA-Z\u00C0-\u024F'’-]+)*/g;

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
const LATIN_CHAR = /[A-Za-z\u00C0-\u024F]/;
// 仅拆句号/感叹号/问号/冒号及换行，保持分隔符本身；并把标点后的空格归到标点里，避免下一段以空格开头
const CN_PUNCT_SPLIT = /([。｡.！？!?:：?][ \t]*|(?:\r?\n)+)/;
const DIGIT = /[0-9]/;

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
      .replace(/^[^A-Za-z\u00C0-\u024F]+|[^A-Za-z\u00C0-\u024F]+$/g, '')
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

const normalizeFlatSegments = (parts) => {
  let textId = 0;
  let order = 0;
  return (parts || [])
    .filter((part) => part && typeof part.value === 'string' && part.value !== '')
    .map((part) => {
      textId += 1;
      order += 1;
      return {
        index: order - 1,
        id: `chunk-${textId}`,
        role: 'text',
        type: part.type || detectChunkType(part.value),
        value: part.value,
      };
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

export function buildReadingSegments(text) {
  const source = text || '';
  if (!source) return [];
  // 先按句号/感叹号/问号/冒号/换行拆出“大块”（标点保留在块末尾），再在块内按语言拆分
  const tokens = source.split(CN_PUNCT_SPLIT).filter((part) => part !== '');
  const parts = [];

  const classifyDigit = (value, idx) => {
    const seekPrev = () => {
      for (let i = idx - 1; i >= 0; i -= 1) {
        const ch = value[i];
        if (ch === ' ' || ch === '\t' || ch === '\u00a0') continue;
        if (DIGIT.test(ch)) continue;
        return ch;
      }
      return '';
    };
    const seekNext = () => {
      for (let i = idx + 1; i < value.length; i += 1) {
        const ch = value[i];
        if (ch === ' ' || ch === '\t' || ch === '\u00a0') continue;
        if (DIGIT.test(ch)) continue;
        return ch;
      }
      return '';
    };
    const prevChar = seekPrev();
    const nextChar = seekNext();
    if (LATIN_CHAR.test(prevChar) || LATIN_CHAR.test(nextChar)) return 'fr';
    if (CHINESE_CHAR.test(prevChar) || CHINESE_CHAR.test(nextChar)) return 'cn';
    return 'cn';
  };

  const splitByLanguageRuns = (value) => {
    const runs = [];
    let currentType = null;
    let buffer = '';
    const flush = () => {
      if (!buffer) return;
      runs.push({ type: currentType || detectChunkType(buffer), value: buffer });
      buffer = '';
      currentType = null;
    };

    for (let i = 0; i < value.length; i += 1) {
      const ch = value[i];
      let nextType = null;
      if (CHINESE_CHAR.test(ch)) {
        nextType = 'cn';
      } else if (LATIN_CHAR.test(ch)) {
        nextType = 'fr';
      } else if (DIGIT.test(ch)) {
        nextType = classifyDigit(value, i);
      } else if (ch === '\u00a0' || ch === ' ' || ch === '\t') {
        // 空白归到当前块，避免产生碎片
        nextType = currentType;
      } else {
        // 其它符号（括号/逗号等）优先归到当前块；没有当前块就先归中文块，避免与外语混读时断裂
        nextType = currentType || 'cn';
      }

      if (!currentType) {
        currentType = nextType;
        buffer += ch;
        continue;
      }
      if (nextType && nextType !== currentType) {
        flush();
        currentType = nextType;
      }
      buffer += ch;
    }
    flush();
    return runs;
  };

  tokens.forEach((token) => {
    // 换行/分隔标点（含尾随空格）直接挂到上一段末尾，避免产生“纯标点”的词块
    if (/^(?:\r?\n)+$/.test(token) || /^[。｡.！？!?:：?]/.test(token)) {
      const last = parts[parts.length - 1];
      if (last) last.value += token;
      return;
    }
    splitByLanguageRuns(token).forEach((run) => {
      if (run.value) parts.push(run);
    });
  });

  // 把不包含中文/外语/数字的碎片（例如孤立标点/括号/空白）并入相邻块，避免展示成独立词块
  const merged = [];
  let prefixBuffer = '';
  const isMeaningful = (value) => CHINESE_CHAR.test(value) || LATIN_CHAR.test(value) || DIGIT.test(value);

  parts.forEach((part) => {
    if (!part?.value) return;
    if (isMeaningful(part.value)) {
      if (prefixBuffer) {
        part.value = `${prefixBuffer}${part.value}`;
        prefixBuffer = '';
      }
      merged.push(part);
      return;
    }
    if (merged.length) {
      merged[merged.length - 1].value += part.value;
    } else {
      prefixBuffer += part.value;
    }
  });
  if (prefixBuffer && merged.length) {
    merged[merged.length - 1].value += prefixBuffer;
  }

  return normalizeFlatSegments(merged);
}
