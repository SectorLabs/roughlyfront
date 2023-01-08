#!/usr/bin/env node

import * as fs from "fs";
import * as http from "http";
import consola from "consola";
import { program, Option } from "commander";

import { Lambda } from "./lambda";
import { createRequestListener } from "./requestListener";

export const main = async (args: string[]): Promise<void> => {
    program
        .name("roughlyfront")
        .description("A roughly accurate emulator for AWS Lambda@Edge.")
        .addOption(
            new Option("-e, --event-type", "event to emulate")
                .choices(["origin-request"])
                .default("origin-request")
                .makeOptionMandatory(),
        )
        .requiredOption("-p, --port <port>", "port to listen on", Number, 8787)
        .requiredOption("-h, --host <host>", "host to listen on", "0.0.0.0")
        .requiredOption(
            "-f, --lambda-file <js script>",
            "handler script to invoke",
            "index.js",
        )
        .requiredOption(
            "-n, --lambda-handler <name>",
            "handler function to invoke",
            "handler",
        );

    await program.parse(args);
    const options = program.opts();

    const lambda = new Lambda(options["lambdaFile"], options["lambdaHandler"]);
    lambda.evaluate();

    fs.watch(options["lambdaFile"], () => {
        lambda.evaluate();
        consola.info(`Lambda code changed, reloaded it`);
    });

    consola.success(`Watching ${options["lambdaFile"]}`);

    const requestListener = createRequestListener(options["eventType"], lambda);
    const server = http.createServer(requestListener);

    server.listen(options["port"], options["host"], () => {
        consola.success(`Listening on ${options["host"]}:${options["port"]}`);
    });
};
