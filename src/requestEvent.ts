import type { CloudFrontRequest, CloudFrontRequestEvent } from "aws-lambda";

import type { CloudFrontEventType } from "./types";
import type { DistributionConfig } from "./config";

export const constructRequestEvent = (
    id: string,
    eventType: CloudFrontEventType,
    distribution: DistributionConfig,
    request: CloudFrontRequest,
): CloudFrontRequestEvent => ({
    Records: [
        {
            cf: {
                config: {
                    distributionDomainName: distribution.domains[0] || "",
                    distributionId: distribution.id,
                    eventType,
                    requestId: id,
                },
                request,
            },
        },
    ],
});
