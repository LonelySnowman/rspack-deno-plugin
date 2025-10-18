import { dirname, join, sep } from "node:path";
import type { ResolveData } from "@rspack/core";
import { DenoCache } from "../deno-cache.ts";
import {
	type ConfigFile,
	type Loader,
	type LoaderContext,
	type ModuleEntryEsm,
	Specifiers,
} from "../types.ts";
import { parseNpmSpecifier, readJsonFile } from "../utils.ts";

export class NativeLoader implements Loader {
	denoCache: DenoCache;
	context: LoaderContext;

	constructor() {
		this.denoCache = new DenoCache();
		this.context = {
			curWorkingDir: Deno.cwd(),
			curDenoJson: {},
			workspaceWorkingDir: Deno.cwd(),
			workspaceDenoJson: {},
			workspacePackages: new Map(),
		};
	}

	async beforeRun() {
		await this._processContext();
		await this._processWorkspace();
		await this.denoCache.init(this.context.curDenoJson);
	}

	// process context info
	private async _processContext() {
		const denoJsonPath = `${this.context.curWorkingDir}/deno.json`;
		try {
			this.context.curDenoJson = await readJsonFile<ConfigFile>(denoJsonPath);
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : String(error);
			console.error(
				`Error: Could not read deno.json from ${denoJsonPath}:`,
				errorMessage,
			);
			this.context.curDenoJson = {} as ConfigFile;
		}
	}

	// find workspace deno.json
	private async _findWorkspaceDenoJson(): Promise<ConfigFile> {
		let currentDir = this.context.curWorkingDir;
		const rootPath = currentDir.split(sep)[0] + sep; // Windows: "C:\", Unix: "/"

		while (currentDir && currentDir !== rootPath) {
			try {
				const denoJsonPath = join(currentDir, "deno.json");
				const denoJson = await readJsonFile<ConfigFile>(denoJsonPath);

				if (denoJson.workspace && Array.isArray(denoJson.workspace)) {
					// set workspace root directory
					this.context.workspaceWorkingDir = currentDir;
					return denoJson;
				}

				// find parent directory
				const parentDir = dirname(currentDir);
				if (parentDir === currentDir) break; // prevent infinite loop
				currentDir = parentDir;
			} catch {
				// if current directory does not have deno.json, continue to find parent directory
				const parentDir = dirname(currentDir);
				if (parentDir === currentDir) break;
				currentDir = parentDir;
			}
		}

		// if not found workspace deno.json, use current directory deno.json
		this.context.workspaceWorkingDir = this.context.curWorkingDir;
		try {
			const currentDenoJsonPath = join(this.context.curWorkingDir, "deno.json");
			return await readJsonFile<ConfigFile>(currentDenoJsonPath);
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : String(error);
			console.error(
				`Error: Could not read deno.json from ${join(this.context.curWorkingDir, "deno.json")}:`,
				errorMessage,
			);
			return {} as ConfigFile;
		}
	}

	// process workspace info
	private async _processWorkspace() {
		this.context.workspaceDenoJson = await this._findWorkspaceDenoJson();
		const workspace = this.context.workspaceDenoJson.workspace;
		if (!workspace || !Array.isArray(workspace)) {
			return;
		}

		for (const workspacePath of workspace) {
			try {
				// normalize path, remove ./ and / at the end
				const normalizedWorkspacePath = workspacePath
					.replace(/^\.\//, "")
					.replace(/\/$/, "");
				const subPackagePath = join(
					this.context.workspaceWorkingDir,
					normalizedWorkspacePath,
				);
				const subPackageJsonPath = join(subPackagePath, "deno.json");

				const subPackageJson =
					await readJsonFile<ConfigFile>(subPackageJsonPath);
				const packageName = subPackageJson.name;
				const packageExports = subPackageJson.exports || "./index.ts";

				if (packageName) {
					const absoluteExportsPath = join(
						subPackagePath,
						packageExports.replace("./", ""),
					);
					this.context.workspacePackages.set(packageName, {
						name: packageName,
						path: subPackagePath,
						exportsPath: absoluteExportsPath,
						denoJson: subPackageJson,
					});
				}
			} catch (error) {
				const errorMessage =
					error instanceof Error ? error.message : String(error);
				console.error(
					`Error: Could not process workspace package at ${workspacePath}:`,
					errorMessage,
				);
			}
		}
	}

	async beforeResolve(resolveData: ResolveData) {
		await this.denoCache.resolveRequestToDenoSpecifier(
			resolveData as ResolveData,
		);
		const { request } = resolveData;

		// Parse monorepo workspace package
		if (this.context.workspacePackages.has(request)) {
			resolveData.request =
				this.context.workspacePackages.get(request)!.exportsPath;
			return;
		}

		// NPM use node_modules packages
		if (request.startsWith(Specifiers.NPM)) {
			resolveData.request = parseNpmSpecifier(request);
			return;
		}

		// JSR, HTTP and HTTPS use deno local cache
		if (request.startsWith(Specifiers.JSR)) {
			const jsr = (await this.denoCache.get(request)) as ModuleEntryEsm;
			resolveData.request = jsr.local!;
			return;
		}

		if (
			request.startsWith(Specifiers.HTTPS) ||
			request.startsWith(Specifiers.HTTP)
		) {
			const jsr = (await this.denoCache.get(request)) as ModuleEntryEsm;
			resolveData.request = jsr.local!;
			return;
		}
	}
}
