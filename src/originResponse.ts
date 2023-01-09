import type * as http from "http";
import type { CloudFrontResultResponse } from "aws-lambda";
import { Headers } from "node-fetch-commonjs";

interface Options {
    id: string;
    host: string;
    generated: boolean;
}

const writeHeaders = (
    originResponse: CloudFrontResultResponse,
    outgoingMessage: http.ServerResponse,
    options: Options,
): void => {
    // Construct a `Headers` object first to make sure that duplicate
    // headers are handled properly and concatenated into a single header.
    const headers = new Headers();
    Object.entries(originResponse.headers || {}).forEach(([name, values]) => {
        values.forEach(({ key, value }) => {
            headers.append(key || name, value);
        });
    });

    headers.set("x-amz-cf-id", options.id);
    headers.set("x-amz-cf-pop", "ROUGHLYFRONT");
    headers.set(
        "x-cache",
        options.generated
            ? "LambdaGeneratedResponse from cloudfront"
            : "Miss from cloudfront",
    );
    headers.set("via", `1.1 ${options.host} (CloudFront)`);

    Array.from(headers.entries()).forEach(([name, value]) => {
        outgoingMessage.setHeader(name, value);
    });
};

export const writeOriginResponse = (
    originResponse: CloudFrontResultResponse,
    outgoingMessage: http.ServerResponse,
    options: Options,
): void => {
    writeHeaders(originResponse, outgoingMessage, options);

    // TODO: this seems to always use Transfer-Encoding: chunked
    // even when the body is really small.. Maybe we should force
    // it to write the body in one go and send a Content-Length header?
    if (originResponse.body) {
        outgoingMessage.write(
            Buffer.from(
                originResponse.body,
                originResponse.bodyEncoding === "base64" ? "base64" : undefined,
            ),
        );
    }

    outgoingMessage.statusCode = Number(originResponse.status);
    outgoingMessage.end();
};
