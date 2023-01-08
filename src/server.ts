import type * as http from "http";

import type { Response } from "./response";

export const writeServerResponse = (
    response: Response,
    outgoingMessage: http.ServerResponse,
): void => {
    Object.entries(response.headers).forEach(([name, value]) => {
        outgoingMessage.setHeader(name, value);
    });

    // TODO: this seems to always use Transfer-Encoding: chunked
    // even when the body is really small.. Maybe we should force
    // it to write the body in one go and send a Content-Length header?
    if (response.body) {
        outgoingMessage.write(response.body);
    }

    outgoingMessage.statusCode = response.status;
    outgoingMessage.end();
};
