import type {
    CloudFrontRequest,
    CloudFrontCustomOrigin,
    CloudFrontResultResponse,
} from "aws-lambda";
import zlib from "node:zlib";
import http from "node:http";
import https from "node:https";
import type { Stream } from "node:stream";
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

const createResponseStream = (response: http.IncomingMessage): Stream => {
    const encoding = response.headers["content-encoding"];
    if (!encoding) {
        return response;
    }

    switch (encoding) {
        case "gzip":
            return response.pipe(zlib.createGunzip());

        case "deflate":
            return response.pipe(zlib.createInflateRaw());

        case "br":
            return response.pipe(zlib.createBrotliDecompress());
    }

    throw new Error(
        `Origin returned a content-encoding we do not handle: ${encoding}`,
    );
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

    // Ensure the origin doesn't return an encoding
    // we cannot handle.
    headers.set("Accept-Encoding", "gzip, deflate, br");

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
                const stream = createResponseStream(response);

                const chunks: Buffer[] = [];
                stream.on("data", (chunk) => {
                    chunks.push(chunk);
                });

                stream.on("error", (e) => {
                    reject(new Error("Origin response error", { cause: e }));
                });

                stream.on("end", () => {
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

        request.on("error", (e) => {
            reject(new Error("Origin response error", { cause: e }));
        });

        const requestBody = constructRequestBody(originRequest);
        if (requestBody) {
            request.write(requestBody);
        }

        request.end();
    });
};
