import type {
    CloudFrontRequest,
    CloudFrontRequestEvent,
    CloudFrontResponse,
    Context,
} from "aws-lambda";

export type HandlerFunction = (
    event: CloudFrontRequestEvent,
    context: Context,
) => Promise<CloudFrontRequest | CloudFrontResponse>;
