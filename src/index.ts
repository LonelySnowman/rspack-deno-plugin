import { Compiler, RspackPluginInstance, Compilation } from '@rspack/core';
import { PluginOption, Loader } from './types.ts';
import { NativeLoader } from './loader/native-loader.ts';
import { PortableLoader } from './loader/portable-loader.ts';

const PLUGIN_NAME = 'RspackDenoPlugin';

class RspackDenoPlugin implements RspackPluginInstance {
  _Loader: Loader;
  _option: PluginOption;

  constructor(option?: PluginOption) {
    const { mode = 'native' } = option || {};
    if (mode === 'native') {
      this._Loader = new NativeLoader();
    } else if (mode === 'portable') {
      this._Loader = new PortableLoader();
    } else {
      throw new Error('Option mode error');
    }

    this._option = {
      mode,
    };
  }

  async initPlugin(compiler: Compiler) {
    if (this._option.mode === 'native') {
      const loader = this._Loader as NativeLoader;
      await loader.beforeRun?.();
      // Use builtin:swc-loader to process ts files in deno cache
      compiler.options.module.rules.push({
        test: loader.denoCache._rootInfo?.denoDir,
        exclude: [/node_modules/],
        loader: 'builtin:swc-loader',
        options: {
          jsc: {
            parser: {
              syntax: 'typescript',
            },
          },
        },
        type: 'javascript/auto',
      });
    }
  }

  apply(compiler: Compiler) {
    compiler.hooks.beforeRun.tapPromise(PLUGIN_NAME, this.initPlugin.bind(this));
    compiler.hooks.watchRun.tapPromise(PLUGIN_NAME, this.initPlugin.bind(this));
    compiler.hooks.compilation.tap(PLUGIN_NAME, (_compilation: Compilation, { normalModuleFactory }) => {
      normalModuleFactory.hooks.beforeResolve.tap(PLUGIN_NAME, this._Loader.beforeResolve.bind(this._Loader));
    });
  }
}

export default RspackDenoPlugin;
