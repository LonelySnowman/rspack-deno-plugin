import { defineConfig } from 'tsup';

export default defineConfig([
  {
    entry: ['src/index.ts'],
    clean: true,
    splitting: true,
    format: ['cjs', 'esm'],
    outDir: 'lib',
    dts: true,
  },
]);
