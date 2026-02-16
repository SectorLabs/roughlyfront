import type * as http from "http";

import { parseIncomingMessageHeaders } from "./headers";

export interface CloudFrontViewer {
    ip: string;
    forwardedIPs: string[];
    asn: number;
    country: string;
    city: string;
    countryName: string;
    countryRegion: string;
    countryRegionName: string;
    latitude: number;
    longitude: number;
    postalCode: string;
    timeZone: string;
    httpVersion: string;
    httpHost: string;
    httpProtocol: string;
    ja3Fingerprint: string;
    ja4Fingerprint: string;
}

export const constructViewer = (
    incomingMessage: http.IncomingMessage,
): CloudFrontViewer => {
    const headers = parseIncomingMessageHeaders(incomingMessage);

    const ip =
        headers.get("x-mock-ip") ||
        incomingMessage.socket.remoteAddress ||
        "127.0.0.1";

    return {
        ip,
        forwardedIPs: (headers.get("x-forwarded-for") || "")
            .split(",")
            .filter((ip: string) => !!ip.trim()),
        asn: Number(headers.get("x-mock-asn") || 8708),
        country: headers.get("x-mock-country") || "RO",
        city: headers.get("x-mock-city") || "Cluj-Napoca",
        countryName: headers.get("x-mock-country-name") || "Romania",
        countryRegion: headers.get("x-mock-country-region") || "CJ",
        countryRegionName: headers.get("x-mock-country-region-name") || "Cuj",
        latitude: Number(headers.get("x-mock-latitude") || 46.7834818),
        longitude: Number(headers.get("x-mock-longitude") || 23.5464732),
        postalCode: headers.get("x-mock-postal-code") || "4000",
        timeZone:
            headers.get("x-mock-time-zone") ||
            Intl.DateTimeFormat().resolvedOptions().timeZone,
        httpVersion: incomingMessage.httpVersion,
        httpHost:
            headers.get("x-forwarded-host") ||
            headers.get("host") ||
            incomingMessage.socket.localAddress ||
            "127.0.0.1",
        httpProtocol:
            headers.get("x-forwarded-proto") ||
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            incomingMessage.connection.encrypted
                ? "https"
                : "http",
        ja3Fingerprint:
            headers.get("x-mock-ja3-fingerprint") ||
            "09db96991d70d43cc265f330a449fc1d",
        ja4Fingerprint:
            headers.get("x-mock-ja4-fingerprint") ||
            "t13d1514h2_8daaf6152771_9a55b862dad6",
    };
};
