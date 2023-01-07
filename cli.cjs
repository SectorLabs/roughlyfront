#!/usr/bin/env node

const { main } = require("./dist/cli.js");

(async () => {
    await main(process.argv);
})();
