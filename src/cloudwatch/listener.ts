import zlib from "zlib";
import * as crypto from "crypto";
import type {
    CloudWatchLogsEvent,
    CloudWatchLogsDecodedData,
} from "aws-lambda";

import { AWS_ACCOUNT_ID } from "../constants";
import type { Config } from "../config";
import type { LambdaRegistry } from "../lambda";

import type { CloudWatch } from "./cloudWatch";
import type { CloudWatchLogGroup } from "./logGroup";
import type { CloudWatchLogStream } from "./logStream";
import type { CloudWatchSubscriptionConfig } from "./types";

export class CloudWatchListener {
    constructor(
        private config: Config,
        private cloudWatch: CloudWatch,
        private lambdaRegistry: LambdaRegistry,
    ) {}

    public async invokeSubscriptions(): Promise<void> {
        for (const subscription of this.config.cloudwatch?.subscriptions ||
            []) {
            for (const group of this.cloudWatch.groups) {
                if (subscription.group !== group.name) {
                    continue;
                }

                for (const stream of group.streams) {
                    await this.deliverStream(subscription, group, stream);
                }
            }
        }

        this.cloudWatch.clear();
    }

    private async deliverStream(
        subscription: CloudWatchSubscriptionConfig,
        group: CloudWatchLogGroup,
        stream: CloudWatchLogStream,
    ): Promise<void> {
        const filteredMessages = this.filterMessages(
            stream.messages,
            subscription.pattern,
        );
        if (!filteredMessages.length) {
            return;
        }

        const lambda = this.lambdaRegistry.get(subscription.destination);

        const eventData: CloudWatchLogsDecodedData = {
            owner: AWS_ACCOUNT_ID.toString(),
            logGroup: group.name,
            logStream: stream.name,
            subscriptionFilters: [subscription.name],
            messageType: "DATA_MESSAGE",
            logEvents: filteredMessages.map((message) => ({
                id: Math.floor(Math.random() * 1000).toString(),
                timestamp: new Date().getTime(),
                message,
            })),
        };

        const event: CloudWatchLogsEvent = {
            awslogs: {
                data: zlib
                    .gzipSync(JSON.stringify(eventData))
                    .toString("base64"),
            },
        };

        try {
            await lambda.invoke(crypto.randomUUID().replace(/-/g, ""), event);
        } catch (e) {}
    }

    private filterMessages(messages: string[], pattern?: string): string[] {
        const filters = (pattern || "")
            .replace(/-/g, " -")
            .split(" ")
            .filter((filter) => !!filter);
        if (!filters || !filters.length) {
            return messages;
        }

        return messages.filter((message) =>
            filters.every((filter) => {
                if (filter.startsWith("-")) {
                    return !message.includes(filter.replace("-", ""));
                } else {
                    return message.includes(filter);
                }
            }),
        );
    }
}
