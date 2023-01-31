import * as crypto from "crypto";
import consola from "consola";
import type * as http from "http";
import type { CloudFrontRequest } from "aws-lambda";

import type { Lambda } from "./lambda";
import type { CloudFrontEventType } from "./types";
import type {
    Config,
    DistributionConfig,
    BehaviorConfig,
    OriginConfig,
} from "./config";
import { Viewer, constructViewer } from "./viewer";
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
import { RequestEventResult } from "./requestEventResult";
import { generateErrorResponse } from "./error";

export class RequestHandler {
    private id: string;

    private host: string;

    private distribution: DistributionConfig;

    private behavior: BehaviorConfig;

    private origin: OriginConfig;

    private viewer: Viewer;

    constructor(
        config: Config,
        private lambdas: Lambda[],
        private incomingMessage: http.IncomingMessage,
        private outgoingMessage: http.ServerResponse,
    ) {
        (this.id = crypto.randomUUID().replace(/-/g, "")),
            (this.host = incomingMessage.headers["host"]!);
        if (!this.host) {
            throw new Error(
                "Request does not have a 'Host' header, without it we cannot select the distribution",
            );
        }

        const path = incomingMessage.url?.split("?")[0] || "/";

        this.distribution = selectDistributionByHost(
            config.distributions,
            this.host,
        );
        this.behavior = selectBehaviorByPath(this.distribution, path);
        this.origin = selectOriginByName(
            this.distribution,
            this.behavior.origin,
        );
        this.viewer = constructViewer(incomingMessage);
    }

    public async handle(): Promise<void> {
        const viewerRequest = await constructViewerRequest(
            this.incomingMessage,
            this.viewer,
        );

        const viewerResult = await this.handleRequestEvent(
            "viewer-request",
            viewerRequest,
        );
        if (viewerResult.isResponse()) {
            writeOriginResponse(
                viewerResult.asResponse(),
                this.outgoingMessage,
                {
                    id: this.id,
                    host: this.host,
                    generated: true,
                },
            );
            return;
        }

        const originRequest = constructOriginRequest(
            this.id,
            viewerResult.asRequest(),
            this.viewer,
            this.origin,
        );

        const originResult = await this.handleRequestEvent(
            "origin-request",
            originRequest,
        );
        if (originResult.isResponse()) {
            writeOriginResponse(
                viewerResult.asResponse(),
                this.outgoingMessage,
                {
                    id: this.id,
                    host: this.host,
                    generated: true,
                },
            );
            return;
        }

        const originResponse = await makeOriginRequest(
            originResult.asRequest(),
        );

        writeOriginResponse(originResponse, this.outgoingMessage, {
            id: this.id,
            host: this.host,
            generated: false,
        });
    }

    private async handleRequestEvent(
        eventType: CloudFrontEventType,
        request: CloudFrontRequest,
    ): Promise<RequestEventResult> {
        const lambda = this.selectLambdaForEvent(eventType);
        if (!lambda) {
            return new RequestEventResult(request);
        }

        return this.invokeLambdaForRequestEvent(eventType, request, lambda);
    }

    private async invokeLambdaForRequestEvent(
        eventType: CloudFrontEventType,
        request: CloudFrontRequest,
        lambda: Lambda,
    ): Promise<RequestEventResult> {
        const requestEvent = constructRequestEvent(
            this.id,
            eventType,
            this.distribution,
            request,
        );

        const eventContext = constructEventContext(lambda.name, this.id);

        try {
            return await lambda.invokeForRequestEvent(
                requestEvent,
                eventContext,
            );
        } catch (error) {
            consola.error(error);
            return new RequestEventResult(generateErrorResponse(error));
        }
    }

    private selectLambdaForEvent(
        eventType: CloudFrontEventType,
    ): Lambda | null {
        const lambdaName = this.behavior.lambdas?.[eventType];
        if (!lambdaName) {
            return null;
        }

        const lambda = this.lambdas.find(
            (lambda) => lambda.name === lambdaName,
        );
        if (!lambda) {
            throw new Error(
                `Lambda '${lambdaName}' was not initialized or declared`,
            );
        }

        return lambda;
    }
}
