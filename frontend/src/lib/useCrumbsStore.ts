import { create } from "zustand";

interface CrumbsStore {
  crumbs: string[] | null;
  setCrumbs: (crumbs: string[]) => void;
  clearCrumbs: () => void;
}

export const useCrumbsStore = create<CrumbsStore>((set) => ({
  crumbs: null,
  setCrumbs: (crumbs) => set({ crumbs }),
  clearCrumbs: () => set({ crumbs: null }),
}));
