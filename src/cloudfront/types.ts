export type CloudFrontEventType =
    | "origin-request"
    | "origin-response"
    | "viewer-request"
    | "viewer-response";

export interface CloudFrontOriginConfig {
    name: string;
    protocol: string;
    domain: string;
    port: number;
    path: string;
    headers?: Record<string, string>;
}

export interface CloudFrontBehaviorConfig {
    pattern: string;
    origin: string;
    lambdas?: Record<CloudFrontEventType, string>;
}

export interface CloudFrontDistributionConfig {
    id: string;
    domains: string[];
    origins: CloudFrontOriginConfig[];
    behaviors: CloudFrontBehaviorConfig[];
}

export interface CloudFrontConfig {
    distributions: CloudFrontDistributionConfig[];
}
