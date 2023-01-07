import type * as http from "http";

import type { FunctionHandler } from "./functionHandler";

export const createRequestListener =
    (
        _handler: FunctionHandler, // eslint-disable-line @typescript-eslint/no-unused-vars
    ) =>
    async (
        _request: http.IncomingMessage,
        response: http.ServerResponse,
    ): Promise<void> => {
        response.writeHead(200);
        response.end("hello world");
    };
