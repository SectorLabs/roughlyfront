import * as vm from "vm";
import * as fs from "fs";
import * as path from "path";
import { Module } from "module";
import * as child_process from "child_process";
import type {
    CloudFrontRequest,
    CloudFrontRequestEvent,
    CloudFrontResponse,
    Context,
} from "aws-lambda";
import consola from "consola";
import chokidar from "chokidar";

import { createEnvVars } from "./env";
import type { LambdaConfig } from "./config";
import { RequestEventResult } from "./requestEventResult";

export type LambdaHandler = (
    event: CloudFrontRequestEvent,
    context: Context,
) => Promise<CloudFrontRequest | CloudFrontResponse>;

export class Lambda {
    public name: string;
    public filePath: string;
    public handlerName: string;
    public buildCommand: string | undefined;
    public buildWatchPaths: string[] | undefined;

    private handler: LambdaHandler | null = null;

    constructor(
        name: string,
        filePath: string,
        handlerName: string,
        buildCommand?: string | undefined,
        buildWatchPaths?: string[] | undefined,
    ) {
        this.name = name;
        this.filePath = filePath;
        this.handlerName = handlerName;
        this.handler = null;
        this.buildCommand = buildCommand;
        this.buildWatchPaths = buildWatchPaths;
    }

    static initialize(config: LambdaConfig, directory: string): Lambda {
        const filePath = path.resolve(
            path.isAbsolute(config.file)
                ? config.file
                : path.resolve(path.join(directory, config.file)),
        );

        const buildWatchPaths = config.build?.watch
            ? config.build?.watch.map((watchPath) =>
                  path.isAbsolute(watchPath)
                      ? watchPath
                      : path.resolve(path.join(directory, watchPath)),
              )
            : config.build?.watch;

        const lambda = new Lambda(
            config.name,
            filePath,
            config.handler,
            config.build?.command,
            buildWatchPaths,
        );
        lambda.build();
        lambda.evaluate();
        lambda.enableHotReloading();
        return lambda;
    }

    enableHotReloading() {
        const watchPaths = [this.filePath];
        if (this.buildWatchPaths) {
            watchPaths.push(...this.buildWatchPaths);
        }

        chokidar
            .watch(watchPaths, {
                ignoreInitial: true,
                awaitWriteFinish: { stabilityThreshold: 100, pollInterval: 20 },
            })
            .on("all", (_event: string, affectedPath: string) => {
                if (affectedPath === this.filePath) {
                    this.evaluate();
                } else {
                    this.build();
                }
            });
    }

    async invokeForRequestEvent(
        event: CloudFrontRequestEvent,
        context: Context,
    ): Promise<RequestEventResult> {
        if (!this.handler) {
            this.evaluate();
        }

        const result = await this.handler!(event, context);
        return new RequestEventResult(result);
    }

    build() {
        if (!this.buildCommand) {
            return;
        }

        // Wrap in try-catch because we don't actually want to die
        // just because the build failed. The user will simply
        // fix the error and another rebuild will occur.
        try {
            child_process.execSync(this.buildCommand, { stdio: "inherit" });
        } catch (error) {}
    }

    evaluate() {
        const src = fs.readFileSync(this.filePath, "utf8");

        const script = new vm.Script(Module.wrap(src), {
            filename: this.filePath,
        });

        const context = vm.createContext({
            process: {
                ...process,
                env: {
                    ...process.env,
                    ...createEnvVars(
                        this.filePath,
                        this.name,
                        this.handlerName,
                    ),
                },
            },
        });

        // Inherit the context from this process. Most properties of `global`
        // are not iterable, hence we use `getOwnPropertyNames` instead of
        // just spreading the object.
        Object.getOwnPropertyNames(global).forEach((name) => {
            const descriptor = Object.getOwnPropertyDescriptor(global, name);
            if (!descriptor) {
                return;
            }

            Object.defineProperty(context, name, descriptor);
        });

        // Create circular reference that is expected. You get really
        // strange issues if this circular reference doesn't exists.
        context["global"] = context;

        const scriptExports: Record<string, unknown> = {};

        script.runInNewContext(context)(
            scriptExports,
            Module.createRequire(this.filePath),
            module,
            this.filePath,
            path.dirname(this.filePath),
        );

        const handler = scriptExports[this.handlerName];
        if (!handler) {
            throw new Error(
                `${this.filePath} does not export a function named ${this.handlerName}`,
            );
        }

        consola.success(`Evaluated Lambda function '${this.name}'`);

        this.handler = handler as LambdaHandler;
    }
}
