import { Headers } from "node-fetch-commonjs";

export interface Request {
    id: string;
    method: string;
    protocolVersion: string;
    url: URL;
    headers: Headers;
    clientIP: string;
    clientPort: number;
    trueClientIP: string;
    forwardedIPs: string[];
    body: Buffer | null;
}

const cloneBuffer = (buffer: Buffer | null): Buffer | null => {
    if (!buffer || !buffer.length) {
        return null;
    }

    const clonedBuffer = new Buffer(buffer.length);
    buffer.copy(clonedBuffer);

    return clonedBuffer;
};

export const cloneRequest = (request: Request): Request => ({
    ...request,
    url: new URL(request.url.href),
    headers: new Headers(Array.from(request.headers.entries())),
    body: cloneBuffer(request.body),
});
