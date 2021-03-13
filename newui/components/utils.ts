export const seq = (): (() => number) => {
    let nextId = 0;
    return () => ++nextId;
};
