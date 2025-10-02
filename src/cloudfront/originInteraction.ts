import type {
    CloudFrontRequest,
    CloudFrontCustomOrigin,
    CloudFrontResultResponse,
} from "aws-lambda";
import http from "node:http";
import https from "node:https";
import { Headers } from "headers-polyfill";

import {
    parseCloudFrontHeaders,
    asCloudFrontHeaders,
    asFetchHeaders,
    mergeHeaders,
} from "./headers";

const constructRequestURL = (
    originRequest: CloudFrontRequest,
    origin: CloudFrontCustomOrigin,
): string => {
    const host = `${origin.domainName}:${origin.port}`;
    const protocol = origin.protocol;

    let uri = (origin.path || "") + originRequest.uri;
    if (originRequest.querystring) {
        uri += `?${originRequest.querystring}`;
    }

    return new URL(uri, `${protocol}://${host}`).href;
};

const constructRequestBody = (
    originRequest: CloudFrontRequest,
): Buffer | null => {
    const bodyEncoding =
        originRequest.body?.encoding === "base64" ? "base64" : undefined;

    return originRequest.body?.data
        ? Buffer.from(originRequest.body.data, bodyEncoding)
        : null;
};

export const makeOriginRequest = async (
    originRequest: CloudFrontRequest,
): Promise<CloudFrontResultResponse> => {
    if (!originRequest.origin?.custom) {
        throw new Error("Cannot figure out what origin to forward request to");
    }

    const headers = mergeHeaders(
        parseCloudFrontHeaders(originRequest.headers),
        parseCloudFrontHeaders(originRequest.origin.custom.customHeaders),
    );

    const requestURL = constructRequestURL(
        originRequest,
        originRequest.origin.custom,
    );

    // Do not switch this to `fetch(..)`. It doesn't allow for overriding
    // the `Host` header.
    return new Promise((resolve, reject) => {
        const client = requestURL.startsWith("https") ? https : http;

        const request = client.request(
            requestURL,
            {
                method: originRequest.method,
                headers: asFetchHeaders(headers),
            },
            (response) => {
                const chunks: Buffer[] = [];
                response.on("data", (chunk) => {
                    chunks.push(chunk);
                });

                response.on("error", reject);

                response.on("end", () => {
                    resolve({
                        status: response.statusCode!.toString(),
                        statusDescription: response.statusMessage,
                        headers: asCloudFrontHeaders(
                            new Headers(response.headers),
                        ),
                        body: Buffer.concat(chunks).toString("base64"),
                        bodyEncoding: "base64",
                    });
                });
            },
        );

        const requestBody = constructRequestBody(originRequest);
        if (requestBody) {
            request.write(requestBody);
        }

        request.end();
    });
};
