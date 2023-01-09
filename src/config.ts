import * as fs from "fs";
import * as path from "path";
import toml from "toml";

import type { CloudFrontEventType } from "./types";

export interface LambdaBuildConfig {
    command: string;
    watch?: string[];
}

export interface LambdaConfig {
    name: string;
    file: string;
    handler: string;
    build?: LambdaBuildConfig;
}

export interface OriginConfig {
    name: string;
    protocol: string;
    domain: string;
    port: number;
    path: string;
}

export interface BehaviorConfig {
    pattern: string;
    origin: string;
    lambdas?: Record<CloudFrontEventType, string>;
}

export interface DistributionConfig {
    id: string;
    domains: string[];
    origins: OriginConfig[];
    behaviors: BehaviorConfig[];
}

export interface Config {
    directory: string;
    lambdas: LambdaConfig[];
    distributions: DistributionConfig[];
}

export const parseConfig = async (filePath: string): Promise<Config> => {
    const rawConfig = await toml.parse(fs.readFileSync(filePath, "utf8"));
    rawConfig.directory = path.dirname(filePath);
    // TODO: add validation
    return rawConfig as Config;
};
