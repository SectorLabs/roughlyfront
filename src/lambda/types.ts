export interface LambdaBuildConfig {
    command: string;
    watch?: string[];
}

export interface LambdaFunctionConfig {
    name: string;
    version?: number;
    file: string;
    handler: string;
}

export interface LambdaConfig {
    builds?: LambdaBuildConfig[];
    functions: LambdaFunctionConfig[];
}

export type ConsoleFunc = (...args: unknown[]) => void;

export interface Console {
    log: ConsoleFunc;
    debug: ConsoleFunc;
    trace: ConsoleFunc;
    info: ConsoleFunc;
    warn: ConsoleFunc;
    error: ConsoleFunc;
}
