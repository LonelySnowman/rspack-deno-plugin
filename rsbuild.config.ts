import { defineConfig } from '@rsbuild/core';
import RspackDenoPlugin from './src/index.ts';

export default defineConfig({
    output: {
        target: 'node',
    },
    source: {
        entry: {
            index: './src/test.ts'
        }
    },
    tools: {
        rspack: {
            plugins: [new RspackDenoPlugin()],
            // 这部分卸载 rspack 钩子中
            module: {
                rules: [
                    {
                        test: /deno\/remote/, // 使用 deno info 去获取缓存地址并判断解析
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
                    },
                ],
            }
        },
    },
});
