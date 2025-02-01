import { ResolveData } from "@rspack/core";
import { Loader, Specifiers } from '../types.ts';

export class PortableLoader implements Loader {
    async reslove(resolveData: ResolveData) {
        // TODO 读取 deno.json 将 package 转化为 URL 是 jsr 还是 npm
        let reslovePath = resolveData.request;
        // 写一个方法用 switch case 进行解析
        if (reslovePath.startsWith(Specifiers.NPM)) {
          reslovePath = reslovePath.slice(Specifiers.NPM.length);
        }
        resolveData.request = reslovePath;
    }
}
