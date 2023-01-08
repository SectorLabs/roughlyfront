import * as vm from "vm";
import * as fs from "fs";
import type {
    CloudFrontRequest,
    CloudFrontRequestEvent,
    CloudFrontResponse,
    Context,
} from "aws-lambda";
import { Headers } from "node-fetch-commonjs";

import { createEnvVars } from "./env";

export type LambdaHandler = (
    event: CloudFrontRequestEvent,
    context: Context,
) => Promise<CloudFrontRequest | CloudFrontResponse>;

export class Lambda {
    private handler: LambdaHandler | null = null;

    constructor(private filePath: string, private handlerName: string) {
        this.handler = null;
    }

    async invoke(
        event: CloudFrontRequestEvent,
        context: Context,
    ): Promise<CloudFrontRequest | CloudFrontResponse> {
        if (!this.handler) {
            this.evaluate();
        }

        return this.handler!(event, context);
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
