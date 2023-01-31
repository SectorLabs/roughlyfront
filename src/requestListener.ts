import type * as http from "http";

import { Lambda } from "./lambda";
import type { Config } from "./config";
import { RequestHandler } from "./requestHandler";

export const createRequestListener = (config: Config) => {
    const lambdas = config.lambdas.map((lambdaConfig) =>
        Lambda.initialize(lambdaConfig, config.directory),
    );

    return async (
        incomingMessage: http.IncomingMessage,
        outgoingMessage: http.ServerResponse,
    ): Promise<void> => {
        const requestHandler = new RequestHandler(
            config,
            lambdas,
            incomingMessage,
            outgoingMessage,
        );

        await requestHandler.handle();
    };
};
