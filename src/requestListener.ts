import type * as http from "http";

import type { Lambda } from "./lambda";
import { constructClientRequest } from "./client";
import { constructOriginRequest } from "./origin";
import {
    CloudFrontEventType,
    constructCloudFrontRequestEvent,
    constructCloudFrontRequestContext,
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
        console.log(result);

        outgoingMessage.writeHead(200);
        outgoingMessage.end("hello world");
    };
