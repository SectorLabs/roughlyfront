import type { CloudFrontRequest, CloudFrontRequestEvent } from "aws-lambda";

import type {
    CloudFrontEventType,
    CloudFrontDistributionConfig,
} from "./types";

export const constructRequestEvent = (
    id: string,
    eventType: CloudFrontEventType,
    distribution: CloudFrontDistributionConfig,
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
