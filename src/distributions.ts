import outmatch from "outmatch";
import type {
    DistributionConfig,
    BehaviorConfig,
    OriginConfig,
} from "./config";

export const selectDistributionByHost = (
    distributions: DistributionConfig[],
    host: string,
): DistributionConfig => {
    const distribution = distributions.find((distribution) =>
        distribution.domains.includes(host),
    );
    if (!distribution) {
        throw new Error(
            `'${host}' could not be matched to any configured distribution`,
        );
    }

    return distribution;
};

export const selectBehaviorByPath = (
    distribution: DistributionConfig,
    path: string,
): BehaviorConfig => {
    const behavior = distribution.behaviors.find((behavior) =>
        outmatch(behavior.pattern, false)(path),
    );
    if (!behavior) {
        throw new Error(
            `'${path}' could not be matched to any behavior in distribution '${distribution.id}'`,
        );
    }

    return behavior;
};

export const selectOriginByName = (
    distribution: DistributionConfig,
    name: string,
): OriginConfig => {
    const origin = distribution.origins.find((origin) => origin.name === name);
    if (!origin) {
        throw new Error(`No origin named '${name}' found could be found`);
    }

    return origin;
};
