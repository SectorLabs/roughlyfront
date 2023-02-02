export const performanceNow = (): number =>
    global.performance ? performance.now() : Date.now();
