import * as vm from "vm";
import * as fs from "fs";
import * as path from "path";
import type {
    CloudFrontRequest,
    CloudFrontRequestEvent,
    CloudFrontResponse,
    Context,
} from "aws-lambda";
import consola from "consola";
import { Headers } from "node-fetch-commonjs";

import { createEnvVars } from "./env";
import type { LambdaConfig } from "./config";
import { LambdaResult } from "./lambdaResult";

export type LambdaHandler = (
    event: CloudFrontRequestEvent,
    context: Context,
) => Promise<CloudFrontRequest | CloudFrontResponse>;

export class Lambda {
    public name: string;
    public filePath: string;
    public handlerName: string;

    private handler: LambdaHandler | null = null;

    constructor(name: string, filePath: string, handlerName: string) {
        this.name = name;
        this.filePath = filePath;
        this.handlerName = handlerName;
        this.handler = null;
    }

    static initialize(config: LambdaConfig, directory: string): Lambda {
        const filePath = path.resolve(
            path.isAbsolute(config.file)
                ? config.file
                : path.join(directory, config.file),
        );

        const lambda = new Lambda(config.name, filePath, config.handler);
        lambda.enableHotReloading();
        return lambda;
    }

    enableHotReloading() {
        this.evaluate();

        consola.success(`Watching Lambda ${this.name} at ${this.filePath}`);

        fs.watch(this.filePath, () => {
            this.evaluate();
            consola.info(`Lambda ${this.name} changed, reloaded it`);
        });
    }

    async invoke(
        event: CloudFrontRequestEvent,
        context: Context,
    ): Promise<LambdaResult> {
        if (!this.handler) {
            this.evaluate();
        }

        const result = await this.handler!(event, context);
        return new LambdaResult(result);
    }

    evaluate() {
        const src = fs.readFileSync(this.filePath, "utf8");

        const script = new vm.Script(src, {
            filename: this.filePath,
        });

        // We can't just spread `global` like `...global` because not all of
        // its properties are enumerable. We use getOwnPropertyNames to obtain
        // a complete list.
        const inheritedContext = Object.getOwnPropertyNames(global).reduce(
            (acc, name) => ({
                ...acc,
                [name]: Object.getOwnPropertyDescriptor(global, name)?.value,
            }),
            {},
        );

        const context = vm.createContext({
            ...inheritedContext,
            exports: {},
            require,
            // TODO: remove this, this isn't available in node.js, the worker
            // should use ismorphic-fetch or smth
            Headers,
            process: {
                ...process,
                env: {
                    ...process.env,
                    ...createEnvVars(this.filePath, this.handlerName),
                },
            },
        });

        script.runInNewContext(context);

        const handler = context["exports"][this.handlerName];
        if (!handler) {
            throw new Error(
                `${this.filePath} does not export a function named ${this.handlerName}`,
            );
        }

        this.handler = handler;
    }
}
