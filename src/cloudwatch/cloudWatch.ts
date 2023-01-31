import { CloudWatchLogGroup } from "./logGroup";

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
