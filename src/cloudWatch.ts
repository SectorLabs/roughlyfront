import * as crypto from "crypto";

export class CloudWatchLogStream {
    public id: string;

    public moment: Date;

    public name: string;

    private messages: string[] = [];

    constructor() {
        this.id = crypto.randomUUID().replace(/-/g, "");
        this.moment = new Date();
        this.name = `${this.moment.getFullYear()}/${
            this.moment.getMonth() + 1
        }/${this.moment.getDate()}/${this.id}`;
    }

    public log(message: string) {
        this.messages.push(message);

        console.log(message);
    }
}

export class CloudWatchLogGroup {
    public name: string;

    private streams: CloudWatchLogStream[] = [];

    constructor(name: string) {
        this.name = name;
    }

    public stream(): CloudWatchLogStream {
        let stream = this.streams[this.streams.length - 1];
        if (!stream) {
            stream = new CloudWatchLogStream();
            this.streams.push(stream);
        }

        return stream;
    }
}

export class CloudWatch {
    private logGroups: CloudWatchLogGroup[] = [];

    public group(name: string): CloudWatchLogGroup {
        let logGroup = this.logGroups.find(
            (logGroup) => logGroup.name === name,
        );
        if (logGroup) {
            return logGroup;
        }

        logGroup = new CloudWatchLogGroup(name);
        this.logGroups.push(logGroup);

        return logGroup;
    }
}
