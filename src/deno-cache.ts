import { InfoOption, InfoOutput, NpmPackage, ModuleEntry, ModuleEntryEsm, RootInfoOutput, Specifiers } from './types.ts';
import { ResolveData } from '@rspack/core';
import { resolve } from 'node:path';
import { existsSync } from 'node:fs';

let tmpDir: string | undefined;

export class DenoCache {
  _rootInfo?: RootInfoOutput;
  _option: InfoOption;
  _redirects: Map<string, string> = new Map();
  _npmPackages: Map<string, NpmPackage> = new Map();
  _modules: Map<string, ModuleEntry> = new Map();
  _localToSpecifier: Map<string, string> = new Map();
  _denoConfig?: any;

  constructor(option?: InfoOption) {
    const cwd = Deno.cwd();
    const config = resolve(cwd, './deno.json');
    const defaultOption = {
      cwd,
      config,
      lock: resolve(cwd, './deno.lock'),
    };
    const exist = existsSync(config);
    if (!exist) {
      throw new Error(`${config} not exists`);
    }
    this._option = option || defaultOption;
  }

  async init() {
    const denoJson = await Deno.readTextFile(this._option.config!);
    const denoConfig = JSON.parse(denoJson);
    this._denoConfig = denoConfig;
    this._rootInfo = await this._getRootInfo();
    if (denoConfig.nodeModulesDir !== 'auto') {
      throw new Error('nodeModulesDir in deno.json needs to be "auto"');
    }
  }

  // TODO: Use queue concurrent loading to improve performance
  async get(specifier: string): Promise<ModuleEntry> {
    let entry = this._getCached(specifier);
    if (entry !== undefined) return entry;
    await this._load(specifier);
    entry = this._getCached(specifier);
    if (entry === undefined) throw new Error(`'${specifier}' loaded but not searched`);
    return entry;
  }

  async resolveRequestToDenoSpecifier(resolveData: ResolveData) {
    const imports = this._denoConfig.imports || {};
    if (Object.keys(imports).includes(resolveData.request)) {
      const value = imports[resolveData.request];
      if (!value.startsWith(Specifiers.NPM)) resolveData.request = imports[resolveData.request];
    }

    if (resolveData.context.includes(this._rootInfo!.modulesCache)) {
      const specifier = this._localToSpecifier.get(resolveData.contextInfo.issuer);
      if (specifier) {
        const mod = (await this.get(specifier)) as ModuleEntryEsm;
        for (const dep of mod.dependencies) {
          if (dep.specifier === resolveData.request) {
            resolveData.request = dep.code.specifier;
          }
        }
      }
    }
  }

  _getCached(specifier: string): ModuleEntry | undefined {
    specifier = this._resolve(specifier);
    return this._modules.get(specifier);
  }

  async _getDenoInfo(specifier: string): Promise<InfoOutput> {
    // Gen deno info command option
    const option = this._option;
    const commandOption: Deno.CommandOptions = {
      args: ['info', '--json', specifier],
      cwd: undefined,
      env: { DENO_NO_PACKAGE_JSON: 'true' },
      stdout: 'piped',
      stderr: 'inherit',
    };
    if (option.cwd) {
      commandOption.cwd = option.cwd;
    } else {
      commandOption.cwd = Deno.makeTempDirSync();
    }

    // Command output to object
    const output = await new Deno.Command(Deno.execPath(), commandOption).output();
    const txt = new TextDecoder().decode(output.stdout);
    return JSON.parse(txt);
  }

  async _load(specifier: string) {
    const { modules, redirects, npmPackages } = await this._getDenoInfo(specifier);
    for (const mod of modules) {
      // specifier to module
      this._modules.set(mod.specifier, mod);
      // TODO: 代码不优雅待变更
      const tempModule = mod as ModuleEntryEsm;
      if (tempModule.local) {
        this._localToSpecifier.set(tempModule.local!, mod.specifier);
      }
    }
    for (const [from, to] of Object.entries(redirects)) {
      this._redirects.set(from, to);
    }
    if (npmPackages !== undefined) {
      for (const [id, npmPackage] of Object.entries(npmPackages)) {
        this._npmPackages.set(id, npmPackage);
      }
    }
  }

  _resolve(specifier: string) {
    const original = specifier;
    let counter = 0;
    while (counter++ < 10) {
      const redirect = this._redirects.get(specifier);
      if (redirect === undefined) return specifier;
      specifier = redirect;
    }
    throw new Error(`Too many redirects for '${original}'`);
  }

  // 考虑初始化的时候直接加载
  async _getRootInfo(): Promise<RootInfoOutput> {
    if (!tmpDir) tmpDir = Deno.makeTempDirSync();
    const opts = {
      args: ['info', '--json', '--no-config', '--no-lock'],
      cwd: tmpDir,
      env: { DENO_NO_PACKAGE_JSON: 'true' },
      stdout: 'piped',
      stderr: 'inherit',
    };

    const output = await new Deno.Command(Deno.execPath(), opts as Deno.CommandOptions).output();
    if (!output.success) {
      throw new Error(`Failed to call 'deno info'`);
    }
    const txt = new TextDecoder().decode(output.stdout);
    return JSON.parse(txt);
  }
}
