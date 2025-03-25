# rspack-deno-plugin

Deno module resolution for rspack and rsbuild.

- Support for `http:`, `https:`, `jsr:`, and `npm:` specifiers.

> This project learns [esbuild_deno_loader](https://github.com/lucacasonato/esbuild_deno_loader)

## How to use

- You need to set `"nodeModulesDir": "auto"` in deno.json before start.

### NPM Package

```bash
# install package
deno install npm:rspack-deno-plugin
```

- Use in `rsbuild.config.ts`

```ts
import { defineConfig } from '@rsbuild/core';
import RspackDenoPlugin from 'rspack-deno-plugin';

export default defineConfig({
  // ...
  tools: {
    rspack: {
      plugins: [new RspackDenoPlugin()],
    },
  },
});
```

- Use in `rspack.config.ts`

```bash
# Install ts parser before running
deno install npm:esbuild npm:esbuild-register
```

```ts
import { defineConfig } from '@rspack/cli';
import RspackDenoPlugin from 'rspack-deno-plugin';

export default defineConfig({
  // ...
  plugins: [new RspackDenoPlugin()],
});
```

### JSR Package

- Can only be run with `rsbuild` api.

```bash
# install package
deno install jsr:@snowman/rspack-deno-plugin
```

```ts
// create rsbuild script file like rsbuild-script.ts
import { createRsbuild } from '@rsbuild/core';
import RspackDenoPlugin from '@snowman/rspack-deno-plugin';

const rsbuild = await createRsbuild({
  rsbuildConfig: {
    tools: {
      rspack: {
        // add rspack plugin
        plugins: [new RspackDenoPlugin()],
      },
    },
  },
});

// build
await rsbuild.build();

// preview
await rsbuild.preview();

// dev
await rsbuild.startDevServer();
```

```bash
# run rsbuild script
deno --allow-all ./rsbuild-script.ts
```

## How it works

- `npm:` specifier: Resolve node_modules like node.
- `http:`, `https:`, `jsr:` specifiers: Use `deno info` command to resolve deno local cache.
- `file:`, `data:` specifiers: Resolve by rspack.

## Coming soon

- [ ] Support resolve npm local deno cache.
- [ ] Add test code and CI/CD.
