import * as vm from "vm";
import * as fs from "fs";
import * as path from "path";

import type { HandlerFunction } from "./types.js";

/**
 * Creates a list of environment variables to always make
 * available to the Lambda function.
 *
 * List taken from here: https://docs.aws.amazon.com/lambda/latest/dg/configuration-envvars.html
 *
 * We do NOT support custom environment variables because they are not
 * supported on AWS Lambda@Edge (unlike plain AWS Lambda).
 */
const createEnvVars = (
    filePath: string,
    handlerName,
): Record<string, string> => ({
    _HANDLER: handlerName,
    AWS_REGION: "us-east-1",
    AWS_EXECUTION_ENV: "nodejs16.x",
    AWS_LAMBDA_FUNCTION_NAME: "roughlyfront",
    AWS_LAMBDA_FUNCTION_MEMORY_SIZE: 128,
    AWS_LAMBDA_FUNCTION_VERSION: 1,
    AWS_LAMBDA_INITIALIZATION_TYPE: "on-demand",
    AWS_LAMBDA_LOG_GROUP_NAME: "roughlyfront",
    AWS_LAMBDA_LOG_STREAM_NAME: "roughlyfront",
    AWS_ACCESS_KEY: "roughlyfront-access-key-mock",
    AWS_ACCESS_KEY_ID: "roughlyfront-access-key-id-mock",
    AWS_SECRET_ACCESS_KEY: "roughlyfront-secret-access-key-mock",
    AWS_SESSION_TOKEN: "roughlyfront-session-token-mock",
    LAMBDA_TASK_ROOT: path.resolve(__dirname),
    LAMBDA_RUNTIME_DIR: path.resolve(path.join(__dirname, "node_modules")),
});

/**
 * Evaluate the handler script and extract the handler function.
 *
 * We do this instead of using `require(..)` because it allows us
 * to easily re-evaluate the handler script if it changes.
 */
export const evaluateHandlerScript = (
    filePath: string,
    handlerName: string,
): HandlerFunction => {
    const src = fs.readFileSync(filePath, "utf8");

    const script = new vm.Script(src, {
        filename: filePath,
    });

    const context = vm.createContext({
        ...global,
        exports: {},
        require,
        process: {
            ...process,
            env: {
                ...process.env,
                ...createEnvVars(filePath, handlerName),
            },
        },
    });

    script.runInNewContext(context);

    const handlerFunction = context["exports"][handlerName];
    if (!handlerFunction) {
        throw new Error(
            `${filePath} does not export a function named ${handlerName}`,
        );
    }

    return handlerFunction as HandlerFunction;
};
