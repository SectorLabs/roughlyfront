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

        const year = this.moment.getFullYear();
        const month = ("0" + (this.moment.getMonth() + 1)).slice(-2);
        const day = ("0" + this.moment.getDate()).slice(-2);

        this.name = `${year}/${month}/${day}/[${prefix}]${this.id}`;
    }

    public log(message: string) {
        this.messages.push(message);

        console.log(message);
    }
}
