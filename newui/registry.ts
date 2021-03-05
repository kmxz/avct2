import { unsafeStatic } from 'lit-html/static.js';

// Note: this file can be replaced w/ an annotation once https://github.com/microsoft/TypeScript/issues/40805 is done.

export type StaticTagName = ReturnType<typeof unsafeStatic>;

export const AvctTableElementKey = 'avct-table';
export const AvctClipsElementKey = 'avct-clips';
export const AvctClipNameElementKey = 'avct-clip-name';
export const AvctClipTagsElementKey = 'avct-clip-tags';
export const AvctClipScoreElementKey = 'avct-clip-score';
export const AvctClipRaceElementKey = 'avct-clip-race';
export const AvctClipRoleElementKey = 'avct-clip-role';
export const AvctClipNoteElementKey = 'avct-clip-note';
export const AvctTagListElementKey = 'avct-tag-list';
export const AvctCtxMenuElementKey = 'avct-ctx-menu';
export const AvctRaceSelectionElementKey = 'avct-race-selection';
export const AvctRoleSelectionElementKey = 'avct-role-selection';
export const AvctToastContainerElementKey = 'avct-toast-container';

export const AvctTable = unsafeStatic(AvctTableElementKey);
export const AvctClips = unsafeStatic(AvctClipsElementKey);
export const AvctClipName = unsafeStatic(AvctClipNameElementKey);
export const AvctClipTags = unsafeStatic(AvctClipTagsElementKey);
export const AvctClipScore = unsafeStatic(AvctClipScoreElementKey);
export const AvctClipRace = unsafeStatic(AvctClipRaceElementKey);``
export const AvctClipRole = unsafeStatic(AvctClipRoleElementKey);
export const AvctClipNote = unsafeStatic(AvctClipNoteElementKey);
export const AvctTagList = unsafeStatic(AvctTagListElementKey);
export const AvctCtxMenu = unsafeStatic(AvctCtxMenuElementKey);
export const AvctRaceSelection = unsafeStatic(AvctRaceSelectionElementKey);
export const AvctRoleSelection = unsafeStatic(AvctRoleSelectionElementKey);
export const AvctToastContainer = unsafeStatic(AvctToastContainerElementKey);