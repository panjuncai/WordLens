import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useConfigStore = create(persist((set) => ({
  autoCarousel: false,
  blurWords: false,
  accentCheck: false,
  autoPlayEnabled: false,
  autoPlayDelay: 1,
  autoPlayCount: 1,
  azureKey: '',
  azureRegion: '',
  azureVoice: '',
  setConfig: (payload) => set(payload),
}), { name: 'wordlens-config' }));

export default useConfigStore;
