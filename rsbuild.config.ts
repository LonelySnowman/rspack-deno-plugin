import { defineConfig } from '@rsbuild/core';
import RspackDenoPlugin from './src/index.ts';

export default defineConfig({
  output: {
    target: 'web',
    minify: false,
  },
  source: {
    entry: {
      index: './src/test.ts',
    },
  },
  tools: {
    rspack: {
      plugins: [new RspackDenoPlugin()],
    },
  },
});
