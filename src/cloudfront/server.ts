import * as fs from "fs";
import * as http from "http";
import * as https from "https";
import consola from "consola";

import type { LambdaRegistry } from "../lambda";
import type { Config } from "../config";

import { CloudFrontRequestHandler } from "./requestHandler";

interface CloudFrontListenOptions {
    host: string;
    port: number;
    httpsKey?: string;
    httpsCert?: string;
}

export class CloudFrontServer {
    constructor(
        private config: Config,
        private lambdaRegistry: LambdaRegistry,
    ) {}

    public listen(options: CloudFrontListenOptions) {
        const requestListener = this.onRequest.bind(this);

        let server = null;
        if (options.httpsKey && options.httpsCert) {
            server = https.createServer(
                {
                    key: fs.readFileSync(options.httpsKey),
                    cert: fs.readFileSync(options.httpsCert),
                },
                requestListener,
            );

            consola.success(
                `Enabled HTTPS with ${options.httpsCert} as the certificate`,
            );
        } else {
            server = http.createServer(requestListener);
        }

        server.listen(options.port, options.host, () => {
            consola.success(`Listening on ${options.host}:${options.port}`);
        });
    }

    private async onRequest(
        incomingMessage: http.IncomingMessage,
        outgoingMessage: http.ServerResponse,
    ) {
        const requestHandler = new CloudFrontRequestHandler(
            this.config,
            this.lambdaRegistry,
            incomingMessage,
            outgoingMessage,
        );

        await requestHandler.handle();
    }
}
