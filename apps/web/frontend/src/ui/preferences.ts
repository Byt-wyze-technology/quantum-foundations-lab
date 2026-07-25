/**
 * Display preferences required by §16: high-contrast and reduced-motion modes.
 *
 * Reduced motion defaults to the operating-system setting, so a learner who has
 * already asked for less movement does not have to ask again here.
 */

import { create } from "zustand";

const prefersReducedMotion = (): boolean =>
  typeof window !== "undefined" &&
  typeof window.matchMedia === "function" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export type PreferencesState = {
  highContrast: boolean;
  reducedMotion: boolean;
  toggleHighContrast: () => void;
  toggleReducedMotion: () => void;
};

export const usePreferences = create<PreferencesState>((set) => ({
  highContrast: false,
  reducedMotion: prefersReducedMotion(),
  toggleHighContrast: () => set((state) => ({ highContrast: !state.highContrast })),
  toggleReducedMotion: () => set((state) => ({ reducedMotion: !state.reducedMotion })),
}));
