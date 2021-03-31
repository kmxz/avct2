// Copied from original; not adopted to TS.

import Throttle from './throttle';
import { handle } from './fake';
import { globalToast } from './components/toast';
import { ClipJson, TagJson, TagType } from './model';

const FAKE = true;
const ROOT = 'http://localhost:8080';

const uuidRegex = /[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89aAbB][a-f0-9]{3}-[a-f0-9]{12}/;
const dbConnId = window.location.search.substring(1);

if (!FAKE && !uuidRegex.test(dbConnId)) {
    window.alert('DB connection unspecified.');
}

const throttle = new Throttle(8); // only allow 10 parallel XHR requests to avoid Chrome fail.

type TypedApi = {
    // boot
    (api: '!clip/autocrawl'): Promise<{ added: string[]; disappeared: string[] }>;
    // info
    (api: 'players'): Promise<string[]>;
    // clip
    (api: 'clip/list'): Promise<ClipJson[]>;
    (api: '!clip/$/delete', params: { id: number }): Promise<null>;
    (api: 'clip/$/thumb', params: { id: number }): Promise<Blob>;
    (api: '!clip/$/saveshot', params: { id: number, file: Blob }): Promise<null>;
    (api: '!clip/$/shot', params: { id: number }): Promise<Blob>;
    (api: '!clip/$/edit', params: { id: number; key: string; value: any; }): Promise<ClipJson>;
    (api: '!clip/$/open', params: { id: number; record: boolean; player: string; }): Promise<null>;
    (api: '!clip/$/folder', params: { id: number }): Promise<null>;
    (api: 'clip/$/history', params: { id: number }): Promise<number[]>;
    (api: 'clip/$/similar', params: { id: number }): Promise<{ clipId: number, scores: Record<string, number>, total: number }[]>;
    // tag
    (api: 'tag/list'): Promise<TagJson[]>;
    (api: '!tag/create', params: { name: string; type: TagType; }): Promise<{ id: number }>;
    (api: '!tag/$/parent', params: { id: number; parent: number[]; }): Promise<null>;
    (api: '!tag/$/edit', params: { id: number; name: string; }): Promise<null>;
    (api: '!tag/$/description', params: { id: number; description: string; }): Promise<null>;
    (api: '!tag/auto', params: { dry: boolean }): Promise<{ clip: string; problematicTags: string[]; }[]>;
    (api: '!tag/$/setbest', params: { id: number; clip: number; }): Promise<null>;
}

export const sendTypedApi: TypedApi = (api: string, params: { [key: string]: any } = {}): Promise<any> => {
    const post = api.charAt(0) === '!';
    let url = post ? api.substr(1) : api;
    let formData: FormData | null = null;
    if (url.indexOf('$') > -1) {
        if (!params.id) {
            throw 'ID not provided for ' + api + '.';
        }
        url = url.replace('$', params.id);
    }
    if (post) {
        formData = new FormData();
        for (const key of Object.keys(params)) {
            let value = params[key];
            if (value instanceof Array) {
                value = JSON.stringify(value); // XXX: to JSON only when it's an array
            }
            formData!.append(key, value);
        }
    }
    if (FAKE) {
        const legacyApiName = api.replace('!', '').replace('/$/', '/');
        return handle(legacyApiName, params);
    }
    return throttle.add(async () => {
        try {
            const response = await fetch(ROOT + '/serv/' + url, {
                method: post ? 'POST' : 'GET',
                headers: { 'X-Db-Connection-Id': dbConnId },
                body: formData
            });
            if (response.status !== 200) {
                const error = await response.text();
                globalToast(`The server rejected request ${url}. Information: ${error}`);
                throw new Error(error || 'Unknown');
            }
            const mimeType = response.headers.get('Content-Type');
            if (mimeType?.startsWith('application/json')) {
                return await response.json();
            } else if (mimeType?.startsWith('image/')) {
                return await response.blob();
            } else {
                throw new Error(`Response type ${mimeType} not supported!`);
            }
        } catch (e) {
            globalToast('Network failure'); throw e;
        }
    });
};

export const loadImage = (response: Blob, onload?: (ev: Event) => void, onerror?: (ev: any) => void): HTMLImageElement => {
    const image = new Image();
    const url = window.URL.createObjectURL(response);
    const onLoad = onload || (() => void 0);
    const onError = onerror || (() => void 0);
    image.onload = function (ev) {
        window.URL.revokeObjectURL(url);
        onLoad.call(this, ev);
    };
    image.onerror = function (ev) {
        window.URL.revokeObjectURL(url);
        onError.call(this, ev);
    };
    image.src = url;
    return image;
};
