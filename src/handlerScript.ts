import * as vm from "vm";
import * as fs from "fs";
import { Headers } from "node-fetch-commonjs";

import type { HandlerFunction } from "./types.js";

export const evaluateHandlerScript = (
    filePath: string,
    handlerName: string,
): HandlerFunction => {
    const src = fs.readFileSync(filePath, "utf8");

    const script = new vm.Script(src, {
        filename: filePath,
    });

    const context = vm.createContext({
        module: {},
        exports: {},
        global: {},
        process: process,
        require,
        console,
        URL,
        Headers,
    });

    script.runInNewContext(context);

    const handlerFunction = context["exports"][handlerName];
    if (!handlerFunction) {
        throw new Error(
            `${filePath} does not export a function named ${handlerName}`,
        );
    }

    return handlerFunction as HandlerFunction;
};
