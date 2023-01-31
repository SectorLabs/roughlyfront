#!/usr/bin/env node

import { program, Option } from "commander";

import { parseConfig } from "./config";
import { CloudWatch } from "./cloudwatch";
import { LambdaRegistry } from "./lambda";
import { CloudFrontServer } from "./cloudfront";

export const main = async (args: string[]): Promise<void> => {
    program
        .name("roughlyfront")
        .description("A roughly accurate emulator for AWS Lambda@Edge.")
        .addOption(
            new Option(
                "-c, --config <filename>",
                "config file to use",
            ).makeOptionMandatory(),
        )
        .addOption(
            new Option("-p, --port <port>", "port to listen on")
                .argParser(Number)
                .default(8787)
                .makeOptionMandatory(),
        )
        .addOption(
            new Option("-h, --host <host>", "host to listen on")
                .default("0.0.0.0")
                .makeOptionMandatory(),
        )
        .addOption(new Option("--https-key <file>", "path to a SSL key to use"))
        .addOption(
            new Option(
                "--https-cert <file>",
                "path to a SSL certificate to use",
            ),
        )
        .addOption(
            new Option(
                "-b, --build",
                "build lambda functions using the configured build command",
            ),
        );

    await program.parse(args);
    const options = program.opts();
    const config = await parseConfig({
        config: options["config"],
        port: options["port"],
        host: options["host"],
        httpsKey: options["httpsKey"],
        httpsCert: options["httpsCert"],
        build: options["build"],
    });

    const cloudWatch = new CloudWatch();
    const lambdaRegistry = LambdaRegistry.create(config, cloudWatch);
    const cloudFront = new CloudFrontServer(config, lambdaRegistry);

    cloudFront.listen({
        port: options["port"],
        host: options["host"],
        httpsKey: options["httpsKey"],
        httpsCert: options["httpsCert"],
    });
};
