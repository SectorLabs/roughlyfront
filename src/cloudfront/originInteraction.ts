import type {
    CloudFrontRequest,
    CloudFrontCustomOrigin,
    CloudFrontResultResponse,
} from "aws-lambda";
import fetch from "node-fetch-commonjs";
import type { Response } from "node-fetch-commonjs";

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

const constructResponseBody = async (response: Response): Promise<string> => {
    const buffer = Buffer.from(await response.arrayBuffer());
    return buffer.toString("base64");
};

export const makeOriginRequest = async (
    originRequest: CloudFrontRequest,
): Promise<CloudFrontResultResponse> => {
    if (!originRequest.origin?.custom) {
        throw new Error("Cannot figure out what origin to forward request to");
    }

    const response = await fetch(
        constructRequestURL(originRequest, originRequest.origin.custom),
        {
            method: originRequest.method,
            headers: asFetchHeaders(
                mergeHeaders(
                    parseCloudFrontHeaders(originRequest.headers),
                    parseCloudFrontHeaders(
                        originRequest.origin.custom.customHeaders,
                    ),
                ),
            ),
            body: constructRequestBody(originRequest),
            redirect: "manual",
        },
    );

    return {
        status: response.status.toString(),
        statusDescription: response.statusText,
        headers: asCloudFrontHeaders(response.headers),
        body: await constructResponseBody(response),
        bodyEncoding: "base64",
    };
};
