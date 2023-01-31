import * as crypto from "crypto";
import type * as http from "http";
import type { CloudFrontRequest } from "aws-lambda";

import type { Config } from "../config";
import type { LambdaFunction, LambdaRegistry } from "../lambda";

import type {
    CloudFrontEventType,
    CloudFrontDistributionConfig,
    CloudFrontBehaviorConfig,
    CloudFrontOriginConfig,
} from "./types";
import { CloudFrontViewer, constructViewer } from "./viewer";
import { writeOriginResponse } from "./originResponse";
import { makeOriginRequest } from "./originInteraction";
import {
    selectDistributionByHost,
    selectBehaviorByPath,
    selectOriginByName,
} from "./distributions";
import { constructViewerRequest } from "./viewerRequest";
import { constructOriginRequest } from "./originRequest";
import { constructRequestEvent } from "./requestEvent";
import { CloudFrontRequestEventResult } from "./requestEventResult";
import { generateErrorResponse } from "./errorResponse";

export class CloudFrontRequestHandler {
    private id: string;

    private host: string;

    private distribution: CloudFrontDistributionConfig;

    private behavior: CloudFrontBehaviorConfig;

    private origin: CloudFrontOriginConfig;

    private viewer: CloudFrontViewer;

    constructor(
        config: Config,
        private lambdaRegistry: LambdaRegistry,
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
            config.cloudfront.distributions,
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
    ): Promise<CloudFrontRequestEventResult> {
        const lambda = this.selectLambdaForEvent(eventType);
        if (!lambda) {
            return new CloudFrontRequestEventResult(request);
        }

        return this.invokeLambdaForRequestEvent(eventType, request, lambda);
    }

    private async invokeLambdaForRequestEvent(
        eventType: CloudFrontEventType,
        request: CloudFrontRequest,
        lambda: LambdaFunction,
    ): Promise<CloudFrontRequestEventResult> {
        const requestEvent = constructRequestEvent(
            this.id,
            eventType,
            this.distribution,
            request,
        );

        try {
            return await lambda.invokeForRequestEvent(this.id, requestEvent);
        } catch (error) {
            return new CloudFrontRequestEventResult(
                generateErrorResponse(error),
            );
        }
    }

    private selectLambdaForEvent(
        eventType: CloudFrontEventType,
    ): LambdaFunction | null {
        const lambdaName = this.behavior.lambdas?.[eventType];
        if (!lambdaName) {
            return null;
        }

        return this.lambdaRegistry.get(lambdaName);
    }
}
