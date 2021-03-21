// Copied from original; not adopted to TS.

import Throttle from './throttle';
import { handle } from './fake';
import { globalToast } from './components/toast';

const FAKE = true;
const ROOT = 'http://192.168.1.5:8080';

const uuidRegex = /[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89aAbB][a-f0-9]{3}-[a-f0-9]{12}/;
const dbConnId = window.location.search.substring(1);

if (!FAKE && !uuidRegex.test(dbConnId)) {
    window.alert('DB connection unspecified.');
}

const throttle = new Throttle(8); // only allow 10 parallel XHR requests to avoid Chrome fail.

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
    'clip/open': {method: 'post', url: 'clip/$/open', params: ['record', 'player']},
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
        return handle(api, opt_params);
    }
    return throttle.add(() => {
        const xhr = fetch(ROOT + '/serv/' + url, {
            method: config.method,
            headers: { 'X-Db-Connection-Id': dbConnId },
            body: formData
        }).then(async response => {
            if (response.status !== 200) {
                const error = await response.text();
                globalToast(`The server rejected request ${config.url}. Information: ${error}`);
                throw new Error(error || 'Unknown');
            }
            return response;
        }, e => { globalToast('Network failure'); throw e; });
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
