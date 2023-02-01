import * as crypto from "crypto";
import chalk from "chalk";
import stripAnsi from "strip-ansi";

import type { CloudWatchLogGroup } from "./logGroup";

export class CloudWatchLogStream {
    public id: string;

    public prefix: string;

    public moment: Date;

    public name: string;

    public messages: string[] = [];

    constructor(private group: CloudWatchLogGroup, prefix: string) {
        this.id = crypto.randomUUID().replace(/-/g, "");
        this.prefix = prefix;
        this.moment = new Date();

        const year = this.moment.getFullYear();
        const month = ("0" + (this.moment.getMonth() + 1)).slice(-2);
        const day = ("0" + this.moment.getDate()).slice(-2);

        this.name = `${year}/${month}/${day}/[${prefix}]${this.id}`;
    }

    public log(message: string) {
        this.messages.push(stripAnsi(message));

        console.log(chalk.cyan(`[${this.group.name}]`), message);
    }
}
