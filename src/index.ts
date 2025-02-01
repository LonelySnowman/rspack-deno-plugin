import { Compiler, RspackPluginInstance, ResolveData, Compilation, NormalModule, Loader } from '@rspack/core';
import { Specifiers, PluginOption } from "./types.ts";
import { NativeLoader } from "./loader/native-loader.ts";
import { PortableLoader } from "./loader/portable-loader.ts";

type ResourceDataWithData = {
  resource: string;
  path: string;
  query?: string;
  fragment?: string;
  data?: Record<string, any>;
};

const PLUGIN_NAME = 'RspackDenoPlugin';


// LJQFLAG 两个 URL 可替换
const registryUrl = "https://registry.npmjs.org"; // npmPackage.registryUrl

const JSR_URL = Deno.env.get("JSR_URL") ?? "https://jsr.io"; // Deno 的远程环境


// 版本兼容代码待调研
const args = ["info", "--json"];
if (!Deno.version.deno.startsWith("1.")) {
  args.push("--allow-import");
}

// 将 jsr 解析为 https 远程模块请求

// TODO: 添加是否需要 node_modules 的配置
class RspackDenoPlugin implements RspackPluginInstance {
  _Loader: Loader;

  constructor(option?: PluginOption) {
    const { mode = 'native' } = option || {};
    if (mode === 'native') {
      this._Loader = new NativeLoader();
    } else if (mode === 'portable') {
      this._Loader = new PortableLoader();
    } else {
      throw new Error('option mode error')
    }
  }

  apply(compiler: Compiler) {
    compiler.hooks.compilation.tap(PLUGIN_NAME, (_compilation: Compilation, { normalModuleFactory }) => {
      normalModuleFactory.hooks.beforeResolve.tap(PLUGIN_NAME, this._Loader.reslove.bind(this._Loader));
    });
  }
}

export default RspackDenoPlugin;
