#!/usr/bin/env node

import { program } from "commander";
import * as http from "http";

import { createRequestListener } from "./requestListener";
import { evaluateFunctionCode } from "./functionCode";

export const main = async (args: string[]): Promise<void> => {
    program
        .name("roughlyfront")
        .description("A roughly accurate emulator for AWS Lambda@Edge.")
        .requiredOption("-p, --port <port>", "port to listen on", Number, 8787)
        .requiredOption("-h, --host <host>", "host to listen on", "0.0.0.0")
        .requiredOption(
            "-s, --handler-script <js script>",
            "handler script to invoke",
            "index.js",
        )
        .requiredOption(
            "-n, --handler-name <name>",
            "handler function to invoke",
            "handler",
        );

    await program.parse(args);
    const options = program.opts();

    const handler = evaluateFunctionCode(
        options["handlerScript"],
        options["handlerName"],
    );
    const requestListener = createRequestListener(handler);

    const server = http.createServer(requestListener);
    server.listen(options["port"], options["host"]);
};
