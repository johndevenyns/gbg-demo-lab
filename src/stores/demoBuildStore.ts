import { create } from 'zustand';

export type DemoBuildStatus = 'building' | 'complete' | 'failed';

interface DemoBuildStore {
  /** Wizard is mounted app-wide; `open` controls dialog visibility only. */
  open: boolean;
  /** Build is running/finished but the dialog is hidden. */
  minimized: boolean;
  status: DemoBuildStatus | null;
  demoId: string | null;
  customerName: string | null;
  progress: number;
  openWizard: () => void;
  setOpen: (open: boolean) => void;
  minimize: () => void;
  restore: () => void;
  setBuild: (patch: Partial<Pick<DemoBuildStore, 'status' | 'demoId' | 'customerName' | 'progress'>>) => void;
  clear: () => void;
}

export const useDemoBuildStore = create<DemoBuildStore>((set) => ({
  open: false,
  minimized: false,
  status: null,
  demoId: null,
  customerName: null,
  progress: 0,
  openWizard: () => set({ open: true, minimized: false }),
  setOpen: (open) => set({ open, ...(open ? { minimized: false } : {}) }),
  minimize: () => set({ open: false, minimized: true }),
  restore: () => set({ open: true, minimized: false }),
  setBuild: (patch) => set(patch),
  clear: () => set({ open: false, minimized: false, status: null, demoId: null, customerName: null, progress: 0 }),
}));
