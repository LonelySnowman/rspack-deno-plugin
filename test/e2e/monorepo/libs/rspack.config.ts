import { defineConfig } from "@rspack/cli";
import RspackDenoPlugin from "../../../../src/index.ts";

export default defineConfig({
	entry: {
		main: "./mod.ts",
	},
	plugins: [new RspackDenoPlugin()],
});
