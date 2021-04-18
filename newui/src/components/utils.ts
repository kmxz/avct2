import { Score } from '../model';

export const seq = (): (() => number) => {
    let nextId = 0;
    return () => ++nextId;
};

// Copied from lit-html, with the original comment "effectively infinity, but a SMI".
export const MAX_GOOD_INTEGER = 0x7fffffff;

type StatParamKey = 'num' | 'rated' | 'avg' | 'r1' | 'r2' | 'r3' | 'r4' | 'r5';

export const simpleStat = (numbersIncludingZeros: Score[]): Record<StatParamKey, number> => {
    const buckets = [0, 0, 0, 0, 0, 0] as [number, number, number, number, number, number];
    let sum = 0;
    for (const num of numbersIncludingZeros) {
        buckets[num]++;
        sum += num;
    }
    return { 
        num: numbersIncludingZeros.length, 
        rated: numbersIncludingZeros.length - buckets[0],
        avg: sum / (numbersIncludingZeros.length - buckets[0]),
        r1: buckets[1], r2: buckets[2], r3: buckets[3], r4: buckets[4], r5: buckets[5]
    };
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