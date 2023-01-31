import { CloudWatchLogGroup } from "./logGroup";

export class CloudWatch {
    public groups: CloudWatchLogGroup[] = [];

    public group(name: string): CloudWatchLogGroup {
        let group = this.groups.find((group) => group.name === name);
        if (group) {
            return group;
        }

        group = new CloudWatchLogGroup(name);
        this.groups.push(group);

        return group;
    }

    public clear(): void {
        this.groups.forEach((group) => {
            group.clear();
        });
    }
}
