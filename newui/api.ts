// Copied from original; not adopted to TS.

import { ClipJson, TagJson } from './model';
import Throttle from './throttle'; 

const FAKE = true;
const ROOT = 'http://192.168.1.5:8080';

const FAKE_RESULTS: Record<string, (params: { [key: string]: any }) => any> = {
    'clip/list': (): ClipJson[] => [
        [1, 'vm_exchanges/1.wmv', 'Unknown', ['F self', 'F/m'], 4, 5000000, 360, [1, 2], 0, 0, false, 'foo src note', 1080],
        [2, '2.mp4', 'Unknown', ['M self'], 0, 5000000, 360, [4, 5, 6], 0, 0, false, 'foo src note', 360],
        [4, 'vm_exchanges/sub_dir/4.mov', 'Unknown', [], 1, 5000000, 360, [], 0, 0, false, 'foo src note', 720]
    ],
    'clip/edit': params => [params['id'], 'new-name.mp4', 'Unknown', ['M self'], params['value'], 5000000, 360, [4, 5, 6], 0, 0, false, 'foo src note', 360],
    'tag/list': (): TagJson[] => [
        { id: 1, name: 'tag 1', best: 0, parent: [], type: 'Studio' },
        { id: 2, name: 'tag 2', best: 0, parent: [], type: 'Content' },
        { id: 4, name: 'tag 4', best: 0, parent: [], type: 'Format' },
        { id: 5, name: 'tag 5', best: 0, parent: [2], type: 'Content' },
        { id: 6, name: 'tag 6', best: 0, parent: [], type: 'Special' }
    ]
};

const uuidRegex = /[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89aAbB][a-f0-9]{3}-[a-f0-9]{12}/;
const dbConnId = window.location.search.substring(1);

if (!FAKE && !uuidRegex.test(dbConnId)) {
    window.alert('DB connection unspecified.');
}

const throttle = new Throttle(8); // only allow 10 parallel XHR requests to avoid Chrome fail.

let toReload = false;
let muted = false;
let errorCount = 0;

const countError = (): void => {
    if (muted || (++errorCount < 3)) { return; }
    if (window.confirm('Mute errors for 30 seconds?')) {
        muted = true;
        setTimeout(() => {
            muted = false;
            errorCount = 0;
        }, 30 * 1000);
    } else {
        errorCount = 0;
    }
}

const actions: Record<string, { method: string, url: string, blob?: boolean, params?: string[] }> = {
    // boot
    'clip/autocrawl': {method: 'post', url: 'clip/autocrawl'},
    // info
    'players': {method: 'get', url: 'players'},
    // clip
    'clip/list': {method: 'get', url: 'clip'},
    'clip/delete': {method: 'post', url: 'clip/$/delete'},
    'clip/thumb': {method: 'get', url: 'clip/$/thumb', blob: true},
    'clip/saveshot': {method: 'post', url: 'clip/$/saveshot', params: ['file']},
    'clip/shot': {method: 'post', url: 'clip/$/shot', blob: true},
    'clip/edit': {method: 'post', url: 'clip/$/edit', params: ['key', 'value']},
    'clip/open': {method: 'post', url: 'clip/$/open', params: ['record']},
    'clip/openwith': {method: 'post', url: 'clip/$/openwith', params: ['player']},
    'clip/folder': {method: 'post', url: 'clip/$/folder'},
    'clip/history': {method: 'get', url: 'clip/$/history'},
    'clip/similar': {method: 'get', url: 'clip/$/similar'},
    // tag
    'tag/list': {method: 'get', url: 'tag'},
    'tag/create': {method: 'post', url: 'tag/create', params: ['name', 'type']},
    'tag/parent': {method: 'post', url: 'tag/$/parent', params: ['parent']},
    'tag/edit': {method: 'post', url: 'tag/$/edit', params: ['name']},
    'tag/description': {method: 'post', url: 'tag/$/description', params: ['description']},
    'tag/auto': {method: 'post', url: 'tag/auto', params: ['dry']},
    'tag/setbest': {method: 'post', url: 'tag/$/setbest', params: ['clip']}
};

export const send = (api: string, opt_params: { [key: string]: any } = {}): Promise<any> => {
    const config = actions[api];
    let url: string = config.url;
    let formData: FormData | null = null;
    if (config.url.indexOf('$') > -1) {
        if (!opt_params.id) {
            throw 'ID not provided for ' + api + '.';
        }
        url = config.url.replace('$', opt_params.id);
    }
    if (config.method === 'post') {
        if (config.params && config.params.length) {
            formData = new FormData();
            config.params.forEach(function (key) {
                if (!(opt_params.hasOwnProperty(key))) {
                    throw 'Parameter ' + key + ' not provided for ' + api + '.';
                }
                let value = opt_params[key];
                if (value instanceof Array) {
                    value = JSON.stringify(value); // XXX: to JSON only when it's an array
                }
                formData!.append(key, value);
            });
        }
    }
    if (FAKE) {
        return new Promise((res, rej) => {
            const mapper = FAKE_RESULTS[api];
            if (!mapper) { rej('Not mocked!'); } else { setTimeout(() => res(mapper(opt_params)), 500); }
        });
    }
    return throttle.add(() => {
        const xhr = fetch(ROOT + '/serv/' + url, {
            method: config.method,
            headers: { 'X-Db-Connection-Id': dbConnId },
            body: formData
        }).then(async response => {
            if (response.status !== 200) {
                const error = await response.text();
                countError();
                if (!(toReload || muted)) {
                    if (window.confirm("The server rejected request " + config.url + ". Do you want to reload the program? Information: " + error)) {
                        toReload = true; // prevent future alerts before redirecting is actually executed by the browser
                        window.location.href = "/";
                    }
                }
                throw new Error(error || 'Unknown');
            }
            return response;
        }, e => { window.alert('Network failure.'); throw e; });
        return config.blob ? xhr.then(res => res.blob()) : xhr.then(res => res.json());
    });
};

export const loadImage = (response: Blob, opt_onload?: (ev: Event) => void, opt_onerror?: (ev: any) => void): HTMLImageElement => {
    const image = new Image();
    const url = window.URL.createObjectURL(response);
    const onload = opt_onload || (() => void 0);
    const onerror = opt_onerror || (() => void 0);
    image.onload = function (ev) {
        window.URL.revokeObjectURL(url);
        onload.call(this, ev);
    };
    image.onerror = function (ev) {
        window.URL.revokeObjectURL(url);
        onerror.call(this, ev);
    };
    image.src = url;
    return image;
};
