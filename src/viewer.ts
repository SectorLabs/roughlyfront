import type * as http from "http";

import { parseIncomingMessageHeaders } from "./headers";

export interface Viewer {
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
}

export const constructViewer = (
    incomingMessage: http.IncomingMessage,
): Viewer => {
    const headers = parseIncomingMessageHeaders(incomingMessage);

    return {
        ip: incomingMessage.socket.remoteAddress || "127.0.0.1",
        forwardedIPs: (headers.get("x-forwarded-for") || "")
            .split(",")
            .filter((ip: string) => !!ip.trim()),
        asn: 8708,
        country: "RO",
        city: "Cluj-Napoca",
        countryName: "Romania",
        countryRegion: "CJ",
        countryRegionName: "Cuj",
        latitude: 46.7834818,
        longitude: 23.5464732,
        postalCode: "4000",
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
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
    };
};
