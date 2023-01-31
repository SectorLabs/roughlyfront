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

import {
    AWS_REGION,
    AWS_ACCOUNT_ID,
    AWS_LAMBDA_FUNCTION_VERSION,
    AWS_LAMBDA_FUNCTION_MEMORY_SIZE,
    AWS_LAMBDA_TIME_LIMIT_MS,
} from "./constants";
import type { LambdaConfig } from "./config";
import { RequestEventResult } from "./requestEventResult";
import type {
    CloudWatch,
    CloudWatchLogGroup,
    CloudWatchLogStream,
} from "./cloudWatch";

export type LambdaHandler = (
    event: CloudFrontRequestEvent,
    context: Context,
) => Promise<CloudFrontRequest | CloudFrontResponse>;

type ConsoleFunc = (...args: unknown[]) => void;

interface Console {
    log: ConsoleFunc;
    info: ConsoleFunc;
    warn: ConsoleFunc;
    error: ConsoleFunc;
}

export class Lambda {
    public name: string;
    public filePath: string;
    public handlerName: string;
    public buildCommand: string | undefined;
    public buildWatchPaths: string[] | undefined;

    private handler: LambdaHandler | null = null;
    private context: vm.Context | null = null;
    private logGroup: CloudWatchLogGroup;

    constructor(
        name: string,
        filePath: string,
        handlerName: string,
        logGroup: CloudWatchLogGroup,
        buildCommand?: string | undefined,
        buildWatchPaths?: string[] | undefined,
    ) {
        this.name = name;
        this.filePath = filePath;
        this.handlerName = handlerName;
        this.handler = null;
        this.buildCommand = buildCommand;
        this.buildWatchPaths = buildWatchPaths;
        this.logGroup = logGroup;
    }

    static initialize(
        config: LambdaConfig,
        directory: string,
        cloudWatch: CloudWatch,
    ): Lambda {
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
            cloudWatch.group(`/aws/lambda/${AWS_REGION}.${config.name}`),
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
        id: string,
        event: CloudFrontRequestEvent,
    ): Promise<RequestEventResult> {
        if (!this.handler || !this.context) {
            this.evaluate();
        }

        const logStream = this.logGroup.stream();
        const logConsole = this.createConsole(id, logStream);

        this.patchEnv(logStream);
        this.patchConsole(logConsole);

        const startTime = performance.now();
        const eventContext = this.constructEventContext(
            id,
            startTime,
            logStream,
        );

        logStream.log(`START RequestId: ${id} ${eventContext.functionVersion}`);

        const [result, error] = await this.invoke(event, eventContext);

        const endTime = performance.now();
        const duration = endTime - startTime;
        const billedDuration = Math.ceil(duration / 10) * 10;

        logStream.log(`END RequestId: ${id}`);
        logStream.log(
            `REPORT RequestId: ${id}\tDuration: ${duration} ms\tBilled Duration: ${billedDuration} ms\tMemory Size: ${eventContext.memoryLimitInMB} MB\tMax Memory Used: ${eventContext.memoryLimitInMB} MB`,
        );

        if (error) {
            logConsole.error(error);
            throw error;
        }

        return result;
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

        const scriptExports: Record<string, unknown> = {};

        script.runInNewContext(this.context)(
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

    private async invoke(
        event: CloudFrontRequestEvent,
        eventContext: Context,
    ): Promise<[RequestEventResult, null] | [null, Error]> {
        try {
            const result = await this.handler!(event, eventContext);
            return [new RequestEventResult(result), null];
        } catch (e) {
            return [null, e as Error];
        }
    }

    private patchEnv(logStream: CloudWatchLogStream): void {
        this.context!["process"]["env"] = {
            ...this.context!["process"]["env"],
            ...this.constructEventEnv(logStream),
        };
    }

    private patchConsole(console: Console): void {
        this.context!["console"] = {
            ...this.context!["console"],
            ...console,
        };
    }

    private createConsole(id: string, logStream: CloudWatchLogStream): Console {
        return {
            log: this.createConsoleFunc(id, "INFO", logStream),
            info: this.createConsoleFunc(id, "INFO", logStream),
            warn: this.createConsoleFunc(id, "WARN", logStream),
            error: this.createConsoleFunc(id, "ERROR", logStream),
        };
    }

    private createConsoleFunc(
        id: string,
        level: string,
        logStream: CloudWatchLogStream,
    ): ConsoleFunc {
        return (...args) =>
            logStream.log(
                `${new Date().toISOString()}\t${id}\t${level}\t${args.join(
                    " ",
                )}`,
            );
    }

    private constructEventEnv(
        logStream: CloudWatchLogStream,
    ): Record<string, string> {
        const nodeMajorVersion = process.version.slice(1).split(".")[0];

        return {
            _HANDLER: this.handlerName,
            AWS_REGION,
            AWS_EXECUTION_ENV: `nodejs${nodeMajorVersion}.x`,
            AWS_LAMBDA_FUNCTION_NAME: this.name,
            AWS_LAMBDA_FUNCTION_MEMORY_SIZE:
                AWS_LAMBDA_FUNCTION_MEMORY_SIZE.toString(),
            AWS_LAMBDA_FUNCTION_VERSION: AWS_LAMBDA_FUNCTION_VERSION.toString(),
            AWS_LAMBDA_INITIALIZATION_TYPE: "on-demand",
            AWS_LAMBDA_LOG_GROUP_NAME: this.logGroup.name,
            AWS_LAMBDA_LOG_STREAM_NAME: logStream.name,
            AWS_ACCESS_KEY: `${this.name}-access-key-mock`,
            AWS_ACCESS_KEY_ID: `${this.name}-access-key-id-mock`,
            AWS_SECRET_ACCESS_KEY: `${this.name}-secret-access-key-mock`,
            AWS_SESSION_TOKEN: `${this.name}-session-token-mock`,
            LAMBDA_TASK_ROOT: path.resolve(this.filePath),
            LAMBDA_RUNTIME_DIR: path.resolve(
                path.join(this.filePath, "node_modules"),
            ),
        };
    }

    private constructEventContext(
        id: string,
        startTime: number,
        logStream: CloudWatchLogStream,
    ): Context {
        return {
            callbackWaitsForEmptyEventLoop: false,
            functionName: this.name,
            functionVersion: AWS_LAMBDA_FUNCTION_VERSION.toString(),
            invokedFunctionArn: `arn:aws:lambda:${AWS_REGION}:${AWS_ACCOUNT_ID}:aws:function:${this.name}`,
            memoryLimitInMB: AWS_LAMBDA_FUNCTION_MEMORY_SIZE.toString(),
            awsRequestId: id,
            logGroupName: this.logGroup.name,
            logStreamName: logStream.name,

            getRemainingTimeInMillis: () =>
                startTime + AWS_LAMBDA_TIME_LIMIT_MS - performance.now(),

            // DEPRECATED, but we have to add them to comply with the `Context` type
            /* eslint-disable @typescript-eslint/no-unused-vars */
            /* eslint-disable @typescript-eslint/no-explicit-any */
            /* eslint-disable @typescript-eslint/no-empty-function */
            done: (_error?: Error, _result?: any): void => {},
            fail: (_error: Error | string): void => {},
            succeed: (_message: any, _object?: any): void => {},
            /* eslint-enable @typescript-eslint/no-unused-vars */
            /* eslint-enable @typescript-eslint/no-explicit-any */
            /* eslint-enable @typescript-eslint/no-empty-function */
        };
    }
}
