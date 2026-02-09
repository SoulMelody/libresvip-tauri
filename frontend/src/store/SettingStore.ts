import { create } from 'zustand';
import { persist, subscribeWithSelector } from 'zustand/middleware';
import { client } from '@/client';
import { PluginCategory } from '@/libresvip_tauri_pb';

interface SettingState {
  darkMode: 'light' | 'dark' | 'system';
  actualTheme: 'light' | 'dark';
  language: string;
  inputFormat: string | null;
  outputFormat: string | null;
  outputDirectory: string;
  conversionMode: 'direct' | 'merge' | 'split';
  maxTrackCount: number;
  conflictPolicy: 'overwrite' | 'skip' | 'rename' |'prompt';
  revealFileOnFinish: boolean;
  ignoreWarnings: boolean;
  inputFormatSchema: {[k: string]: any};
  inputFormatUiSchema: {[k: string]: any};
  inputFormatFormData: {[k: string]: any};
  outputFormatSchema: {[k: string]: any};
  outputFormatUiSchema: {[k: string]: any};
  outputFormatFormData: {[k: string]: any};
  setDarkMode: (mode: 'light' | 'dark' | 'system') => void;
  setActualTheme: (theme: 'light' | 'dark') => void;
  setLanguage: (lang: string) => void;
  setInputFormat: (format: string) => boolean;
  setOutputFormat: (format: string) => void;
  setOutputDirectory: (dir: string) => void;
  setConversionMode: (mode: 'direct' |'merge' |'split') => void;
  setIgnoreWarnings: (ignore: boolean) => void;
  toggleTheme: () => void;
  setMaxTrackCount: (count: number) => void;
  setConflictPolicy: (policy: 'overwrite' |'skip' |'rename' |'prompt') => void;
  setRevealFileOnFinish: (reveal: boolean) => void;
  loadInputFormatSchema: (inputFormat: string, language: string) => Promise<void>;
  loadOutputFormatSchema: (outputFormat: string, language: string) => Promise<void>;
  setInputFormatFormData: (formData: {[k: string]: any}) => void;
  setOutputFormatFormData: (formData: {[k: string]: any}) => void;
}

export const useSettingStore = create<SettingState>()(
  subscribeWithSelector(persist(
    (set, get) => ({
      darkMode: 'system',
      actualTheme: window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
      language: 'en_US',
      inputFormat: null,
      outputFormat: null,
      conversionMode: 'direct',
      outputDirectory: '.',
      maxTrackCount: 1,
      conflictPolicy: 'overwrite',
      revealFileOnFinish: true,
      ignoreWarnings: false,
      inputFormatSchema: {},
      inputFormatUiSchema: {},
      outputFormatSchema: {},
      outputFormatUiSchema: {},
      inputFormatFormData: {},
      outputFormatFormData: {},
      setDarkMode: (mode) => set({ darkMode: mode }),
      setActualTheme: (theme) => set({ actualTheme: theme }),
      setIgnoreWarnings: (ignore) => set({ ignoreWarnings: ignore }),
      setLanguage: (lang) => set({ language: lang }),
      setInputFormat: (format) => {
        if (format !== get().inputFormat) {
          set({ inputFormat: format });
          return true;
        }
        return false;
      },
      setOutputFormat: (format) => set({ outputFormat: format }),
      setOutputDirectory: (dir) => set({ outputDirectory: dir }),
      setConversionMode: (mode) => set({ conversionMode: mode }),
      setMaxTrackCount: (count) => set({ maxTrackCount: count }),
      setConflictPolicy: (policy) => set({ conflictPolicy: policy }),
      setRevealFileOnFinish: (reveal) => set({ revealFileOnFinish: reveal }),
      loadInputFormatSchema: async (inputFormat, language) => {
        const response = await client.pluginInfos({
          category: PluginCategory.INPUT,
          language: language
        })
        const plugin = response.values.find((v) => v.identifier === inputFormat);
        if (plugin) {
          set({
            inputFormatSchema: JSON.parse(plugin.jsonSchema),
            inputFormatUiSchema: JSON.parse(plugin.uiJsonSchema ?? '{}'),
            inputFormatFormData: JSON.parse(plugin.defaultJsonValue ?? '{}'),
          })
        }
      },
      loadOutputFormatSchema: async (outputFormat, language) => {
        const response = await client.pluginInfos({
          category: PluginCategory.OUTPUT,
          language: language
        })
        const plugin = response.values.find((v) => v.identifier === outputFormat);
        if (plugin) {
          set({
            outputFormatSchema: JSON.parse(plugin.jsonSchema),
            outputFormatUiSchema: JSON.parse(plugin.uiJsonSchema ?? '{}'),
            outputFormatFormData: JSON.parse(plugin.defaultJsonValue ?? '{}'),
          })
        }
      },
      toggleTheme: () =>
        set((state) => {
          const newTheme = state.darkMode === 'system'
            ? window.matchMedia('(prefers-color-scheme: dark)').matches
              ? 'dark'
              : 'light'
            : state.darkMode;

          return { actualTheme: newTheme };
        }),
      setInputFormatFormData: (formData) => set({ inputFormatFormData: formData }),
      setOutputFormatFormData: (formData) => set({ outputFormatFormData: formData }),
    }),
    {
      name: 'setting-storage',
    }
  )));