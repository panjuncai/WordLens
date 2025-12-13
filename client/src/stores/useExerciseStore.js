import { create } from 'zustand';
import { extractCandidates, buildReadingSegments, buildSegments } from '../utils/textProcessor';
import { SAMPLE_SCENE } from '../constants/defaults';

const useExerciseStore = create((set, get) => ({
  sceneText: SAMPLE_SCENE,
  selectedWords: [],
  segments: buildReadingSegments(SAMPLE_SCENE),
  showCloze: false,
  answers: {},
  statuses: {},
  wordListOpen: false,
  revealedIds: new Set(),
  setSceneText: (text) => set({ sceneText: text }),
  loadArticle: (text) => {
    set({
      sceneText: text,
      selectedWords: [],
      segments: buildReadingSegments(text),
      showCloze: false,
      answers: {},
      statuses: {},
      revealedIds: new Set(),
    });
  },
  extractWords: () => {
    const { sceneText } = get();
    const words = extractCandidates(sceneText);
    set({
      selectedWords: words,
      segments: buildSegments(sceneText, words),
      showCloze: true,
      answers: {},
      statuses: {},
    });
    return words.length;
  },
  resetCloze: () => {
    const { sceneText } = get();
    set({ showCloze: false, segments: buildReadingSegments(sceneText) });
  },
  setSelectedWords: (words) => {
    const { sceneText } = get();
    set({
      selectedWords: words,
      segments: buildSegments(sceneText, words),
    });
  },
  setAnswer: (id, value) => set((state) => ({
    answers: { ...state.answers, [id]: value },
    statuses: { ...state.statuses, [id]: undefined },
  })),
  setStatus: (id, status) => set((state) => ({
    statuses: { ...state.statuses, [id]: status },
  })),
  toggleWordList: () => set((state) => ({ wordListOpen: !state.wordListOpen })),
  setRevealedIds: (updater) => set((state) => {
    if (typeof updater === 'function') {
      return { revealedIds: updater(state.revealedIds) };
    }
    return { revealedIds: updater instanceof Set ? updater : new Set(updater || []) };
  }),
}));

export default useExerciseStore;
