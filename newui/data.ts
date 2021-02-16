import { send } from './api';

export const clips = send('clip/list');
export const players = send('players');
export const tags = send('tag/list');

