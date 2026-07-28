import { createLowlight, common } from 'lowlight';

/**
 * Shared lowlight instance for the Tiptap code-block extension — the `common` language subset
 * (js/ts/python/php/css/html/json/bash/sql among others), not the full grammar set, to keep the
 * editor's lazy-loaded bundle reasonable per the performance requirement.
 */
export const lowlight = createLowlight(common);
