import { create } from 'zustand';
import { extractCandidates, buildSegments } from '../utils/textProcessor';
import { SAMPLE_SCENE } from '../constants/defaults';

const useExerciseStore = create((set, get) => ({
  sceneText: SAMPLE_SCENE,
  selectedWords: extractCandidates(SAMPLE_SCENE),
  segments: buildSegments(SAMPLE_SCENE, extractCandidates(SAMPLE_SCENE)),
  showCloze: false,
  answers: {},
  statuses: {},
  activeWordId: null,
  wordListOpen: false,
  revealedIds: new Set(),
  setSceneText: (text) => set({ sceneText: text }),
  loadArticle: (text) => {
    const words = extractCandidates(text);
    set({
      sceneText: text,
      selectedWords: words,
      segments: buildSegments(text, words),
      showCloze: false,
      answers: {},
      statuses: {},
      activeWordId: null,
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
  resetCloze: () => set({ showCloze: false }),
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
  setActiveWordId: (id) => set({ activeWordId: id }),
  toggleWordList: () => set((state) => ({ wordListOpen: !state.wordListOpen })),
  setRevealedIds: (updater) => set((state) => ({ revealedIds: updater(state.revealedIds) })),
}));

export default useExerciseStore;
