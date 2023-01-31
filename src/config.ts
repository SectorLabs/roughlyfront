import * as fs from "fs";
import * as path from "path";
import toml from "toml";

import type { LambdaConfig } from "./lambda";
import type { CloudFrontConfig } from "./cloudfront";

export interface Options {
    config: string;
    port: number;
    host: string;
    httpsKey?: string;
    httpsCert?: string;
    build: boolean;
}

export interface Config {
    directory: string;
    lambda: LambdaConfig;
    cloudfront: CloudFrontConfig;
}

export const parseConfig = async (options: Options): Promise<Config> => {
    const rawConfig: Config = await toml.parse(
        fs.readFileSync(options.config, "utf8"),
    );
    rawConfig.directory = path.dirname(options.config);

    if (!options.build) {
        rawConfig.lambda.builds = [];
    }

    // TODO: add validation
    return rawConfig;
};
