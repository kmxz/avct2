import { AvctTableElement } from './table';
import { AvctClipScoreElement, AvctClipNameElement, AvctClipsElement } from './clips';
import { AvctTagListElement } from './tags';
import { unsafeStatic } from 'lit-html/static.js';

// Note: this file can be replaced w/ an annotation once https://github.com/microsoft/TypeScript/issues/40805 is done.

export type StaticTagName = ReturnType<typeof unsafeStatic>;

export const AvctTableElementKey = 'avct-table';
export const AvctClipsElementKey = 'avct-clips';
export const AvctClipNameElementKey = 'avct-clip-name';
export const AvctClipTagsElementKey = 'avct-clip-tags';
export const AvctClipScoreElementKey = 'avct-clip-score';
export const AvctTagListElementKey = 'avct-tag-list';

export const AvctTable = unsafeStatic(AvctTableElementKey);
export const AvctClips = unsafeStatic(AvctClipsElementKey);
export const AvctClipName = unsafeStatic(AvctClipNameElementKey);
export const AvctClipTags = unsafeStatic(AvctClipTagsElementKey);
export const AvctClipScore = unsafeStatic(AvctClipScoreElementKey);
export const AvctTagList = unsafeStatic(AvctTagListElementKey);

declare global {
    interface HTMLElementTagNameMap {
        [AvctTableElementKey]: AvctTableElement<any>;
        [AvctClipsElementKey]: AvctClipsElement;
        [AvctClipNameElementKey]: AvctClipNameElement;
        [AvctClipScoreElementKey]: AvctClipScoreElement;
        [AvctTagListElementKey]: AvctTagListElement;
    }
  }
  