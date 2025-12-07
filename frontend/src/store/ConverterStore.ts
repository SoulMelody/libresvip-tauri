import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { pyInvoke } from 'tauri-plugin-pytauri-api';
import { ConversionTask, PluginInfo, SchemaConfig } from '@/ApiTypes';


interface ConverterStore {
  activeStep: number;
  inputPluginInfos: { [key: string]: PluginInfo };
  outputPluginInfos: { [key: string]: PluginInfo };
  middlewareIds: string[];
  selectedMiddlewares: string[];
  middlewareSchemas: { [key: string]: SchemaConfig };
  middlewareFormDatas: {[k: string]: {[k: string]: any}};
  conversionTasks: ConversionTask[];
  curTaskListPage: number,
  optionTab: number,
  finishedCount: number,
  setActiveStep: (step: number) => void;
  handleNext: () => void;
  handleBack: () => void;
  addConversionTasks: (tasks: ConversionTask[]) => void;
  removeConversionTask: (id: string) => string | null;
  updateConversionTask: (id: string, task: Partial<ConversionTask>) => void;
  filterConversionTasksByInputFormat: (format: string) => void;
  clearConversionTasks: () => void;
  increaseFinishedCount: () => void;
  resetFinishedCount: () => void;
  setCurTaskListPage: (page: number) => void;
  setOptionTab: (tab: number) => void;
  setSelectedMiddlewares: (middlewares: string[]) => void;
  loadMiddlewareSchema: (id: string, language: string) => Promise<void>;
  setMiddlewareFormData: (id: string, formData: {[k: string]: any}) => void;
}

let pluginInfoEntries: [string, PluginInfo][] = Object.entries(require('../assets/plugin_infos.json'));

export const useConverterStore = create<ConverterStore>()(
  subscribeWithSelector(
    (set, get) => ({
      activeStep: 0,
      inputPluginInfos: Object.fromEntries(pluginInfoEntries.filter(([key, p]) => p.categories.includes("input"))),
      outputPluginInfos: Object.fromEntries(pluginInfoEntries.filter(([key, p]) => p.categories.includes("output"))),
      middlewareIds: require('../assets/middleware_ids.json'),
      conversionTasks: [],
      selectedMiddlewares: [],
      middlewareSchemas: {},
      middlewareFormDatas: {},
      curTaskListPage: 1,
      optionTab: 0,
      finishedCount: 0,
      setActiveStep: (step) => set({ activeStep: step }),
      handleNext: () => set((state) => ({ activeStep: state.activeStep + 1 })),
      handleBack: () => set((state) => ({ activeStep: state.activeStep - 1 })),
      addConversionTasks: (tasks) => set((state) => ({ conversionTasks: [...state.conversionTasks, ...tasks] })),
      removeConversionTask: (id) => {
        set((state) => ({ conversionTasks: state.conversionTasks.filter((t) => t.id !== id) }))
        let {conversionTasks} = get();
        if (conversionTasks.length === 0) {
          return null;
        }
        return conversionTasks[conversionTasks.length - 1].inputFormat;
      },
      updateConversionTask: (id, task) => set((state) => ({ conversionTasks: state.conversionTasks.map((t) => (t.id === id? {...t,...task } : t)) })),
      filterConversionTasksByInputFormat: (format) => set((state) => ({ conversionTasks: state.conversionTasks.filter((t) => t.inputFormat === format), activeStep: 0 })),
      clearConversionTasks: () => set({ conversionTasks: [], activeStep: 0 }),
      increaseFinishedCount: () => set((state) => ({ finishedCount: state.finishedCount + 1 })),
      resetFinishedCount: () => set({ finishedCount: 0 }),
      setOptionTab: (tab) => set({ optionTab: tab }),
      setCurTaskListPage: (page) => set({ curTaskListPage: page }),
      setSelectedMiddlewares: (middlewares) => set({ selectedMiddlewares: middlewares }),
      loadMiddlewareSchema: async (id, language) => {
        const response: SchemaConfig = await pyInvoke('option_schema', {
          identifier: id,
          category: "process",
          language: language
        })
        set((state) => ({
          middlewareSchemas: {
            ...state.middlewareSchemas,
            [id]: response
          }
        }))
      },
      setMiddlewareFormData: (id, formData) => set((state) => ({
        middlewareFormDatas: {
          ...state.middlewareFormDatas,
          [id]: formData
        }
      })),
    })
  )
);