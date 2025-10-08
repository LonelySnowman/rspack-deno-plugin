import { ResolveData } from '@rspack/core';
import { Loader, Specifiers, ModuleEntryEsm, LoaderContext, WorkspacePackageInfo, ConfigFile } from '../types.ts';
import { DenoCache } from '../deno-cache.ts';
import { parseNpmSpecifier, readJsonFile } from '../utils.ts';

export class NativeLoader implements Loader {
  denoCache: DenoCache;
  context: LoaderContext;

  constructor() {
    this.denoCache = new DenoCache();
    this.context = {
      rootDir: Deno.cwd(),
      denoJson: {},
      workspacePackages: new Map(),
    };
  }

  async beforeRun() {
    await this.denoCache.init(this.context.denoJson);
    await this._processContext();
    await this._processWorkspace();
  }

  // process context info
  private async _processContext() {
    const denoJsonPath = `${this.context.rootDir}/deno.json`;
    try {
      this.context.denoJson = await readJsonFile<ConfigFile>(denoJsonPath);
    }
    catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`Error: Could not read deno.json from ${denoJsonPath}:`, errorMessage);
      this.context.denoJson = {} as ConfigFile;
    }
  }

  // process workspace info
  private async _processWorkspace() {
    const workspace = this.context.denoJson.workspace;
    if (!workspace || !Array.isArray(workspace)) {
      return;
    }

    for (const workspacePath of workspace) {
      try {
        const normalizedWorkspacePath = workspacePath.replace(/^\.\//, '').replace(/\/$/, '');
        const subPackagePath = `${this.context.rootDir}/${normalizedWorkspacePath}`;
        const subPackageJsonPath = `${subPackagePath}/deno.json`;
        
        const subPackageJson = await readJsonFile<ConfigFile>(subPackageJsonPath);
        const packageName = subPackageJson.name;
        const packageExports = subPackageJson.exports || './index.ts';
        
        if (packageName) {
          const absoluteExportsPath = `${subPackagePath}/${packageExports.replace('./', '')}`;
          this.context.workspacePackages.set(packageName, {
            name: packageName,
            path: subPackagePath,
            exportsPath: absoluteExportsPath,
            denoJson: subPackageJson,
          });
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`Error: Could not process workspace package at ${workspacePath}:`, errorMessage);
      }
    }
  }

  async beforeResolve(resolveData: ResolveData) {
    await this.denoCache.resolveRequestToDenoSpecifier(resolveData as ResolveData);
    const { request } = resolveData;
    
    // Parse monorepo workspace package
    if (this.context.workspacePackages.has(request)) {
      resolveData.request = this.context.workspacePackages.get(request)!.exportsPath;
      return;
    }
    
    // NPM use node_modules packages
    if (request.startsWith(Specifiers.NPM)) {
      resolveData.request = parseNpmSpecifier(request);
      return;
    }

    // JSR, HTTP and HTTPS use deno local cache
    if (request.startsWith(Specifiers.JSR)) {
      const jsr = (await this.denoCache.get(request)) as ModuleEntryEsm;
      resolveData.request = jsr.local!;
      return;
    }

    if (request.startsWith(Specifiers.HTTPS) || request.startsWith(Specifiers.HTTP)) {
      const jsr = (await this.denoCache.get(request)) as ModuleEntryEsm;
      resolveData.request = jsr.local!;
      return;
    }
  }
}
