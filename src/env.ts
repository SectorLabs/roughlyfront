import * as path from "path";

import {
    AWS_REGION,
    AWS_LAMBDA_FUNCTION_NAME,
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
    handlerName: string,
): Record<string, string> => {
    const nodeMajorVersion = process.version.slice(1).split(".")[0];

    return {
        _HANDLER: handlerName,
        AWS_REGION,
        AWS_EXECUTION_ENV: `nodejs${nodeMajorVersion}.x`,
        AWS_LAMBDA_FUNCTION_NAME,
        AWS_LAMBDA_FUNCTION_MEMORY_SIZE:
            AWS_LAMBDA_FUNCTION_MEMORY_SIZE.toString(),
        AWS_LAMBDA_FUNCTION_VERSION: AWS_LAMBDA_FUNCTION_VERSION.toString(),
        AWS_LAMBDA_INITIALIZATION_TYPE: "on-demand",
        AWS_LAMBDA_LOG_GROUP_NAME: AWS_LAMBDA_FUNCTION_NAME,
        AWS_LAMBDA_LOG_STREAM_NAME: AWS_LAMBDA_FUNCTION_NAME,
        AWS_ACCESS_KEY: `${AWS_LAMBDA_FUNCTION_NAME}-access-key-mock`,
        AWS_ACCESS_KEY_ID: `${AWS_LAMBDA_FUNCTION_NAME}-access-key-id-mock`,
        AWS_SECRET_ACCESS_KEY: `${AWS_LAMBDA_FUNCTION_NAME}-secret-access-key-mock`,
        AWS_SESSION_TOKEN: `${AWS_LAMBDA_FUNCTION_NAME}-session-token-mock`,
        LAMBDA_TASK_ROOT: path.resolve(filePath),
        LAMBDA_RUNTIME_DIR: path.resolve(path.join(filePath, "node_modules")),
    };
};
