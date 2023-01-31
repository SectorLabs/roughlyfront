import * as path from "path";
import * as child_process from "child_process";
import chokidar from "chokidar";

import type { CloudWatch } from "../cloudwatch";
import { AWS_REGION } from "../constants";
import type { Config } from "../config";

import { LambdaFunction } from "./function";
import type { LambdaBuildConfig, LambdaFunctionConfig } from "./types";

export class LambdaRegistry {
    constructor(private functions: LambdaFunction[]) {}

    public get(name: string) {
        const func = this.functions.find((func) => func.name === name);
        if (!func) {
            throw new Error(`No function named '${name}' declared`);
        }

        if (!func.wasEvaluated()) {
            func.evaluate();
        }

        return func;
    }

    static create(config: Config, cloudWatch: CloudWatch): LambdaRegistry {
        const functions = config.lambda.functions?.map(
            (functionConfig: LambdaFunctionConfig) =>
                new LambdaFunction(
                    functionConfig.name,
                    functionConfig.version || 1,
                    this.makePathAbsolute(
                        functionConfig.file,
                        config.directory,
                    ),
                    functionConfig.handler,
                    cloudWatch.group(
                        `/aws/lambda/${AWS_REGION}.${functionConfig.name}`,
                    ),
                ),
        );

        const registry = new LambdaRegistry(functions);
        registry.enableWatcher(config);

        config.lambda.builds?.forEach((buildConfig) => {
            registry.build(buildConfig.command);
        });

        return registry;
    }

    private enableWatcher(config: Config): void {
        const buildWatchPaths = Object.fromEntries(
            config.lambda.builds?.flatMap((buildConfig: LambdaBuildConfig) => {
                return (
                    buildConfig.watch?.map((watchPath) => [
                        LambdaRegistry.makePathAbsolute(
                            watchPath,
                            config.directory,
                        ),
                        buildConfig,
                    ]) || []
                );
            }) || [],
        );

        const functionWatchPaths = Object.fromEntries(
            config.lambda.functions?.map(
                (functionConfig: LambdaFunctionConfig) => {
                    return [
                        LambdaRegistry.makePathAbsolute(
                            functionConfig.file,
                            config.directory,
                        ),
                        functionConfig.name,
                    ];
                },
            ),
        );

        const flatWatchPaths = [
            ...Object.keys(buildWatchPaths),
            ...Object.keys(functionWatchPaths),
        ];

        chokidar
            .watch(flatWatchPaths, {
                ignoreInitial: true,
                awaitWriteFinish: { stabilityThreshold: 100, pollInterval: 20 },
            })
            .on("all", (_event: string, affectedPath: string) => {
                const affectedFunctionName = functionWatchPaths[affectedPath];
                if (affectedFunctionName) {
                    const affectedFunction = this.functions.find(
                        (func) => func.name === affectedFunctionName,
                    );
                    if (affectedFunction) {
                        affectedFunction.evaluate();
                    }
                }

                Object.entries(buildWatchPaths).reduce(
                    (acc: string[], [watchPath, buildConfig]) => {
                        if (
                            affectedPath.startsWith(watchPath) &&
                            !acc.includes(buildConfig.command)
                        ) {
                            this.build(buildConfig.command);
                            return [...acc, buildConfig.command];
                        }

                        return acc;
                    },
                    [],
                );
            });
    }

    private build(command: string) {
        // Wrap in try-catch because we don't actually want to die
        // just because the build failed. The user will simply
        // fix the error and another rebuild will occur.
        try {
            child_process.execSync(command, { stdio: "inherit" });
        } catch (error) {}
    }

    private static makePathAbsolute(value: string, directory: string): string {
        if (path.isAbsolute(value)) {
            return value;
        }

        return path.resolve(path.join(directory, value));
    }
}
