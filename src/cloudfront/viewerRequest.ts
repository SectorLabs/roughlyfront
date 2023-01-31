import type * as http from "http";
import type { CloudFrontRequest } from "aws-lambda";

import type { CloudFrontViewer } from "./viewer";
import { parseIncomingMessageHeaders, asCloudFrontHeaders } from "./headers";

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
    viewer: CloudFrontViewer,
): Promise<CloudFrontRequest> => {
    const url = new URL(
        incomingMessage.url || "",
        `${viewer.httpProtocol}://${viewer.httpHost}`,
    );
    const headers = parseIncomingMessageHeaders(incomingMessage);

    const viewerRequest: CloudFrontRequest = {
        clientIp: viewer.ip,
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
