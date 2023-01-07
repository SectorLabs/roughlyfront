#!/usr/bin/env node

import * as fs from "fs";
import * as http from "http";
import consola from "consola";
import { program } from "commander";

import { LambdaEdgeFunction } from "./function";
import { createRequestListener } from "./requestListener";

export const main = async (args: string[]): Promise<void> => {
    program
        .name("roughlyfront")
        .description("A roughly accurate emulator for AWS Lambda@Edge.")
        .requiredOption("-p, --port <port>", "port to listen on", Number, 8787)
        .requiredOption("-h, --host <host>", "host to listen on", "0.0.0.0")
        .requiredOption(
            "-f, --function-file <js script>",
            "handler script to invoke",
            "index.js",
        )
        .requiredOption(
            "-n, --function-handler <name>",
            "handler function to invoke",
            "handler",
        );

    await program.parse(args);
    const options = program.opts();

    const func = new LambdaEdgeFunction(
        options["functionFile"],
        options["functionHandler"],
    );
    func.evaluate();

    fs.watch(options["functionFile"], () => {
        func.evaluate();
        consola.info(`Function code changed, reloaded it`);
    });

    consola.success(`Watching ${options["functionFile"]}`);

    const requestListener = createRequestListener(func);
    const server = http.createServer(requestListener);

    server.listen(options["port"], options["host"], () => {
        consola.success(`Listening on ${options["host"]}:${options["port"]}`);
    });
};
