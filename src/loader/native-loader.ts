import { ResolveData } from '@rspack/core';
import { Loader, Specifiers, ModuleEntryEsm, LoaderContext } from '../types.ts';
import { DenoCache } from '../deno-cache.ts';
import { parseNpmSpecifier, readJsonFile } from '../utils.ts';
// 定义 ConfigFile 接口
interface ConfigFile {
  name?: string;
  exports?: string;
  workspace?: string[];
  nodeModulesDir?: string | boolean;
  imports?: Record<string, string>;
  [key: string]: unknown;
}

// 定义子包信息接口
interface WorkspacePackageInfo {
  name: string;
  path: string;
  exportsPath: string;
  denoJson: ConfigFile;
}
import { console } from "node:inspector";

export class NativeLoader implements Loader {
  denoCache: DenoCache;
  context: LoaderContext;
  workspace: Map<string, string>;
  workspacePackages: Map<string, WorkspacePackageInfo>;

  constructor() {
    this.denoCache = new DenoCache();
    this.context = {
      rootDir: Deno.cwd(),
      denoJson: {},
      workspaceDenoJson: new Map(),
    };
    this.workspace = new Map();
    this.workspacePackages = new Map();
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
        // 标准化子包路径
        const normalizedWorkspacePath = workspacePath.replace(/^\.\//, '').replace(/\/$/, '');
        const subPackagePath = `${this.context.rootDir}/${normalizedWorkspacePath}`;
        const subPackageJsonPath = `${subPackagePath}/deno.json`;
        
        // 读取子包的 deno.json
        const subPackageJson = await readJsonFile<ConfigFile>(subPackageJsonPath);
        const packageName = subPackageJson.name;
        const packageExports = subPackageJson.exports || './index.ts';
        
        if (packageName) {
          const absoluteExportsPath = `${subPackagePath}/${packageExports.replace('./', '')}`;
          
          // 保存到 workspace Map（用于快速查找）
          this.workspace.set(packageName, absoluteExportsPath);
          
          // 保存完整的子包信息
          this.workspacePackages.set(subPackagePath, {
            name: packageName,
            path: subPackagePath,
            exportsPath: absoluteExportsPath,
            denoJson: subPackageJson,
          });
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.warn(`Warning: Could not process workspace package at ${workspacePath}:`, errorMessage);
      }
    }
  }

  // 查找当前目录所属的子包
  private findCurrentWorkspacePackage(currentDir: string): WorkspacePackageInfo | null {
    const normalizedCurrentDir = currentDir.replace(/\/$/, '');
    
    for (const [packagePath, packageInfo] of this.workspacePackages) {
      // 检查当前目录是否是子包目录或其子目录
      if (normalizedCurrentDir === packagePath || normalizedCurrentDir.startsWith(`${packagePath}/`)) {
        return packageInfo;
      }
    }
    
    return null;
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
      
      const currentDir = Deno.cwd();
      const currentPackage = this.findCurrentWorkspacePackage(currentDir);
      
      // 如果在子包中，检查子包是否有 nodeModulesDir 配置或 imports
      if (currentPackage) {
        const subPackageDenoJson = currentPackage.denoJson;
        
        // 如果子包有 nodeModulesDir 配置（包括 "auto" 或 true），使用子包目录
        if (subPackageDenoJson.nodeModulesDir) {
          resolveData.context = currentPackage.path;
        } 
        // 如果子包有 imports 配置，也使用子包目录
        else if (subPackageDenoJson.imports && Object.keys(subPackageDenoJson.imports).length > 0) {
          resolveData.context = currentPackage.path;
        }
        // 否则使用根目录
        else {
          resolveData.context = this.context.rootDir;
        }
      } else {
        // 不在子包中，使用当前目录
        resolveData.context = currentDir;
      }
      
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
