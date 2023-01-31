import type { CloudFrontResultResponse } from "aws-lambda";

const formatError = (error: unknown): string => {
    if (error instanceof Error) {
        if (error.stack) {
            return error.stack.toString();
        }

        return error.message;
    }

    if (typeof error === "string") {
        return error;
    }

    return "Unknown error";
};

export const generateErrorResponse = (
    error: unknown,
): CloudFrontResultResponse => ({
    status: "500",
    statusDescription: "Server error",
    headers: {
        "content-type": [
            {
                value: "text/html",
            },
        ],
    },
    body: `<h1>AWS Lambda@Edge Error</h1><pre><code>${formatError(
        error,
    )}</code></pre>`,
    bodyEncoding: "text",
});
