import * as fs from "fs";
import * as path from "path";
import toml from "toml";

import type { CloudFrontEventType } from "./types";

export interface Options {
    config: string;
    port: number;
    host: string;
    httpsKey?: string;
    httpsCert?: string;
    build: boolean;
}

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
    headers?: Record<string, string>;
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

export const parseConfig = async (options: Options): Promise<Config> => {
    const rawConfig: Config = await toml.parse(
        fs.readFileSync(options.config, "utf8"),
    );
    rawConfig.directory = path.dirname(options.config);

    if (!options.build) {
        rawConfig.lambdas.forEach((lambda) => {
            delete lambda["build"];
        });
    }

    // TODO: add validation
    return rawConfig;
};
