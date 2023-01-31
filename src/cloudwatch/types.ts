export interface CloudWatchSubscriptionConfig {
    name: string;
    group: string;
    pattern?: string;
    destination: string;
}

export interface CloudWatchConfig {
    subscriptions?: CloudWatchSubscriptionConfig[];
}
