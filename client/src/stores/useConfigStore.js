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
  themeMode: 'light',
  setConfig: (payload) => set(payload),
  setAutoCarousel: (val) => set({ autoCarousel: val }),
  setBlurWords: (val) => set({ blurWords: val }),
  setAccentCheck: (val) => set({ accentCheck: val }),
  setAutoPlayEnabled: (val) => set({ autoPlayEnabled: val }),
  setAutoPlayDelay: (val) => set({ autoPlayDelay: val }),
  setAutoPlayCount: (val) => set({ autoPlayCount: val }),
  setAzureKey: (val) => set({ azureKey: val }),
  setAzureRegion: (val) => set({ azureRegion: val }),
  setAzureVoice: (val) => set({ azureVoice: val }),
  setThemeMode: (val) => set({ themeMode: val }),
}), { name: 'wordlens-config' }));

export default useConfigStore;
