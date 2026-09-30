/**
 * Whether the launch splash has been dismissed. Screens that animate on entry
 * (e.g. Welcome back) wait for this, so the animation isn't hidden behind the
 * splash. The root layout marks it done once.
 */
import { create } from "zustand";

export const useSplashState = create<{ done: boolean; markDone: () => void }>((set) => ({
  done: false,
  markDone: () => set({ done: true }),
}));

export const markSplashDone = () => useSplashState.getState().markDone();
