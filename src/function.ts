import * as vm from "vm";
import * as fs from "fs";
import type {
    CloudFrontRequest,
    CloudFrontRequestEvent,
    CloudFrontResponse,
    Context,
} from "aws-lambda";

import { createEnvVars } from "./env";

export type FunctionHandler = (
    event: CloudFrontRequestEvent,
    context: Context,
) => Promise<CloudFrontRequest | CloudFrontResponse>;

export class LambdaEdgeFunction {
    private handler: FunctionHandler | null = null;

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

        const context = vm.createContext({
            ...global,
            exports: {},
            require,
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
