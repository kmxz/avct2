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