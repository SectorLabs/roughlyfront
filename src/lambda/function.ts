import * as path from "path";
import * as util from "util";
import type { Context } from "aws-lambda";
import chalk from "chalk";
import consola from "consola";

import { performanceNow } from "../time";
import type { CloudWatchLogGroup, CloudWatchLogStream } from "../cloudwatch";
import { AWS_REGION, AWS_ACCOUNT_ID } from "../constants";

import { LambdaEvaluator } from "./evaluator";
import {
    AWS_LAMBDA_FUNCTION_MEMORY_SIZE,
    AWS_LAMBDA_TIME_LIMIT_MS,
} from "./constants";
import type { Console, ConsoleFunc } from "./types";

export type LambdaCallback = (
    error: Error | null,
    result: unknown | null,
) => void;

export type LambdaHandler = (
    event: unknown,
    context: Context,
    callback?: LambdaCallback,
) => Promise<unknown>;

export class LambdaFunction {
    public name: string;
    public version: number;
    public filePath: string;
    public handlerName: string;
    private logGroup: CloudWatchLogGroup;

    private handler: LambdaHandler | null = null;
    private evaluator: LambdaEvaluator;

    constructor(
        name: string,
        version: number,
        filePath: string,
        handlerName: string,
        logGroup: CloudWatchLogGroup,
    ) {
        this.name = name;
        this.version = version;
        this.filePath = filePath;
        this.handlerName = handlerName;
        this.logGroup = logGroup;

        this.handler = null;
        this.evaluator = new LambdaEvaluator(filePath);
    }

    public async invoke<TEvent, TResult>(
        id: string,
        event: TEvent,
    ): Promise<TResult> {
        await this.evaluate();

        const logStream = this.logGroup.stream(this.version.toString());
        const logConsole = this.createConsole(id, logStream);

        // Mutates the config and leaks into the next invocation,
        // but that is how AWS Lambda works so we're not fixing it.
        this.evaluator.patchEnv(this.constructEventEnv(logStream));
        this.evaluator.patchConsole(logConsole);

        const startTime = performanceNow();
        const eventContext = this.constructEventContext(
            id,
            startTime,
            logStream,
        );

        this.logStart(logStream, id);

        const [result, error] = await this.invokeTryCatch(event, eventContext);

        const endTime = performanceNow();

        // CloudWatch logs show duration accurate to two decimals
        const duration = Math.round((endTime - startTime) * 100) / 100;

        // Billing is done per millisecond, rounded up
        // https://aws.amazon.com/about-aws/whats-new/2020/12/aws-lambda-changes-duration-billing-granularity-from-100ms-to-1ms/
        const billedDuration = Math.ceil(duration);

        this.logEnd(logStream, id);
        this.logReport(logStream, id, duration, billedDuration);

        if (error) {
            logConsole.error(error);
            throw error;
        }

        return result as TResult;
    }

    public async evaluate(): Promise<void> {
        if (this.handler) {
            return;
        }

        const exports = await this.evaluator.evaluate();

        const handler = exports[this.handlerName];
        if (!handler) {
            throw new Error(
                `${this.filePath} does not export a function named ${this.handlerName}`,
            );
        }

        consola.success(`Evaluated Lambda function '${this.name}'`);

        this.handler = handler as LambdaHandler;
    }

    public wasEvaluated(): boolean {
        return !!this.handler;
    }

    private async invokeTryCatch(
        event: unknown,
        eventContext: Context,
    ): Promise<[null | unknown, Error | null]> {
        return new Promise((resolve) => {
            const callback = (error: Error | null, result: unknown | null) =>
                resolve([result, error]);

            try {
                const result = this.handler!(event, eventContext, callback);
                if (result?.then) {
                    result.then((result) => resolve([result, null]));
                }
            } catch (e) {
                resolve([null, e as Error]);
            }
        });
    }

    private createConsole(id: string, logStream: CloudWatchLogStream): Console {
        // Not an exhaustive list of functions that a lambda function
        // could use. It might be more reliable to just trap/capture
        // stdout and stderr instead of intercepting console logs,
        // but this is easier, especially for multi-line logs.
        return {
            log: this.createConsoleFunc(id, "INFO", logStream),
            trace: this.createConsoleFunc(id, "TRACE", logStream),
            debug: this.createConsoleFunc(id, "DEBUG", logStream),
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
            this.logMessage(logStream, id, level, util.format(...args));
    }

    private logStart(logStream: CloudWatchLogStream, id: string): void {
        const coloredIndicator = chalk.green("START");
        const coloredID = chalk.gray(`RequestId: ${id}`);
        const coloredVersion = chalk.gray(this.version);

        logStream.log(`${coloredIndicator} ${coloredID} ${coloredVersion}`);
    }

    private logEnd(logStream: CloudWatchLogStream, id: string): void {
        const coloredIndicator = chalk.red("END");
        const coloredID = chalk.gray(`RequestId: ${id}`);

        logStream.log(`${coloredIndicator} ${coloredID}`);
    }

    private logReport(
        logStream: CloudWatchLogStream,
        id: string,
        duration: number,
        billedDuration: number,
    ): void {
        const coloredIndicator = chalk.yellow("REPORT");
        const coloredID = chalk.gray(`RequestId: ${id}`);
        const coloredDuration = chalk.gray(`Duration: ${duration} ms`);
        const coloredBilledDuration = chalk.gray(
            `Billed Duration: ${billedDuration} ms`,
        );
        const coloredMemorySize = chalk.gray(`Memory Size: 128 MB`);
        const coloredMemoryUsage = chalk.gray(`Max Memory Used: 128 MB`);

        logStream.log(
            `${coloredIndicator} ${coloredID}\t${coloredDuration}\t${coloredBilledDuration}\t${coloredMemorySize}\t${coloredMemoryUsage}`,
        );
    }

    private logMessage(
        logStream: CloudWatchLogStream,
        id: string,
        level: string,
        message: string,
    ): void {
        const coloredTimestamp = chalk.gray(new Date().toISOString());
        const coloredID = chalk.gray(id);
        const coloredLevel = this.coloredLevel(level);

        logStream.log(
            `${coloredTimestamp}\t${coloredID}\t${coloredLevel}\t${message}`,
        );
    }

    private coloredLevel(level: string): string {
        switch (level) {
            case "INFO":
                return chalk.green(level);

            case "WARN":
                return chalk.yellow(level);

            case "ERROR":
                return chalk.red(level);

            default:
                return level;
        }
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
            AWS_LAMBDA_FUNCTION_VERSION: this.version.toString(),
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
            functionVersion: this.version.toString(),
            invokedFunctionArn: `arn:aws:lambda:${AWS_REGION}:${AWS_ACCOUNT_ID}:aws:function:${this.name}`,
            memoryLimitInMB: AWS_LAMBDA_FUNCTION_MEMORY_SIZE.toString(),
            awsRequestId: id,
            logGroupName: this.logGroup.name,
            logStreamName: logStream.name,

            getRemainingTimeInMillis: () =>
                startTime + AWS_LAMBDA_TIME_LIMIT_MS - performanceNow(),

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
