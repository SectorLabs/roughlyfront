import * as crypto from "crypto";
import type * as http from "http";
import { Headers } from "node-fetch-commonjs";

import type { Request } from "./request";

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

const parseHeaders = (incomingMessage: http.IncomingMessage): Headers => {
    const headers = new Headers();
    Object.entries(incomingMessage.headers).forEach(([name, value]) => {
        if (typeof value === "string") {
            headers.append(name, value);
        } else if (Array.isArray(value)) {
            value.forEach((oneValue) => {
                headers.append(name, oneValue);
            });
        } else {
            headers.append(name, value || "");
        }
    });

    return headers;
};

export const constructClientRequest = async (
    incomingMessage: http.IncomingMessage,
): Promise<Request> => {
    const headers = parseHeaders(incomingMessage);

    const clientIP = incomingMessage.socket.remoteAddress || "127.0.0.1";
    const clientPort = incomingMessage.socket.remotePort || 80;
    const forwardedIPs = (headers.get("x-forwarded-for") || "")
        .split(",")
        .filter((ip: string) => !!ip.trim());
    const trueClientIP =
        headers.get("x-real-ip") ||
        headers.get("true-client-ip") ||
        forwardedIPs[0] ||
        clientIP;

    const host = headers.get("x-forwarded-host") || headers.get("host");
    const protocol = headers.get("x-forwarded-proto") || "http";
    const url = new URL(incomingMessage.url || "", `${protocol}://${host}`);
    const body = await readBody(incomingMessage);

    return {
        id: crypto.randomUUID().replace(/-/g, ""),
        method: incomingMessage.method || "GET",
        url,
        headers,
        protocolVersion: incomingMessage.httpVersion,
        clientIP,
        clientPort,
        trueClientIP,
        forwardedIPs,
        body,
    };
};
