export const wordPattern = /[A-Za-zÀ-ÖØ-öø-ÿ'’\-]+/g;

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

export function extractCandidates(text) {
  const matches = [...(text.matchAll(wordPattern) || [])];
  const tokens = matches.map((m) => m[0]);
  const seen = new Set();
  const combos = [];

  for (let i = 0; i < tokens.length - 1; i += 1) {
    const cur = tokens[i];
    const next = tokens[i + 1];
    if (!cur || !next) continue;
    const lowerCur = cur.toLowerCase();
    const lowerNext = next.toLowerCase();
    const comboPair = `${lowerCur} ${lowerNext}`;
    if (fixedCombos.includes(comboPair)) {
      if (!seen.has(comboPair)) {
        combos.push(`${cur} ${next}`);
        seen.add(comboPair);
      }
      continue;
    }
    if (articleSet.has(lowerCur) || reflexiveSet.has(lowerCur)) {
      const combo = `${cur} ${next}`;
      const key = combo.toLowerCase();
      if (!seen.has(key)) {
        combos.push(combo);
        seen.add(key);
      }
    }
  }

  for (let i = 0; i < tokens.length - 2; i += 1) {
    const a = tokens[i];
    const b = tokens[i + 1];
    const c = tokens[i + 2];
    if (!a || !b || !c) continue;
    const lowerB = b.toLowerCase();
    if (articleSet.has(lowerB) || reflexiveSet.has(lowerB)) {
      const combo3 = `${a} ${b} ${c}`;
      const key3 = combo3.toLowerCase();
      if (!seen.has(key3)) {
        combos.push(combo3);
        seen.add(key3);
      }
    }
  }

  const singles = [];
  tokens.forEach((word) => {
    const cleaned = word.replace(/^[^A-Za-zÀ-ÖØ-öø-ÿ]+|[^A-Za-zÀ-ÖØ-öø-ÿ]+$/g, '');
    if (!cleaned || cleaned.length < 2) return;
    const key = cleaned.toLowerCase();
    if (seen.has(key) || reflexiveSet.has(key) || fixedComboFirsts.has(key)) return;
    seen.add(key);
    singles.push(cleaned);
  });

  return [...combos, ...singles];
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
