export const seq = () => {
    let nextId = 0;
    return () => ++nextId;
};
