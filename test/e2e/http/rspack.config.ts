import { defineConfig } from '@rspack/cli';
import RspackDenoPlugin from '../../../src/index.ts';

export default defineConfig({
  entry: {
    main: './index.ts',
  },
  plugins: [new RspackDenoPlugin()],
});
