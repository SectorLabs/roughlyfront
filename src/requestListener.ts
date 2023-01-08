import type * as http from "http";
import type { CloudFrontRequest, CloudFrontResultResponse } from "aws-lambda";

import type { Lambda } from "./lambda";
import { constructClientRequest } from "./client";
import { writeServerResponse } from "./server";
import { forwardToOrigin } from "./origin";
import {
    CloudFrontEventType,
    CloudFrontLambdaResultType,
    constructRequestFromCloudFront,
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

        const cfRequestEvent = constructCloudFrontRequestEvent(
            eventType,
            clientRequest,
        );
        const cfRequestContext =
            constructCloudFrontRequestContext(clientRequest);

        const result = await lambda.invoke(cfRequestEvent, cfRequestContext);
        const resultType = detectCloudFrontLambdaResult(result);
        switch (resultType) {
            case CloudFrontLambdaResultType.REQUEST: {
                const request = constructRequestFromCloudFront(
                    result as CloudFrontRequest,
                );

                const response = await forwardToOrigin(request);
                writeServerResponse(response, outgoingMessage);
                break;
            }

            case CloudFrontLambdaResultType.RESPONSE: {
                const response = constructResponseFromCloudFront(
                    result as CloudFrontResultResponse,
                );
                writeServerResponse(response, outgoingMessage);
                break;
            }

            default:
                throw new Error(
                    `Lambda returned unknown/unhandledable data type: ${result}`,
                );
        }
    };
