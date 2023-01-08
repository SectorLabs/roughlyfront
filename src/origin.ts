import { Request, cloneRequest } from "./request";

export const constructOriginRequest = (request: Request): Request => {
    const originRequest = cloneRequest(request);

    originRequest.headers.set("X-Amz-Cf-Id", request.id);
    originRequest.headers.set(
        "CloudFront-Viewer-Address",
        `${request.trueClientIP}:${request.clientPort}`,
    );
    originRequest.headers.set("CloudFront-Viewer-ASN", "8708");
    originRequest.headers.set("CloudFront-Viewer-Country", "RO");
    originRequest.headers.set("CloudFront-Viewer-City", "Cluj-Napoca");
    originRequest.headers.set("CloudFront-Viewer-Country-Name", "Romania");
    originRequest.headers.set("CloudFront-Viewer-Country-Region", "CJ");
    originRequest.headers.set("CloudFront-Viewer-Country-Region-Name", "Cluj");
    originRequest.headers.set("CloudFront-Viewer-Latitude", "46.7834818");
    originRequest.headers.set("CloudFront-Viewer-Longitude", "23.5464732");
    originRequest.headers.set("CloudFront-Viewer-Postal-Code", "4000");
    originRequest.headers.set(
        "CloudFront-Viewer-Time-Zone",
        "Europe/Bucharest",
    );
    originRequest.headers.set(
        "CloudFront-Viewer-HTTP-Version",
        request.protocolVersion,
    );
    originRequest.headers.set(
        "CloudFront-Forwarded-Proto",
        request.url.protocol.slice(0, -1),
    );
    originRequest.headers.set(
        "X-Forwarded-For",
        [...request.forwardedIPs, request.clientIP].join(", "),
    );

    return request;
};
