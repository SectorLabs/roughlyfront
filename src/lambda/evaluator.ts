import * as vm from "vm";
import * as fs from "fs";
import * as path from "path";
import { Module } from "module";
import findUp from "find-up";
import type { Console } from "./types";

export class LambdaEvaluator {
    public filePath: string;

    private context: vm.Context | null = null;
    private cachedModules: Map<string, vm.SyntheticModule> = new Map();

    constructor(filePath: string) {
        this.filePath = filePath;
    }

    public async evaluate(): Promise<Record<string, unknown>> {
        const context = this.initializeContext();

        return (await this.isESM())
            ? await this.evaluateESM(context)
            : this.evaluateCJS(context);
    }

    public patchEnv(env: Record<string, string>): void {
        this.context!["process"]["env"] = {
            ...this.context!["process"]["env"],
            ...env,
        };
    }

    public patchConsole(console: Console): void {
        this.context!["console"] = {
            ...this.context!["console"],
            ...console,
        };
    }

    private evaluateCJS(context: vm.Context): Record<string, unknown> {
        const src = fs.readFileSync(this.filePath, "utf8");

        const script = new vm.Script(Module.wrap(src), {
            filename: this.filePath,
        });

        const scriptExports: Record<string, unknown> = {};

        script.runInNewContext(context)(
            scriptExports,
            Module.createRequire(this.filePath),
            module,
            this.filePath,
            path.dirname(this.filePath),
        );

        return scriptExports;
    }

    private async evaluateESM(
        context: vm.Context,
    ): Promise<Record<string, unknown>> {
        if (!vm.SourceTextModule) {
            throw new Error(
                "ESM/Modules support requires running node with the '--experimental-vm-modules' flag.",
            );
        }

        const src = fs.readFileSync(this.filePath, "utf8");

        const script = new vm.SourceTextModule(src, {
            identifier: this.filePath,
            context,
            initializeImportMeta: (meta) => {
                // Without this, `import.meta.url` doesn't work properly
                meta.url = `file:///${this.filePath}`;
            },
        });

        // Do not re-use the cache between runs, otherwise we get:
        // [ERR_VM_MODULE_DIFFERENT_CONTEXT]: Linked modules must use the same context
        this.cachedModules.clear();

        // Adopted from: https://github.com/nodejs/node/issues/35848#issuecomment-1024964697
        await script.link(async (specifier, referencingModule) => {
            const cachedModule = this.cachedModules.get(specifier);
            if (cachedModule) {
                return cachedModule;
            }

            const rawModule = await import(specifier);
            const exportedNames = Object.keys(rawModule);

            const synthenticModule = new vm.SyntheticModule(
                exportedNames,
                () => {
                    exportedNames.forEach((name) => {
                        synthenticModule.setExport(name, rawModule[name]);
                    });
                },
                { identifier: specifier, context: referencingModule.context },
            );

            this.cachedModules.set(specifier, synthenticModule);
            return synthenticModule;
        });

        await script.evaluate();

        return script.namespace as Record<string, unknown>;
    }

    private async isESM(): Promise<boolean> {
        if (this.filePath.endsWith(".mjs")) {
            return true;
        }

        if (this.filePath.endsWith(".cjs")) {
            return false;
        }

        const closestPackageJSONFilePath = await findUp("package.json", {
            type: "file",
            cwd: path.dirname(this.filePath),
        });

        if (
            closestPackageJSONFilePath &&
            fs.existsSync(closestPackageJSONFilePath)
        ) {
            const packageJSON = JSON.parse(
                fs.readFileSync(closestPackageJSONFilePath, "utf8"),
            );
            return packageJSON.type === "module";
        }

        throw new Error(
            `Could not determine whether '${this.filePath}' is a CommonJS or ESM module. Change the file extension to '.mjs' or '.cjs'`,
        );
    }

    private initializeContext(): vm.Context {
        // Inherit the context from this process. Most properties of `global`
        // are not iterable, hence we use `getOwnPropertyNames` instead of
        // just spreading the object.
        this.context = vm.createContext();
        Object.getOwnPropertyNames(global).forEach((name) => {
            const descriptor = Object.getOwnPropertyDescriptor(global, name);
            if (!descriptor) {
                return;
            }

            Object.defineProperty(this.context, name, descriptor);
        });

        // Create circular reference that is expected. You get really
        // strange issues if this circular reference doesn't exists.
        this.context["global"] = this.context;

        return this.context;
    }
}
