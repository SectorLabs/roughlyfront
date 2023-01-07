import type * as http from "http";

import type { HandlerFunction } from "./types.js";

export const createRequestListener =
    (
        _handler: HandlerFunction, // eslint-disable-line @typescript-eslint/no-unused-vars
    ) =>
    async (
        _request: http.IncomingMessage,
        response: http.ServerResponse,
    ): Promise<void> => {
        response.writeHead(200);
        response.end("hello world");
    };
