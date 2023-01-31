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
