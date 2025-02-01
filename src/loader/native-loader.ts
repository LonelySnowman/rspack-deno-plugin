import { ResolveData } from "@rspack/core";
import { Loader, Specifiers, NpmPackage, ModuleEntryEsm } from '../types.ts';
import { DenoCache } from "../deno-cache.ts";

export class NativeLoader implements Loader {
    denoCache: DenoCache;
    redirects: Map<string, string> = new Map();
    npmPackages: Map<string, NpmPackage> = new Map();

    constructor() {
        this.denoCache = new DenoCache();
    }


    // 进行路径解析的转化，如果在 deno 缓存目录下，remote 需要进行重定向
    // jsr 全部统一转化为远程处理 jsr.io 需要转化镜像源
    async reslove(resolveData: ResolveData) {
        console.log(JSON.stringify(resolveData));
        const { request } = resolveData;
        if (request.startsWith(Specifiers.NPM)) {
            // TODO: 根据 deno info 获取并指向 npm 的缓存
        }

        // HTTPS HTTP and JSR TODO: 在 remote 缓存下的目录全部指向新的路径
        if (request.startsWith(Specifiers.HTTPS)) {
            const https = await this.denoCache.get(request) as ModuleEntryEsm;
            resolveData.request = https.local!;
        }
        if (request.startsWith(Specifiers.JSR)) {
            const jsr = await this.denoCache.get(request) as ModuleEntryEsm;
            resolveData.request = jsr.local!;
        }
    }
}
