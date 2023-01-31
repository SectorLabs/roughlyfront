import { CloudWatchLogStream } from "./logStream";

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
