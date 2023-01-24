import type { CloudFrontRequest, CloudFrontHeaders } from "aws-lambda";

import type { OriginConfig } from "./config";
import {
    parseCloudFrontHeaders,
    parseFetchHeaders,
    asCloudFrontHeaders,
} from "./headers";

const constructHeaders = (
    id: string,
    request: CloudFrontRequest,
): CloudFrontHeaders => {
    const headers = parseCloudFrontHeaders(request.headers);

    const forwardedIPs = (headers.get("x-forwarded-for") || "")
        .split(",")
        .filter((ip: string) => !!ip.trim());

    headers.set("x-amz-cf-id", id);
    headers.set("CloudFront-Viewer-Address", request.clientIp);
    headers.set("CloudFront-Viewer-ASN", "8708");
    headers.set("CloudFront-Viewer-Country", "RO");
    headers.set("CloudFront-Viewer-City", "Cluj-Napoca");
    headers.set("CloudFront-Viewer-Country-Name", "Romania");
    headers.set("CloudFront-Viewer-Country-Region", "CJ");
    headers.set("CloudFront-Viewer-Country-Region-Name", "Cluj");
    headers.set("CloudFront-Viewer-Latitude", "46.7834818");
    headers.set("CloudFront-Viewer-Longitude", "23.5464732");
    headers.set("CloudFront-Viewer-Postal-Code", "4000");
    headers.set("CloudFront-Viewer-Time-Zone", "Europe/Bucharest");
    headers.set("CloudFront-Viewer-HTTP-Version", "1.1");
    headers.set("CloudFront-Forwarded-Proto", "http");
    headers.set(
        "X-Forwarded-For",
        [...forwardedIPs, request.clientIp].join(", "),
    );

    return asCloudFrontHeaders(headers);
};

export const constructOriginRequest = (
    id: string,
    request: CloudFrontRequest,
    origin: OriginConfig,
): CloudFrontRequest => {
    return {
        clientIp: request.clientIp,
        headers: constructHeaders(id, request),
        method: request.method,
        querystring: request.querystring,
        uri: request.uri,
        body: request.body,
        origin: {
            custom: request.origin?.custom || {
                customHeaders: origin.headers
                    ? asCloudFrontHeaders(parseFetchHeaders(origin.headers))
                    : {},
                domainName: origin.domain,
                keepaliveTimeout: 5,
                path: origin.path,
                port: origin.port,
                protocol: origin.protocol as "http" | "https",
                readTimeout: 30,
                sslProtocols: [],
            },
        },
    };
};
