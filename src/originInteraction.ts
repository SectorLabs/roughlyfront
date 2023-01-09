import type { CloudFrontRequest, CloudFrontResultResponse } from "aws-lambda";
import fetch from "node-fetch-commonjs";
import type { Response } from "node-fetch-commonjs";

import {
    parseCloudFrontHeaders,
    asCloudFrontHeaders,
    asFetchHeaders,
} from "./headers";

const constructRequestURL = (originRequest: CloudFrontRequest): string => {
    if (!originRequest.origin?.custom) {
        throw new Error("Cannot figure out what origin to forward request to");
    }

    const host = `${originRequest.origin.custom.domainName}:${originRequest.origin.custom.port}`;
    const protocol = originRequest.origin.custom.protocol;

    let uri = (originRequest.origin.custom.path || "") + originRequest.uri;
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
    const response = await fetch(constructRequestURL(originRequest), {
        method: originRequest.method,
        headers: asFetchHeaders(parseCloudFrontHeaders(originRequest.headers)),
        body: constructRequestBody(originRequest),
    });

    return {
        status: response.status.toString(),
        statusDescription: response.statusText,
        headers: asCloudFrontHeaders(response.headers),
        body: await constructResponseBody(response),
        bodyEncoding: "base64",
    };
};
