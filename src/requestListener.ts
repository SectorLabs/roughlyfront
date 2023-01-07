import type * as http from "http";

import type { LambdaEdgeFunction } from "./function";

export const createRequestListener =
    (
        _func: LambdaEdgeFunction, // eslint-disable-line @typescript-eslint/no-unused-vars
    ) =>
    async (
        _request: http.IncomingMessage,
        response: http.ServerResponse,
    ): Promise<void> => {
        response.writeHead(200);
        response.end("hello world");
    };
