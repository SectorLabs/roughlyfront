// Types for --experimental-vm-modules features not currently in @types/node
declare module "vm" {
    interface ModuleEvaluateOptions {
        timeout?: number;
        breakOnSigint?: boolean;
    }

    type ModuleLinker = (
        specifier: string,
        referencingModule: Module,
    ) => Module | Promise<Module>;

    type ModuleStatus =
        | "unlinked"
        | "linking"
        | "linked"
        | "evaluating"
        | "evaluated"
        | "errored";

    class Module<Namespace = unknown> {
        context: Context;
        identifier: string;
        dependencySpecifiers: string[];
        namespace: Namespace;
        status: ModuleStatus;
        error: Error;
        link(linker: ModuleLinker): Promise<Module>;
        evaluate(options?: ModuleEvaluateOptions): Promise<undefined>;
    }

    type SourceTextModuleMeta = {
        url?: string;
    };

    type SourceTextModuleInitialiseImportMeta = (
        meta: SourceTextModuleMeta,
        module: SourceTextModule,
    ) => void;

    type SourceTextModuleImportModuleDynamically = (
        specifier: string,
        module: Module,
    ) => Promise<Module>;

    interface SourceTextModuleOptions {
        identifier?: string;
        cachedData?: Buffer | NodeJS.TypedArray | DataView;
        context?: Context;
        lineOffset?: number;
        columnOffset?: number;
        initializeImportMeta?: SourceTextModuleInitialiseImportMeta;
        importModuleDynamically?: SourceTextModuleImportModuleDynamically;
    }

    class SourceTextModule<Namespace = unknown> extends Module<Namespace> {
        constructor(code: string, options?: SourceTextModuleOptions);
        createCachedData(): Buffer;
    }

    type SyntheticModuleEvaluate<Namespace> = (
        this: SyntheticModule<Namespace>,
    ) => void;

    interface SyntheticModuleOptions {
        identifier?: string;
        context?: Context;
    }

    class SyntheticModule<Namespace = unknown> extends Module<Namespace> {
        constructor(
            exportNames: (keyof Namespace)[],
            evaluateCallback: SyntheticModuleEvaluate<Namespace>,
            options?: SyntheticModuleOptions,
        );
        setExport(name: keyof Namespace, value: unknown): void;
    }
}
