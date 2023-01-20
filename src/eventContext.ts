import type { Context } from "aws-lambda";

import {
    AWS_REGION,
    AWS_ACCOUNT_ID,
    AWS_LAMBDA_FUNCTION_VERSION,
    AWS_LAMBDA_FUNCTION_MEMORY_SIZE,
} from "./constants";

export const constructEventContext = (
    functionName: string,
    requestID: string,
): Context => ({
    callbackWaitsForEmptyEventLoop: false,
    functionName: functionName,
    functionVersion: AWS_LAMBDA_FUNCTION_VERSION.toString(),
    invokedFunctionArn: `arn:aws:lambda:${AWS_REGION}:${AWS_ACCOUNT_ID}:aws:function:${functionName}`,
    memoryLimitInMB: AWS_LAMBDA_FUNCTION_MEMORY_SIZE.toString(),
    awsRequestId: requestID,
    logGroupName: functionName,
    logStreamName: functionName,

    // TODO: maybe record the start time and simulate this?
    getRemainingTimeInMillis: () => 5000,

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
});
