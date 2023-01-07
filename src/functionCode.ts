import * as vm from "vm";
import * as fs from "fs";

import { createEnvVars } from "./env";
import type { FunctionHandler } from "./functionHandler";

/**
 * Evaluate the function code and extract the handler function.
 *
 * We do this instead of using `require(..)` because it allows us
 * to easily re-evaluate the function code if it changes instead
 * of having to mess with the Node.js require cache.
 */
export const evaluateFunctionCode = (
    filePath: string,
    handlerName: string,
): FunctionHandler => {
    const src = fs.readFileSync(filePath, "utf8");

    const script = new vm.Script(src, {
        filename: filePath,
    });

    const context = vm.createContext({
        ...global,
        exports: {},
        require,
        process: {
            ...process,
            env: {
                ...process.env,
                ...createEnvVars(filePath, handlerName),
            },
        },
    });

    script.runInNewContext(context);

    const handler = context["exports"][handlerName];
    if (!handler) {
        throw new Error(
            `${filePath} does not export a function named ${handlerName}`,
        );
    }

    return handler as FunctionHandler;
};
