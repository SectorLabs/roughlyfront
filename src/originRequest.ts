import type { CloudFrontRequest, CloudFrontHeaders } from "aws-lambda";

import type { OriginConfig } from "./config";
import type { Viewer } from "./viewer";
import {
    parseCloudFrontHeaders,
    parseFetchHeaders,
    asCloudFrontHeaders,
} from "./headers";

const constructHeaders = (
    id: string,
    request: CloudFrontRequest,
    viewer: Viewer,
): CloudFrontHeaders => {
    const headers = parseCloudFrontHeaders(request.headers);

    headers.set("x-amz-cf-id", id);
    headers.set("CloudFront-Viewer-Address", viewer.ip);
    headers.set("CloudFront-Viewer-ASN", viewer.asn.toString());
    headers.set("CloudFront-Viewer-Country", viewer.country);
    headers.set("CloudFront-Viewer-City", viewer.city);
    headers.set("CloudFront-Viewer-Country-Name", viewer.countryName);
    headers.set("CloudFront-Viewer-Country-Region", viewer.countryRegion);
    headers.set(
        "CloudFront-Viewer-Country-Region-Name",
        viewer.countryRegionName,
    );
    headers.set("CloudFront-Viewer-Latitude", viewer.latitude.toString());
    headers.set("CloudFront-Viewer-Longitude", viewer.longitude.toString());
    headers.set("CloudFront-Viewer-Postal-Code", viewer.postalCode);
    headers.set("CloudFront-Viewer-Time-Zone", viewer.timeZone);
    headers.set("CloudFront-Viewer-HTTP-Version", viewer.httpVersion);
    headers.set("CloudFront-Forwarded-Proto", viewer.httpProtocol);
    headers.set(
        "X-Forwarded-For",
        [...viewer.forwardedIPs, viewer.ip].join(", "),
    );

    return asCloudFrontHeaders(headers);
};

export const constructOriginRequest = (
    id: string,
    request: CloudFrontRequest,
    viewer: Viewer,
    origin: OriginConfig,
): CloudFrontRequest => {
    return {
        clientIp: request.clientIp,
        headers: constructHeaders(id, request, viewer),
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
