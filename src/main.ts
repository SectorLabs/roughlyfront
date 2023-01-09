#!/usr/bin/env node

import * as http from "http";
import consola from "consola";
import { program, Option } from "commander";

import { parseConfig } from "./config";
import { createRequestListener } from "./requestListener";

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
        );

    await program.parse(args);
    const options = program.opts();
    const config = await parseConfig(options["config"]);

    const requestListener = createRequestListener(config);
    const server = http.createServer(requestListener);

    server.listen(options["port"], options["host"], () => {
        consola.success(`Listening on ${options["host"]}:${options["port"]}`);
    });
};
