export const RACES = ['Unknown' /* index = 0 special */, 'Chinese', 'Other Asian', 'Other races'] as const;
export const ROLES = ['Vanilla', 'M self', 'F self', 'M/m', 'M/f', 'F/m', 'F/f', 'MtF/m'] as const;
export const TAG_TYPES = ['Special', 'Studio', 'Content', 'Format'] as const;

export type Race = typeof RACES[number];
export type Role = typeof ROLES[number];
export type TagType = typeof TAG_TYPES[number];

export type TagId = number;
export type ClipId = number;

export interface RowData {
    id: number | string;
}

export interface ClipCallback {
    loading: boolean;
}

export type ClipJson = [
    ClipId, // id
    string, // path
    Race, // race
    Role[], // role
    number, // grade, a.k.a. rating
    number, // size
    number, // duration
    number[], // tags
    number, // totalPlay
    number, // lastPlay
    boolean, // thumbSet
    string, // sourceNote
    number // resolution
];

export interface TagJson {
    readonly id: TagId;
    readonly name: string;
    readonly best: ClipId;
    readonly parent: TagId[];
    readonly type: TagType;
}

export const arrayNonEq = <T>(elementNonEq?: (a: T, b: T) => boolean): ((aArr: T[] | null | undefined, bArr: T[] | null | undefined) => boolean) => (aArr, bArr) => {
    if (!aArr || !bArr) { return (!aArr) !== (!bArr); }
    if (aArr.length !== bArr.length) { return true; }
    return aArr.some((el, index) => (elementNonEq ? elementNonEq(el, bArr[index]) : (el !== bArr[index])));
};

export const mapNonEq = <K, V>(elementNonEq?: (a: V, b: V) => boolean): ((aMap: Map<K, V> | null | undefined, bMap: Map<K, V> | null | undefined) => boolean) => (aMap, bMap) => {
    if (!aMap || !bMap) { return (!aMap) !== (!bMap); }
    if (aMap.size !== bMap.size) { return true; }
    for (const [key, el] of aMap) {
        if (!bMap.has(key)) { return true; }
        if (elementNonEq ? elementNonEq(el, bMap.get(key)!) : (el !== bMap.get(key))) { return true; }
    }
    return false;
};

export const recordNonEq = <V>(elementNonEq?: (a: V, b: V) => boolean): ((aObj: Record<string, V> | null | undefined, bObj: Record<string, V> | null | undefined) => boolean) => (aObj, bObj) => {
    if (!aObj || !bObj) { return (!aObj) !== (!bObj); }
    const aKeys = Object.keys(aObj).filter(key => aObj.hasOwnProperty(key));
    const bKeys = Object.keys(bObj).filter(key => bObj.hasOwnProperty(key));
    if (aKeys.length !== bKeys.length) { return true; }
    return aKeys.some(key => (!bObj.hasOwnProperty(key)) || (elementNonEq ? elementNonEq(aObj[key], bObj[key]) : (aObj[key] !== bObj[key])));
};

// Return the same instance if actual value not changed (using the given comparision function).
export class DedupeStore<T> {
    value(newValue: T): T { 
        if (this.notEqual(newValue, this.instance)) {
            this.instance = newValue;
        }
        return this.instance;
    }

    constructor(public instance: T, private readonly notEqual: (a: T, b: T) => boolean) {}
}

export class Store<T> {
    loaded: boolean = false;
    error?: any;
    value?: T;

    constructor(public readonly promise: Promise<T>) {
        promise.then(value => {
            this.value = value;
            this.loaded = true;
        }, error => {
            this.error = error;
            this.loaded = true;
        });
    }
}

export class MultiStore<T> {
    private resolve?: (value: Promise<T>) => void;
    private oldPromise?: Promise<T>;

    constructor(private promise: Promise<T>) {
        promise.finally(this.next);
    }

    private readonly next = () => {
        this.oldPromise = this.promise;
        this.promise = new Promise(res => { this.resolve = res; });
    };

    update(updater: (old: T) => T) {
        if (!this.resolve || !this.oldPromise) { throw new TypeError('Initializtion not done yet!'); }
        this.resolve(this.oldPromise.then(updater));
        this.next();
    }

    async *value(): AsyncGenerator<T, never, never> {
        if (this.oldPromise) {
            yield await this.oldPromise;
        }
        while (true) {
            yield await this.promise;
        }
    }
      
}