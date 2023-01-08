import type {
    Context,
    CloudFrontRequest,
    CloudFrontRequestEvent,
    CloudFrontResultResponse,
} from "aws-lambda";
import { Headers } from "node-fetch-commonjs";

import type { Request } from "./request";
import type { Response } from "./response";
import type { ClientRequest } from "./client";
import {
    AWS_REGION,
    AWS_ACCOUNT_ID,
    AWS_LAMBDA_FUNCTION_NAME,
    AWS_LAMBDA_FUNCTION_VERSION,
    AWS_LAMBDA_FUNCTION_MEMORY_SIZE,
} from "./constants";

export enum CloudFrontLambdaResultType {
    REQUEST = "request",
    RESPONSE = "response",
}

export type CloudFrontEventType =
    | "origin-request"
    | "origin-response"
    | "viewer-request"
    | "viewer-response";

export const constructCloudFrontRequest = (
    clientRequest: ClientRequest,
): CloudFrontRequest => {
    const originHeaders = new Headers(
        Array.from(clientRequest.headers.entries()),
    );
    originHeaders.set("X-Amz-Cf-Id", clientRequest.id);
    originHeaders.set(
        "CloudFront-Viewer-Address",
        `${clientRequest.trueClientIP}:${clientRequest.clientPort}`,
    );
    originHeaders.set("CloudFront-Viewer-ASN", "8708");
    originHeaders.set("CloudFront-Viewer-Country", "RO");
    originHeaders.set("CloudFront-Viewer-City", "Cluj-Napoca");
    originHeaders.set("CloudFront-Viewer-Country-Name", "Romania");
    originHeaders.set("CloudFront-Viewer-Country-Region", "CJ");
    originHeaders.set("CloudFront-Viewer-Country-Region-Name", "Cluj");
    originHeaders.set("CloudFront-Viewer-Latitude", "46.7834818");
    originHeaders.set("CloudFront-Viewer-Longitude", "23.5464732");
    originHeaders.set("CloudFront-Viewer-Postal-Code", "4000");
    originHeaders.set("CloudFront-Viewer-Time-Zone", "Europe/Bucharest");
    originHeaders.set(
        "CloudFront-Viewer-HTTP-Version",
        clientRequest.protocolVersion,
    );
    originHeaders.set(
        "CloudFront-Forwarded-Proto",
        clientRequest.url.protocol.slice(0, -1),
    );
    originHeaders.set(
        "X-Forwarded-For",
        [...clientRequest.forwardedIPs, clientRequest.clientIP].join(", "),
    );

    const cfRequest: CloudFrontRequest = {
        clientIp: clientRequest.trueClientIP,
        headers: Array.from(originHeaders.entries()).reduce(
            (acc, [name, value]) => ({
                ...acc,
                [name]: [{ key: name, value }],
            }),
            {},
        ),
        method: clientRequest.method,
        querystring: clientRequest.url.searchParams.toString(),
        uri: clientRequest.url.pathname,
        // TODO: allow origin selection based on behaviors the
        // user specified
        origin: {
            custom: {
                customHeaders: {},
                domainName: clientRequest.url.host,
                keepaliveTimeout: 5,
                path: clientRequest.url.pathname,
                port: clientRequest.url.protocol === "https:" ? 443 : 80,
                protocol: clientRequest.url.protocol.slice(0, -1) as
                    | "http"
                    | "https",
                readTimeout: 30,
                sslProtocols: [],
            },
        },
    };

    if (clientRequest.body && clientRequest.body.length) {
        cfRequest.body = {
            inputTruncated: false,
            action: "read-only",
            encoding: "base64",
            data: clientRequest.body.toString("base64"),
        };
    }

    return cfRequest;
};

export const constructCloudFrontRequestEvent = (
    eventType: CloudFrontEventType,
    clientRequest: ClientRequest,
): CloudFrontRequestEvent => ({
    Records: [
        {
            cf: {
                config: {
                    distributionDomainName: clientRequest.url.host,
                    distributionId: "ROUGHLYFRONT1",
                    eventType,
                    requestId: clientRequest.id,
                },
                request: constructCloudFrontRequest(clientRequest),
            },
        },
    ],
});

export const constructCloudFrontRequestContext = (
    clientRequest: ClientRequest,
): Context => {
    return {
        callbackWaitsForEmptyEventLoop: false,
        functionName: AWS_LAMBDA_FUNCTION_NAME.toString(),
        functionVersion: AWS_LAMBDA_FUNCTION_VERSION.toString(),
        invokedFunctionArn: `arn:aws:lambda:${AWS_REGION}:${AWS_ACCOUNT_ID}:aws:function:${AWS_LAMBDA_FUNCTION_NAME}`,
        memoryLimitInMB: AWS_LAMBDA_FUNCTION_MEMORY_SIZE.toString(),
        awsRequestId: clientRequest.id,
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

export const constructRequestFromCloudFront = (
    cfRequest: CloudFrontRequest,
): Request => {
    const headers = new Headers();
    Object.entries(cfRequest.headers || {}).forEach(([name, values]) => {
        values.forEach(({ key, value }) => {
            headers.append(key || name, value);
        });
    });

    if (!cfRequest.origin?.custom) {
        throw new Error("Cannot figure out what origin to forward request to");
    }

    const host = cfRequest.origin.custom.domainName;
    const protocol = cfRequest.origin.custom.protocol;

    let uri = cfRequest.origin.custom.path;
    if (cfRequest.querystring) {
        uri += `?${cfRequest.querystring}`;
    }

    const bodyEncoding =
        cfRequest.body?.encoding === "base64" ? "base64" : undefined;
    const body = cfRequest.body?.data
        ? Buffer.from(cfRequest.body.data, bodyEncoding)
        : null;

    return {
        method: cfRequest.method,
        url: new URL(uri, `${protocol}://${host}`),
        headers,
        body,
    };
};

export const constructResponseFromCloudFront = (
    cfResponse: CloudFrontResultResponse,
): Response => {
    const headers = new Headers();
    Object.entries(cfResponse.headers || {}).forEach(([name, values]) => {
        values.forEach(({ key, value }) => {
            headers.append(key || name, value);
        });
    });

    const bodyEncoding =
        cfResponse.bodyEncoding === "base64" ? "base64" : undefined;
    const body = cfResponse.body
        ? Buffer.from(cfResponse.body, bodyEncoding)
        : null;

    return {
        status: Number(cfResponse.status),
        headers,
        body,
    };
};

export const detectCloudFrontLambdaResult = (
    result: CloudFrontRequest | CloudFrontResultResponse,
): CloudFrontLambdaResultType | null => {
    if ((result as CloudFrontRequest).uri) {
        return CloudFrontLambdaResultType.REQUEST;
    }

    if ((result as CloudFrontResultResponse).status) {
        return CloudFrontLambdaResultType.RESPONSE;
    }

    return null;
};
