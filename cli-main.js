#!/usr/bin/env node

/**
 * This is a wrapper script that is executable and has a shebang.
 *
 * We can't make this a TypeScript file as it wouldn't retain the
 * execution bit. This file is referenced in the `bin` field in
 * package.json.
 */

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { main } = require("./dist/main.js");

(async () => {
    await main(process.argv);
})();
