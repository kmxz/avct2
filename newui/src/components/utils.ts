export const seq = (): (() => number) => {
    let nextId = 0;
    return () => ++nextId;
};

// Copied from lit-html, with the original comment "effectively infinity, but a SMI".
export const MAX_GOOD_INTEGER = 0x7fffffff;

const quantile = (numbers: number[], q: number): number => {
    const i = q * numbers.length - 0.5;
    let lower = Math.floor(i);
    let upper = Math.ceil(i);
    if (lower < 0) { lower = 0; }
    if (upper >= numbers.length) { upper = numbers.length - 1; } 
    if (lower === upper) { return numbers[lower]; }
    return (upper - i) * numbers[lower] + (i - lower) * numbers[upper];
}

export const simpleStat = (numbers: number[]): string => {
    if (!numbers.length) { throw new TypeError('Cannot be empty'); }
    const sum = numbers.reduce((a, b) => a + b);
    let response = `μ: ${(sum / numbers.length).toFixed(1)}`;
    if (numbers.length >= 3) { 
        const sorted = numbers;
        sorted.sort();
        const quartiles = [quantile(sorted, 0.25), quantile(sorted, 0.5), quantile(sorted, 0.75)];
        response += `, Q: ${quartiles.map(num => num.toFixed(1)).join(', ')}`;
    }
    return response;
}

// Returns the index that the split point comes BEFORE.
// Example: [100, 80, 25, 20, 15] will return 2.
// Input must be already sorted DESC.
export const bisect = (numbers: number[]): number => {
    if (numbers.length < 2) { return numbers.length; }
   
    let leftSum = 0;
    let rightSum = numbers.reduce((a, b) => a + b);

    let bestSoFar = 0;
    let diffValue = Number.NEGATIVE_INFINITY;

    for (let attempt = 1; attempt < numbers.length; attempt++) {
        leftSum += numbers[attempt - 1];
        rightSum -= numbers[attempt - 1];
        const leftAvg = leftSum / attempt;
        const rightAvg = rightSum / (numbers.length - attempt);
        const avgGiff = (leftAvg - rightAvg) * (numbers.length ** 2) / (attempt ** 2 + (numbers.length - attempt) ** 2);
        const pairDiff = numbers[attempt - 1] - numbers[attempt];
        const diff = avgGiff / 2 + pairDiff;
        if (diff > diffValue) {
            diffValue = diff;
            bestSoFar = attempt;
        }
    }

    return bestSoFar;
}

// Find the index of the FIRST element that is lower than search, or array.length if none.
export const bsearchDesc = <T, K extends keyof T>(array: T[], key: K, search: T[K]): number => {
    let left = -1;
    let right = array.length;
    while (right - left > 1) {
        const attempt = (left + right) >> 1;
        if (array[attempt][key] < search) {
            right = attempt;    
        } else {
            left = attempt;
        }
    }
    return right;
}

export const throttle = (target: () => void, durationMillis: number): (() => void) => {
    let lastCalled: number = -MAX_GOOD_INTEGER;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const execute = (): void => {
        lastCalled = performance.now();
        target();
        timer = void 0;
    }
    return () => {
        const now = performance.now();
        const wait = durationMillis - (now - lastCalled);
        if (wait > 0) {
            if (timer === void 0) {
                timer = setTimeout(execute, wait);
            }
        } else {
            execute();
        }
    };
};