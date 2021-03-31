export const seq = (): (() => number) => {
    let nextId = 0;
    return () => ++nextId;
};

// Copied from lit-html, with the original comment "effectively infinity, but a SMI".
export const MAX_GOOD_INTEGER = 0x7fffffff;