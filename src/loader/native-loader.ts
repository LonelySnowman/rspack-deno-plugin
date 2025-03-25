import { ResolveData } from "@rspack/core";
import { Loader, Specifiers, NpmPackage, ModuleEntryEsm } from "../types.ts";
import { DenoCache } from "../deno-cache.ts";
import { parseNpmSpecifier } from "../utils.ts";

export class NativeLoader implements Loader {
  denoCache: DenoCache;
  redirects: Map<string, string> = new Map();
  npmPackages: Map<string, NpmPackage> = new Map();

  constructor() {
    this.denoCache = new DenoCache();
  }

  async beforeRun() {
    await this.denoCache.init();
  }

  async beforeResolve(resolveData: ResolveData) {
    await this.denoCache.resolveRequestToDenoSpecifier(resolveData);
    const { request } = resolveData;

    // NPM use node_modules packages
    if (request.startsWith(Specifiers.NPM)) {
      // TODO: 解析 npm url
      resolveData.request = parseNpmSpecifier(request);
      resolveData.context = Deno.cwd();
      return;
    }

    // JSR, HTTP and HTTPS use deno local cache
    if (request.startsWith(Specifiers.JSR)) {
      const jsr = (await this.denoCache.get(request)) as ModuleEntryEsm;
      resolveData.request = jsr.local!;
    }

    if (
      request.startsWith(Specifiers.HTTPS) ||
      request.startsWith(Specifiers.HTTP)
    ) {
      const jsr = (await this.denoCache.get(request)) as ModuleEntryEsm;
      resolveData.request = jsr.local!;
      return;
    }
  }
}
