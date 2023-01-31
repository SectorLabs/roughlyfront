import * as crypto from "crypto";

export class CloudWatchLogStream {
    public id: string;

    public prefix: string;

    public moment: Date;

    public name: string;

    private messages: string[] = [];

    constructor(prefix: string) {
        this.id = crypto.randomUUID().replace(/-/g, "");
        this.prefix = prefix;
        this.moment = new Date();
        this.name = `${this.moment.getFullYear()}/${
            this.moment.getMonth() + 1
        }/${this.moment.getDate()}/[${prefix}]${this.id}`;
    }

    public log(message: string) {
        this.messages.push(message);

        console.log(message);
    }
}
