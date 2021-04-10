export const RACES = ['Unknown' /* index = 0 special */, 'Chinese', 'Other Asian', 'Other races'] as const;
export const ROLES = ['Vanilla', 'M self', 'F self', 'M/m', 'M/f', 'F/m', 'F/f', 'MtF/m'] as const;
export const TAG_TYPES = ['Special', 'Studio', 'Content', 'Format'] as const;

export type Race = typeof RACES[number];
export type Role = typeof ROLES[number];
export type TagType = typeof TAG_TYPES[number];

export type TagId = number;
export type ClipId = number;

export interface RowData extends Record<string, any> {
    id: number;
}

export interface EditingCallback {
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
    readonly description: string;
}

export const arrayNonEq = <T>(elementNonEq?: (a: T, b: T) => boolean): ((aArr: T[] | null | undefined, bArr: T[] | null | undefined) => boolean) => (aArr, bArr) => {
    if (!aArr || !bArr) { return (!aArr) !== (!bArr); }
    if (aArr.length !== bArr.length) { return true; }
    return aArr.some((el, index) => (elementNonEq ? elementNonEq(el, bArr[index]) : (el !== bArr[index])));
};

export const recordNonEq = <V>(elementNonEq?: (a: V, b: V) => boolean): ((aObj: Record<string, V> | null | undefined, bObj: Record<string, V> | null | undefined) => boolean) => (aObj, bObj) => {
    if (!aObj || !bObj) { return (!aObj) !== (!bObj); }
    const aKeys = Object.keys(aObj).filter(key => aObj.hasOwnProperty(key));
    const bKeys = Object.keys(bObj).filter(key => bObj.hasOwnProperty(key));
    if (aKeys.length !== bKeys.length) { return true; }
    return aKeys.some(key => (!bObj.hasOwnProperty(key)) || (elementNonEq ? elementNonEq(aObj[key], bObj[key]) : (aObj[key] !== bObj[key])));
};

export const guardedRecordNonEq = <V>(elementNonEq?: (a: V, b: V) => boolean): ((aObj: any, bObj: any) => boolean) => (aObj, bObj) => {
    if (!aObj || !bObj) { return aObj !== bObj; }
    if ((aObj.constructor !== Object) || (bObj.constructor !== Object)) { return aObj !== bObj; }
    return recordNonEq(elementNonEq)(aObj, bObj);
};

// Return the same instance if actual value not changed (using the given comparision function).
export class DedupeMapObjectStore<K, V extends { [key: string]: any }> {
    private readonly cache = new Map<K, V>();

    instance(key: K, value: V): V {
        const oldInstance = this.cache.get(key);
        if (!oldInstance || !Array.from(Object.entries(value)).every(([k, v]) => oldInstance[k] === v)) { 
            this.cache.set(key, value);
            return value;
        }
        return oldInstance;
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

    update(updater: (old: T) => T): void {
        if (!this.resolve || !this.oldPromise) { throw new TypeError('Initializtion not done yet!'); }
        this.resolve(this.oldPromise.then(updater));
        this.next();
    }

    static mapUpdater<K, V>(key: K, newValue: V, checkOldValue: V | undefined): ((old: Map<K, V>) => Map<K, V>) {
        return oldMap => {
            if (oldMap.get(key) !== checkOldValue) {
                console.error('Error: updating a stale reference. Expected and actual:', checkOldValue, oldMap.get(key));
            }
            const newMap = new Map(oldMap);
            newMap.set(key, newValue);
            return newMap;
        };
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