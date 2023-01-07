import * as path from "path";

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
): Record<string, string> => ({
    _HANDLER: handlerName,
    AWS_REGION: "us-east-1",
    AWS_EXECUTION_ENV: "nodejs16.x",
    AWS_LAMBDA_FUNCTION_NAME: "roughlyfront",
    AWS_LAMBDA_FUNCTION_MEMORY_SIZE: "128",
    AWS_LAMBDA_FUNCTION_VERSION: "1",
    AWS_LAMBDA_INITIALIZATION_TYPE: "on-demand",
    AWS_LAMBDA_LOG_GROUP_NAME: "roughlyfront",
    AWS_LAMBDA_LOG_STREAM_NAME: "roughlyfront",
    AWS_ACCESS_KEY: "roughlyfront-access-key-mock",
    AWS_ACCESS_KEY_ID: "roughlyfront-access-key-id-mock",
    AWS_SECRET_ACCESS_KEY: "roughlyfront-secret-access-key-mock",
    AWS_SESSION_TOKEN: "roughlyfront-session-token-mock",
    LAMBDA_TASK_ROOT: path.resolve(filePath),
    LAMBDA_RUNTIME_DIR: path.resolve(path.join(filePath, "node_modules")),
});
