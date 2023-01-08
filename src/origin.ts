import type { Request } from "./request";
import type { Response } from "./response";

import fetch, { Headers } from "node-fetch-commonjs";

export const forwardToOrigin = async (request: Request): Promise<Response> => {
    const response = await fetch(request.url.href, {
        method: request.method,
        headers: {
            ...Array.from(request.headers.entries()).reduce(
                (acc, [name, value]) => ({
                    ...acc,
                    [name]: value,
                }),
                {},
            ),
            // This allows clients to determine whether the request
            // already passed through Roughlyflare or not.
            //
            // Miniflare for Cloudflare does something similiar
            // and sets the `MF-Loop` header.
            "RF-Loop": "1",
        },
        body: request.body,
    });

    const responseBody = await response.arrayBuffer();

    return {
        status: response.status,
        headers: new Headers(Object.entries(response.headers)),
        body: Buffer.from(responseBody),
    };
};
