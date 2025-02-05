import { ResolveData } from '@rspack/core';

export interface PluginOption {
  mode: 'native' | 'portable';
}

export interface InfoOption {
  cwd?: string;
  config?: string;
  lock?: string;
}

export enum Specifiers {
  NPM = 'npm:', // native: 指向本地缓存 | portable: 指向 node_modules
  JSR = 'jsr:', // native: 转化为 https 再指向本地缓存 entry.local | portable: 远程加载 写入本地 temp 文件
  NODE = 'node:', // 本地进行提示请安装
  HTTPS = 'https:', // 同 jsr 转化后流程
  HTTP = 'http:',
}

export interface Loader {
  beforeResolve: (resolveData: ResolveData) => void;
  beforeRun?: () => Promise<void>;
}

/**
 * Deno About Types
 */

export interface InfoOutput {
  roots: string[];
  modules: ModuleEntry[];
  redirects: Record<string, string>;
  npmPackages?: Record<string, NpmPackage>;
}

export interface NpmPackage {
  name: string;
  version: string;
  dependencies: string[];
  registryUrl?: string;
}

export interface NpmPackage {
  name: string;
  version: string;
  dependencies: string[];
  registryUrl?: string;
}

export type ModuleEntry = ModuleEntryError | ModuleEntryEsm | ModuleEntryJson | ModuleEntryNpm | ModuleEntryNode;

export interface ModuleEntryBase {
  specifier: string;
}

export interface ModuleEntryError extends ModuleEntryBase {
  error: string;
}

export type MediaType =
  | 'JavaScript'
  | 'Mjs'
  | 'Cjs'
  | 'JSX'
  | 'TypeScript'
  | 'Mts'
  | 'Cts'
  | 'Dts'
  | 'Dmts'
  | 'Dcts'
  | 'TSX'
  | 'Json'
  | 'Wasm'
  | 'TsBuildInfo'
  | 'SourceMap'
  | 'Unknown';

export interface ModuleEntryEsm extends ModuleEntryBase {
  kind: 'esm';
  local: string | null;
  emit: string | null;
  map: string | null;
  mediaType: MediaType;
  size: number;
  dependencies: {
    specifier: string;
    code: {
      specifier: string;
    };
  }[];
}

export interface ModuleEntryJson extends ModuleEntryBase {
  kind: 'asserted' | 'json';
  local: string | null;
  mediaType: MediaType;
  size: number;
}

export interface ModuleEntryNpm extends ModuleEntryBase {
  kind: 'npm';
  npmPackage: string;
}

export interface ModuleEntryNode extends ModuleEntryBase {
  kind: 'node';
  moduleName: string;
}

export interface RootInfoOutput {
  version: string;
  denoDir: string;
  modulesCache: string;
  npmCache: string;
  typescriptCache: string;
  registryCache: string;
  originStorage: string;
  webCacheStorage: string;
}
