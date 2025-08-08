import type * as http from "http";

import type { CloudFrontHeaders } from "aws-lambda";

export const parseIncomingMessageHeaders = (
    incomingMessage: http.IncomingMessage,
): Headers => {
    const headers = new Headers();
    Object.entries(incomingMessage.headers).forEach(([name, value]) => {
        if (typeof value === "string") {
            headers.append(name, value);
        } else if (Array.isArray(value)) {
            value.forEach((oneValue) => {
                headers.append(name, oneValue);
            });
        } else {
            headers.append(name, value || "");
        }
    });

    return headers;
};

export const parseCloudFrontHeaders = (
    cfHeaders?: CloudFrontHeaders,
): Headers => {
    const headers = new Headers();
    Object.entries(cfHeaders || {}).forEach(([name, values]) => {
        values.forEach(({ key, value }) => {
            headers.append(key || name, value);
        });
    });

    return headers;
};

export const parseFetchHeaders = (headers: Record<string, string>): Headers =>
    new Headers(Object.entries(headers));

export const asCloudFrontHeaders = (headers: Headers): CloudFrontHeaders => {
    const cfHeaders = Array.from(headers.entries()).reduce(
        (acc, [name, value]) => {
            // Set-Cookie is the only header that should not be merged and
            // can appear multiple times. Most browsers choke on merged
            // Set-Cookie headers.
            if (name.toLowerCase() === "set-cookie") {
                return {
                    ...acc,
                    [name]: headers
                        .getSetCookie()
                        .map((cookie) => ({ key: name, value: cookie })),
                };
            }

            return {
                ...acc,
                [name]: [{ key: name, value }],
            };
        },
        {},
    ) as CloudFrontHeaders;

    return cfHeaders;
};

export const asFetchHeaders = (headers: Headers): Record<string, string> =>
    Array.from(headers.entries()).reduce(
        (acc, [name, value]) => ({
            ...acc,
            [name]: value,
        }),
        {},
    );

export const mergeHeaders = (headersA: Headers, headersB: Headers): Headers => {
    const mergedHeaders = new Headers();

    Array.from(headersA.entries()).forEach(([name, value]) => {
        mergedHeaders.set(name, value);
    });

    Array.from(headersB.entries()).forEach(([name, value]) => {
        mergedHeaders.set(name, value);
    });

    return mergedHeaders;
};
