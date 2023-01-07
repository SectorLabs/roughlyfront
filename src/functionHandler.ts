import type {
    CloudFrontRequest,
    CloudFrontRequestEvent,
    CloudFrontResponse,
    Context,
} from "aws-lambda";

export type FunctionHandler = (
    event: CloudFrontRequestEvent,
    context: Context,
) => Promise<CloudFrontRequest | CloudFrontResponse>;
