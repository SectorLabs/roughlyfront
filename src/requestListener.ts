import type * as http from "http";

import { Lambda } from "./lambda";
import type { Config } from "./config";
import { RequestHandler } from "./requestHandler";
import type { CloudWatch } from "./cloudWatch";

export const createRequestListener = (
    config: Config,
    cloudWatch: CloudWatch,
) => {
    const lambdas = config.lambdas.map((lambdaConfig) =>
        Lambda.initialize(lambdaConfig, config.directory, cloudWatch),
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
