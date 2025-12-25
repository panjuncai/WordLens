import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useConfigStore = create(persist((set) => ({
  autoCarousel: false,
  blurWords: false,
  accentCheck: false,
  autoPlayCount: 1,
  autoPlayCountCn: 1,
  autoPlayIntervalSeconds: 1,
  shadowingEnabled: false,
  shadowingSequence: [0.6, 0.8, 1.0, 1.0],
  backgroundPlaybackEnabled: true,
  sleepTimerMinutes: 0,
  sleepTimerEndAt: null,
  azureKey: '',
  azureRegion: '',
  azureVoice: '',
  themeMode: 'light',
  setConfig: (payload) => set(payload),
  setAutoCarousel: (val) => set({ autoCarousel: val }),
  setBlurWords: (val) => set({ blurWords: val }),
  setAccentCheck: (val) => set({ accentCheck: val }),
  setAutoPlayCount: (val) => set({ autoPlayCount: val }),
  setAutoPlayCountCn: (val) => set({ autoPlayCountCn: val }),
  setAutoPlayIntervalSeconds: (val) => set({ autoPlayIntervalSeconds: val }),
  setShadowingEnabled: (val) => set({ shadowingEnabled: val }),
  setShadowingSequence: (val) => set({ shadowingSequence: Array.isArray(val) ? val : [] }),
  setBackgroundPlaybackEnabled: (val) => set({ backgroundPlaybackEnabled: val }),
  setSleepTimerMinutes: (val) => set({ sleepTimerMinutes: val }),
  setSleepTimerEndAt: (val) => set({ sleepTimerEndAt: val }),
  setAzureKey: (val) => set({ azureKey: val }),
  setAzureRegion: (val) => set({ azureRegion: val }),
  setAzureVoice: (val) => set({ azureVoice: val }),
  setThemeMode: (val) => set({ themeMode: val }),
}), { name: 'wordlens-config' }));

export default useConfigStore;
