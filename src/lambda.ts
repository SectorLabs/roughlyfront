import * as vm from "vm";
import * as fs from "fs";
import type {
    CloudFrontRequest,
    CloudFrontRequestEvent,
    CloudFrontResponse,
    Context,
} from "aws-lambda";
import consola from "consola";
import { Headers } from "node-fetch-commonjs";

import { createEnvVars } from "./env";
import { LambdaResult } from "./lambdaResult";

export type LambdaHandler = (
    event: CloudFrontRequestEvent,
    context: Context,
) => Promise<CloudFrontRequest | CloudFrontResponse>;

export class Lambda {
    public name: string;
    private handler: LambdaHandler | null = null;

    constructor(
        name: string,
        private filePath: string,
        private handlerName: string,
    ) {
        this.name = name;
        this.handler = null;
    }

    static initialize(
        name: string,
        filePath: string,
        handlerName: string,
    ): Lambda {
        const lambda = new Lambda(name, filePath, handlerName);
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
