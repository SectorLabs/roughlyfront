import { CloudWatchLogStream } from "./logStream";

export class CloudWatchLogGroup {
    public name: string;

    public streams: CloudWatchLogStream[] = [];

    constructor(name: string) {
        this.name = name;
    }

    public stream(prefix: string): CloudWatchLogStream {
        const prefixedStreams = this.streams.filter(
            (stream) => stream.prefix === prefix,
        );
        let stream = prefixedStreams[prefixedStreams.length - 1];

        if (!stream) {
            stream = new CloudWatchLogStream(this, prefix);
            this.streams.push(stream);
        }

        return stream;
    }

    public clear(): void {
        this.streams = [];
    }
}
