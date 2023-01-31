import type { CloudFrontRequest, CloudFrontResultResponse } from "aws-lambda";

export class CloudFrontRequestEventResult {
    constructor(private result: CloudFrontRequest | CloudFrontResultResponse) {}

    isRequest(): boolean {
        return !!(this.result as CloudFrontRequest).uri;
    }

    isResponse(): boolean {
        return !!(this.result as CloudFrontResultResponse).status;
    }

    asRequest(): CloudFrontRequest {
        return this.result as CloudFrontRequest;
    }

    asResponse(): CloudFrontResultResponse {
        return this.result as CloudFrontResultResponse;
    }
}
