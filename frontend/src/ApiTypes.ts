/* tslint:disable */
/* eslint-disable */
/**
/* This file was automatically generated from pydantic models by running pydantic2ts.
/* Do not modify it by hand - just update the pydantic models and then re-run the script
*/

export type RootModelStr = string;

export interface BatchConvertOptions {
  inputFormat: string;
  outputFormat: string;
  language: string;
  mode?: "direct" | "split" | "merge";
  maxTrackCount: number;
  conversionTasks: ConversionTask[];
  inputOptions: {
    [k: string]: unknown;
  };
  outputOptions: {
    [k: string]: unknown;
  };
  selectedMiddlewares: string[];
  middlewareOptions: {
    [k: string]: {
      [k: string]: unknown;
    };
  };
  outputDir: string;
  conflictPolicy: "overwrite" | "skip" | "rename" | "prompt";
}
export interface ConversionTask {
  id: string;
  inputPath: string;
  baseName: string;
  outputStem: string;
  inputFormat: string;
  running?: boolean;
  success?: boolean | null;
  error?: string | null;
  warning?: string | null;
  outputPath?: string | null;
}
export interface Empty {}
export interface MoveFileParams {
  id: string;
  forceOverwrite: boolean;
}

export interface MoveCallbackParams {
  id: string;
  conflictPolicy: "skip" | "prompt";
}
export interface PluginInfo {
  identifier: string;
  version: string;
  suffix: string;
  icon_base64?: string | null;
  website?: string | null;
}
export interface RootModelDictStrPluginInfo {
  [k: string]: PluginInfo;
}
export interface PluginOption {
  identifier: string;
  category: string;
  language: string;
}
export interface SchemaConfig {
  json_schema: {
    [k: string]: unknown;
  };
  default_value: {
    [k: string]: unknown;
  };
  ui_schema?: {
    [k: string]: unknown;
  };
}
