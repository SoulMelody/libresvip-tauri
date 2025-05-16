import { create } from 'zustand';

interface WindowState {
  isMaximized: boolean;
  drawerOpen: boolean;
  snackbarOpen: boolean;
  snackbarMessage: string;
  appVersion: string;
  toggleMaximize: () => void;
  setdrawerOpen: (open: boolean) => void;
  setAppVersion: (version: string) => void;
  toggledrawerOpen: () => void;
  showSnackbar: (message: string) => void;
  closeSnackbar: () => void;
}

export const useWindowStore = create<WindowState>()(
  (set) => ({
    isMaximized: false,
    darkMode: 'system',
    actualTheme: window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
    drawerOpen: false,
    snackbarOpen: false,
    snackbarMessage: '',
    language: 'en_US',
    appVersion: '',
    toggleMaximize: () => set((state) => ({ isMaximized: !state.isMaximized })),
    setdrawerOpen: (open) => set({ drawerOpen: open }),
    setAppVersion: (version) => set({ appVersion: version }),
    toggledrawerOpen: () => set((state) => ({ drawerOpen: !state.drawerOpen })),
    showSnackbar: (message) => {
      set({ snackbarMessage: message, snackbarOpen: true });
    },
    closeSnackbar: () => {
      set({ snackbarOpen: false });
    }
  }
));