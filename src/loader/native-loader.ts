import { ResolveData } from '@rspack/core';
import { Loader, Specifiers, ModuleEntryEsm, LoaderContext } from '../types.ts';
import { DenoCache } from '../deno-cache.ts';
import { parseNpmSpecifier, readJsonFile, findWorkspaceRoot } from '../utils.ts';
// 定义 ConfigFile 接口
interface ConfigFile {
  name?: string;
  exports?: string;
  workspace?: string[];
  [key: string]: unknown;
}
import { console } from "node:inspector";

export class NativeLoader implements Loader {
  denoCache: DenoCache;
  context: LoaderContext;
  workspace: Map<string, string>;

  constructor() {
    this.denoCache = new DenoCache();
    this.context = {
      rootDir: Deno.cwd(),
      denoJson: {},
      workspaceDenoJson: new Map(),
    };
    this.workspace = new Map();
  }

  async beforeRun() {
    await this.denoCache.init();
    
    const denoJsonPath = `${this.context.rootDir}/deno.json`;
    try {
      this.context.denoJson = await readJsonFile<ConfigFile>(denoJsonPath);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`Error: Could not read deno.json from ${denoJsonPath}:`, errorMessage);
      this.context.denoJson = {} as ConfigFile;
    }

    await this.processWorkspace();
  }

  private async processWorkspace() {
    const workspace = this.context.denoJson.workspace;
    if (!workspace || !Array.isArray(workspace)) {
      return;
    }

    for (const workspacePath of workspace) {
      try {
        const subPackageJsonPath = `${this.context.rootDir}/${workspacePath}/deno.json`;
        const subPackageJson = await readJsonFile<ConfigFile>(subPackageJsonPath);
        const packageName = subPackageJson.name;
        const packageExports = subPackageJson.exports || './index.ts';
        if (packageName) {
          const absoluteExportsPath = `${this.context.rootDir}/${workspacePath}/${packageExports.replace('./', '')}`;
          this.workspace.set(packageName, absoluteExportsPath);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.warn(`Warning: Could not process workspace package at ${workspacePath}:`, errorMessage);
      }
    }
  }

  async beforeResolve(resolveData: ResolveData) {
    await this.denoCache.resolveRequestToDenoSpecifier(resolveData as ResolveData);
    const { request } = resolveData;
    
    if (this.workspace.has(request)) {
      resolveData.request = this.workspace.get(request)!;
      return;
    }
    
    // NPM use node_modules packages
    if (request.startsWith(Specifiers.NPM)) {
      resolveData.request = parseNpmSpecifier(request);
      
      // 检查当前目录是否在 workspace 子包中，如果是则解析到根目录的 node_modules
      const currentDir = Deno.cwd();
      const workspacePaths = this.context.denoJson.workspace || [];
      const rootDir = findWorkspaceRoot(currentDir, workspacePaths);
      
      resolveData.context = rootDir;
      return;
    }

    // JSR, HTTP and HTTPS use deno local cache
    if (request.startsWith(Specifiers.JSR)) {
      const jsr = (await this.denoCache.get(request)) as ModuleEntryEsm;
      resolveData.request = jsr.local!;
    }

    if (request.startsWith(Specifiers.HTTPS) || request.startsWith(Specifiers.HTTP)) {
      const jsr = (await this.denoCache.get(request)) as ModuleEntryEsm;
      resolveData.request = jsr.local!;
      return;
    }
  }
}
