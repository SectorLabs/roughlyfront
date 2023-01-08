import type { Headers } from "node-fetch-commonjs";

export interface Request {
    method: string;
    url: URL;
    headers: Headers;
    body: Buffer | null;
}
