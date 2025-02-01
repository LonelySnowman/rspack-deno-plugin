import { InfoOption, InfoOutput, NpmPackage, ModuleEntry, RootInfoOutput } from "./types.ts";

let tmpDir: string | undefined;

export class DenoCache {
    _option: InfoOption;
    _redirects: Map<string, string> = new Map();
    _npmPackages: Map<string, NpmPackage> = new Map();
    _modules: Map<string, ModuleEntry> = new Map();

    constructor(option?: InfoOption) {
        this._option = option || {};
    }

    // 考虑更改成队列
    async get(specifier: string): Promise<ModuleEntry> {
        let entry = this._getCached(specifier);
        if (entry !== undefined) return entry;
        // 考虑做成队列的形式 TODO: 为什么需要队列
        await this._load(specifier);
        entry = this._getCached(specifier);
        if (entry === undefined) throw new Error(`'${specifier}' loaded but not searched`);
        return entry;
    }

    _getCached(specifier: string): ModuleEntry | undefined {
        specifier = this._resolve(specifier);
        return this._modules.get(specifier);
    }

    async _getDenoInfo(specifier: string): Promise<InfoOutput> {
        // Gen deno info command option
        const option = this._option;
        const commandOption: Deno.CommandOptions = {
            args: ["info", "--json", specifier],
            cwd: undefined,
            env: { DENO_NO_PACKAGE_JSON: "true" },
            stdout: "piped",
            stderr: "inherit",
        };
        if (option.cwd) {
            commandOption.cwd = option.cwd;
        } else {
            commandOption.cwd = Deno.makeTempDirSync();
        }

        // Command output to object
        const output = await new Deno.Command(
            Deno.execPath(),
            commandOption
        ).output();
        const txt = new TextDecoder().decode(output.stdout);
        return JSON.parse(txt);
    }

    async _load(specifier: string) {
        const { modules, redirects, npmPackages } = await this._getDenoInfo(specifier);
        for (const mod of modules) {
            this._modules.set(mod.specifier, mod);
        }
        for (const [from, to] of Object.entries(redirects)) {
            this._redirects.set(from, to);
        }
        if (npmPackages !== undefined) {
            for (const [id, npmPackage] of Object.entries(npmPackages)) {
                this._npmPackages.set(id, npmPackage);
            }
        }
    }

    _resolve(specifier: string) {
        const original = specifier;
        let counter = 0;
        while (counter++ < 10) {
          const redirect = this._redirects.get(specifier);
          if (redirect === undefined) return specifier;
          specifier = redirect;
        }
        throw new Error(`Too many redirects for '${original}'`);
    }

    // 考虑初始化的时候直接加载
    async _rootInfo(): Promise<RootInfoOutput> {
        if (!tmpDir) tmpDir = Deno.makeTempDirSync();
        const opts = {
          args: ["info", "--json", "--no-config", "--no-lock"],
          cwd: tmpDir,
          env: { DENO_NO_PACKAGE_JSON: "true" },
          stdout: "piped",
          stderr: "inherit",
        };
      
        const output = await new Deno.Command(
          Deno.execPath(),
          opts as Deno.CommandOptions,
        ).output();
        if (!output.success) {
          throw new Error(`Failed to call 'deno info'`);
        }
        const txt = new TextDecoder().decode(output.stdout);
        return JSON.parse(txt);
    }
}
