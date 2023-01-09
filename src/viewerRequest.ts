import type * as http from "http";
import type { CloudFrontRequest } from "aws-lambda";
import type { Headers } from "node-fetch-commonjs";

import { parseIncomingMessageHeaders, asCloudFrontHeaders } from "./headers";

const constructURL = (
    incomingMessage: http.IncomingMessage,
    headers: Headers,
): URL => {
    const host = headers.get("x-forwarded-host") || headers.get("host");
    const protocol = headers.get("x-forwarded-proto") || "http";
    return new URL(incomingMessage.url || "", `${protocol}://${host}`);
};

const readBody = async (
    incomingMessage: http.IncomingMessage,
): Promise<Buffer | null> => {
    const buffers = [];
    for await (const chunk of incomingMessage) {
        buffers.push(chunk);
    }

    if (!buffers.length) {
        return null;
    }

    const buffer = Buffer.concat(buffers);
    if (!buffer.length) {
        return null;
    }

    return buffer;
};

export const constructViewerRequest = async (
    incomingMessage: http.IncomingMessage,
): Promise<CloudFrontRequest> => {
    const headers = parseIncomingMessageHeaders(incomingMessage);
    const url = constructURL(incomingMessage, headers);

    const viewerRequest: CloudFrontRequest = {
        clientIp: incomingMessage.socket.remoteAddress || "127.0.0.1",
        headers: asCloudFrontHeaders(headers),
        method: incomingMessage.method || "GET",
        querystring: url.searchParams.toString(),
        uri: url.pathname,
    };

    const body = await readBody(incomingMessage);
    if (body) {
        viewerRequest.body = {
            inputTruncated: false,
            action: "read-only",
            encoding: "base64",
            data: body.toString("base64"),
        };
    }

    return viewerRequest;
};
