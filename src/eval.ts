#!/usr/bin/env node

import { program } from "commander";

import { LambdaEvaluator } from "./lambda";

export const main = async (args: string[]): Promise<void> => {
    program
        .name("roughlyfront-eval")
        .description("Evaluates a JavaScript file as Roughlyfront would.")
        .argument("<filepath>", "path to the file to evaluate");

    await program.parse(args);

    const evaluator = new LambdaEvaluator(program.args[0]!);
    const exports = await evaluator.evaluate();

    console.log(exports);
};
