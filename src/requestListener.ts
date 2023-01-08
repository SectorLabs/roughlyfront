import type * as http from "http";
import type { CloudFrontResultResponse } from "aws-lambda";

import type { Lambda } from "./lambda";
import { constructClientRequest } from "./client";
import { writeServerResponse } from "./server";
import { constructOriginRequest } from "./origin";
import {
    CloudFrontEventType,
    CloudFrontLambdaResultType,
    constructCloudFrontRequestEvent,
    constructCloudFrontRequestContext,
    constructResponseFromCloudFront,
    detectCloudFrontLambdaResult,
} from "./cloudfront";

export const createRequestListener =
    (eventType: CloudFrontEventType, lambda: Lambda) =>
    async (
        incomingMessage: http.IncomingMessage,
        outgoingMessage: http.ServerResponse,
    ): Promise<void> => {
        const clientRequest = await constructClientRequest(incomingMessage);
        const originRequest = constructOriginRequest(clientRequest);

        const cfRequestEvent = constructCloudFrontRequestEvent(
            eventType,
            originRequest,
        );
        const cfRequestContext =
            constructCloudFrontRequestContext(originRequest);

        const result = await lambda.invoke(cfRequestEvent, cfRequestContext);
        const resultType = detectCloudFrontLambdaResult(result);
        switch (resultType) {
            case CloudFrontLambdaResultType.REQUEST:
                outgoingMessage.writeHead(200);
                outgoingMessage.end("hello world");
                break;

            case CloudFrontLambdaResultType.RESPONSE:
                const response = constructResponseFromCloudFront(
                    result as CloudFrontResultResponse,
                );
                writeServerResponse(response, outgoingMessage);
                break;

            default:
                throw new Error(
                    `Lambda returned unknown/unhandledable data type: ${result}`,
                );
        }
    };
