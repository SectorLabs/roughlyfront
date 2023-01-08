import type { Headers } from "node-fetch-commonjs";

export interface Response {
    status: number;
    headers: Headers;
    body: Buffer | null;
}
