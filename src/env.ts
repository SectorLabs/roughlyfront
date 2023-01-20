import * as path from "path";

import {
    AWS_REGION,
    AWS_LAMBDA_FUNCTION_VERSION,
    AWS_LAMBDA_FUNCTION_MEMORY_SIZE,
} from "./constants";

/**
 * Creates a list of environment variables to make available
 * to the function.
 *
 * List taken from here: https://docs.aws.amazon.com/lambda/latest/dg/configuration-envvars.html
 *
 * We do NOT support custom environment variables because they are not
 * supported on AWS Lambda@Edge (unlike plain AWS Lambda).
 */
export const createEnvVars = (
    filePath: string,
    functionName: string,
    handlerName: string,
): Record<string, string> => {
    const nodeMajorVersion = process.version.slice(1).split(".")[0];

    return {
        _HANDLER: handlerName,
        AWS_REGION,
        AWS_EXECUTION_ENV: `nodejs${nodeMajorVersion}.x`,
        AWS_LAMBDA_FUNCTION_NAME: functionName,
        AWS_LAMBDA_FUNCTION_MEMORY_SIZE:
            AWS_LAMBDA_FUNCTION_MEMORY_SIZE.toString(),
        AWS_LAMBDA_FUNCTION_VERSION: AWS_LAMBDA_FUNCTION_VERSION.toString(),
        AWS_LAMBDA_INITIALIZATION_TYPE: "on-demand",
        AWS_LAMBDA_LOG_GROUP_NAME: functionName,
        AWS_LAMBDA_LOG_STREAM_NAME: functionName,
        AWS_ACCESS_KEY: `${functionName}-access-key-mock`,
        AWS_ACCESS_KEY_ID: `${functionName}-access-key-id-mock`,
        AWS_SECRET_ACCESS_KEY: `${functionName}-secret-access-key-mock`,
        AWS_SESSION_TOKEN: `${functionName}-session-token-mock`,
        LAMBDA_TASK_ROOT: path.resolve(filePath),
        LAMBDA_RUNTIME_DIR: path.resolve(path.join(filePath, "node_modules")),
    };
};
