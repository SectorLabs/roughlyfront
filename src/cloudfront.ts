import type {
    Context,
    CloudFrontRequest,
    CloudFrontRequestEvent,
} from "aws-lambda";
import type { Request } from "./request";
import {
    AWS_REGION,
    AWS_ACCOUNT_ID,
    AWS_LAMBDA_FUNCTION_NAME,
    AWS_LAMBDA_FUNCTION_VERSION,
    AWS_LAMBDA_FUNCTION_MEMORY_SIZE,
} from "./constants";

export type CloudFrontEventType =
    | "origin-request"
    | "origin-response"
    | "viewer-request"
    | "viewer-response";

export const constructCloudFrontRequest = (
    request: Request,
): CloudFrontRequest => {
    const cfRequest: CloudFrontRequest = {
        clientIp: request.trueClientIP,
        headers: Array.from(request.headers.entries()).reduce(
            (acc, [name, value]) => ({
                ...acc,
                [name]: [{ key: name, value }],
            }),
            {},
        ),
        method: request.method,
        querystring: request.url.searchParams.toString(),
        uri: request.url.pathname,
        origin: {
            custom: {
                customHeaders: {},
                domainName: request.url.host,
                keepaliveTimeout: 5,
                path: request.url.pathname,
                port: 80,
                protocol: request.url.protocol.slice(0, -1) as "http" | "https",
                readTimeout: 30,
                sslProtocols: [],
            },
        },
    };

    if (request.body && request.body.length) {
        cfRequest.body = {
            inputTruncated: false,
            action: "read-only",
            encoding: "base64",
            data: request.body.toString("base64"),
        };
    }

    return cfRequest;
};

export const constructCloudFrontRequestEvent = (
    eventType: CloudFrontEventType,
    request: Request,
): CloudFrontRequestEvent => ({
    Records: [
        {
            cf: {
                config: {
                    distributionDomainName: request.url.host,
                    distributionId: "ROUGHLYFRONT1",
                    eventType,
                    requestId: request.id,
                },
                request: constructCloudFrontRequest(request),
            },
        },
    ],
});

export const constructCloudFrontRequestContext = (
    request: Request,
): Context => {
    return {
        callbackWaitsForEmptyEventLoop: false,
        functionName: AWS_LAMBDA_FUNCTION_NAME.toString(),
        functionVersion: AWS_LAMBDA_FUNCTION_VERSION.toString(),
        invokedFunctionArn: `arn:aws:lambda:${AWS_REGION}:${AWS_ACCOUNT_ID}:aws:function:${AWS_LAMBDA_FUNCTION_NAME}`,
        memoryLimitInMB: AWS_LAMBDA_FUNCTION_MEMORY_SIZE.toString(),
        awsRequestId: request.id,
        logGroupName: AWS_LAMBDA_FUNCTION_VERSION.toString(),
        logStreamName: AWS_LAMBDA_FUNCTION_VERSION.toString(),

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
    };
};
