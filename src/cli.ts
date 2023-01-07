#!/usr/bin/env node

import { program } from "commander";

export const main = async (args: string[]): Promise<void> => {
    program
        .name("roughlyfront")
        .description("A roughly accurate emulator for AWS Lambda@Edge.");

    await program.parse(args);
};
