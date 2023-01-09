import * as crypto from "crypto";
import type * as http from "http";
import type { CloudFrontRequest, CloudFrontResultResponse } from "aws-lambda";
import consola from "consola";

import { Lambda } from "./lambda";
import type { CloudFrontEventType } from "./types";
import type {
    Config,
    DistributionConfig,
    BehaviorConfig,
    OriginConfig,
} from "./config";
import { writeOriginResponse } from "./originResponse";
import { makeOriginRequest } from "./originInteraction";
import {
    selectDistributionByHost,
    selectBehaviorByPath,
    selectOriginByName,
} from "./distributions";
import { constructEventContext } from "./eventContext";
import { constructViewerRequest } from "./viewerRequest";
import { constructOriginRequest } from "./originRequest";
import { constructRequestEvent } from "./requestEvent";
import { LambdaResult } from "./lambdaResult";
import { generateErrorResponse } from "./error";

interface RequestListenerContext {
    id: string;
    lambdas: Lambda[];
    distribution: DistributionConfig;
    behavior: BehaviorConfig;
    origin: OriginConfig;
}

const logRequest = (
    incomingMessage: http.IncomingMessage,
    response: CloudFrontResultResponse,
    tag: string,
) => {
    const message = `${incomingMessage.method} ${incomingMessage.url} ${response.status} [${tag}]`;
    consola.info(message);
};

const handleRequestEvent = async (
    context: RequestListenerContext,
    eventType: CloudFrontEventType,
    request: CloudFrontRequest,
): Promise<LambdaResult> => {
    const lambdaName = context.behavior.lambdas?.[eventType];
    if (lambdaName) {
        const lambda = context.lambdas.find(
            (lambda) => lambda.name === lambdaName,
        );
        if (!lambda) {
            throw new Error(`Lambda '${lambdaName}' was not initialized`);
        }

        const requestEvent = constructRequestEvent(
            context.id,
            eventType,
            context.distribution,
            request,
        );
        const eventContext = constructEventContext(context.id);

        try {
            return await lambda.invoke(requestEvent, eventContext);
        } catch (error) {
            consola.error(error);
            return new LambdaResult(generateErrorResponse(error));
        }
    }

    return new LambdaResult(request);
};

export const createRequestListener = (config: Config) => {
    const lambdas = config.lambdas.map((lambdaConfig) =>
        Lambda.initialize(lambdaConfig, config.directory),
    );

    return async (
        incomingMessage: http.IncomingMessage,
        outgoingMessage: http.ServerResponse,
    ): Promise<void> => {
        const host = incomingMessage.headers["host"];
        if (!host) {
            throw new Error(
                "Request does not have a 'Host' header, without it we cannot select the distribution",
            );
        }

        const path = incomingMessage.url?.split("?")[0] || "/";

        const distribution = selectDistributionByHost(
            config.distributions,
            host,
        );

        const behavior = selectBehaviorByPath(distribution, path);

        const context: RequestListenerContext = {
            id: crypto.randomUUID().replace(/-/g, ""),
            lambdas,
            distribution,
            behavior,
            origin: selectOriginByName(distribution, behavior.origin),
        };

        const viewerRequest = await constructViewerRequest(incomingMessage);

        const viewerResult = await handleRequestEvent(
            context,
            "viewer-request",
            viewerRequest,
        );
        if (viewerResult.isResponse()) {
            const generatedResponse = viewerResult.asResponse();
            logRequest(incomingMessage, generatedResponse, "generated");

            writeOriginResponse(generatedResponse, outgoingMessage, {
                id: context.id,
                host,
                generated: true,
            });
            return;
        }

        const originResult = await handleRequestEvent(
            context,
            "origin-request",
            constructOriginRequest(
                context.id,
                viewerResult.asRequest(),
                context.origin,
            ),
        );
        if (originResult.isResponse()) {
            const generatedResponse = originResult.asResponse();
            logRequest(incomingMessage, generatedResponse, "generated");

            writeOriginResponse(generatedResponse, outgoingMessage, {
                id: context.id,
                host,
                generated: true,
            });
            return;
        }

        const originResponse = await makeOriginRequest(
            originResult.asRequest(),
        );

        logRequest(incomingMessage, originResponse, "origin");

        writeOriginResponse(originResponse, outgoingMessage, {
            id: context.id,
            host,
            generated: false,
        });
    };
};
