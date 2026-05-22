import { create } from 'zustand';
import { persist, subscribeWithSelector } from 'zustand/middleware';
import { client } from '@/client';
import { LyricsReplaceMode, PluginCategory } from '@/libresvip_tauri_pb';
import type { LyricsReplacementGroup } from '@/libresvip_tauri_pb';
import { create as createMsg } from '@bufbuild/protobuf';
import { LyricsReplacementSchema, LyricsReplacementGroupSchema } from '@/libresvip_tauri_pb';

export interface LyricRule {
  mode: LyricsReplaceMode;
  replacement: string;
  patternMain: string;
  patternPrefix: string;
  patternSuffix: string;
  flags: number;
}

const MODE_PREFIX_SUFFIX: Record<LyricsReplaceMode, [string, string]> = {
  [LyricsReplaceMode.FULL]: ['^', '$'],
  [LyricsReplaceMode.ALPHABETIC]: ['(?<=^|\\b)', '(?=$|\\b)'],
  [LyricsReplaceMode.NON_ALPHABETIC]: ['', ''],
  [LyricsReplaceMode.REGEX]: ['', ''],
};

const RE_IGNORECASE = 2;

function newRule(mode: LyricsReplaceMode): LyricRule {
  const [patternPrefix, patternSuffix] = MODE_PREFIX_SUFFIX[mode];
  return { mode, replacement: '', patternMain: '', patternPrefix, patternSuffix, flags: RE_IGNORECASE };
}

export function toLyricsReplacementGroups(rules: Record<string, LyricRule[]>): LyricsReplacementGroup[] {
  return Object.entries(rules).map(([presetName, ruleList]) =>
    createMsg(LyricsReplacementGroupSchema, {
      presetName,
      rules: ruleList.map(r => createMsg(LyricsReplacementSchema, {
        mode: r.mode,
        replacement: r.replacement,
        patternMain: r.patternMain,
        patternPrefix: r.patternPrefix,
        patternSuffix: r.patternSuffix,
        flags: r.flags,
      })),
    })
  );
}

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
  lyricReplaceRules: Record<string, LyricRule[]>;
  activeLyricPreset: string;
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
  addLyricPreset: (name: string) => boolean;
  removeLyricPreset: (name: string) => boolean;
  setActiveLyricPreset: (name: string) => void;
  addLyricRule: (presetName: string, mode: LyricsReplaceMode) => void;
  updateLyricRule: (presetName: string, index: number, patch: Partial<LyricRule>) => void;
  removeLyricRule: (presetName: string, index: number) => void;
}

export const useSettingStore = create<SettingState>()(
  subscribeWithSelector(persist(
    (set, get) => ({
      darkMode: 'system',
      actualTheme: window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
      language: (() => {switch (navigator.language) {
        case 'zh-CN':
          return 'zh_CN';
        default:
          return 'en_US';
      }})(),
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
      lyricReplaceRules: { default: [] },
      activeLyricPreset: 'default',
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
      addLyricPreset: (name) => {
        const { lyricReplaceRules } = get();
        if (name in lyricReplaceRules) return false;
        set({ lyricReplaceRules: { ...lyricReplaceRules, [name]: [] }, activeLyricPreset: name });
        return true;
      },
      removeLyricPreset: (name) => {
        const { lyricReplaceRules, activeLyricPreset } = get();
        if (Object.keys(lyricReplaceRules).length <= 1) return false;
        const { [name]: _, ...rest } = lyricReplaceRules;
        if (!(name in lyricReplaceRules)) return false;
        const nextActive = activeLyricPreset === name ? (rest['default'] !== undefined ? 'default' : Object.keys(rest)[0]) : activeLyricPreset;
        set({ lyricReplaceRules: rest, activeLyricPreset: nextActive });
        return true;
      },
      setActiveLyricPreset: (name) => {
        if (name in get().lyricReplaceRules) set({ activeLyricPreset: name });
      },
      addLyricRule: (presetName, mode) => {
        const { lyricReplaceRules } = get();
        const rules = lyricReplaceRules[presetName] ?? [];
        set({ lyricReplaceRules: { ...lyricReplaceRules, [presetName]: [...rules, newRule(mode)] } });
      },
      updateLyricRule: (presetName, index, patch) => {
        const { lyricReplaceRules } = get();
        const rules = lyricReplaceRules[presetName];
        if (!rules || index < 0 || index >= rules.length) return;
        const updated = [...rules];
        updated[index] = { ...updated[index], ...patch };
        set({ lyricReplaceRules: { ...lyricReplaceRules, [presetName]: updated } });
      },
      removeLyricRule: (presetName, index) => {
        const { lyricReplaceRules } = get();
        const rules = lyricReplaceRules[presetName];
        if (!rules || index < 0 || index >= rules.length) return;
        set({ lyricReplaceRules: { ...lyricReplaceRules, [presetName]: rules.filter((_, i) => i !== index) } });
      },
    }),
    {
      name: 'setting-storage',
      onRehydrateStorage: () => (state) => {
        if (state && !state.lyricReplaceRules?.['default']) {
          state.lyricReplaceRules = { ...state.lyricReplaceRules, default: [] };
        }
      },
    }
  )));