import { MediaDownload, type ConflictResolutionPolicy } from "types/data";
import { HEX_COLOR_REGEX } from "./const";
import z from "zod";


// This weird thing is a makeshift workaround
// for a known issue with Bun's building:
// https://github.com/oven-sh/bun/issues/31586
//
// TL;DR -> importing the schema from another file doesn't work here
const RGBHexString = z.string().refine(v => HEX_COLOR_REGEX.test(v), { message: 'Invalid RGB hex' });


/**
 * User settings
 */
export const Settings = z.strictObject({
    strictMode:         z.boolean().or(z.literal(['true', 'false', '0', '1']).transform(v => {
        switch (v) {
            case 'true':
            case '1':
                return true;
        
            case 'false':
            case '0':
                return false;
        }
    })),
    searchDepth:		z.coerce.number(),

    /**
     * Colors used to highlight media tiles
     */
    highlights:				z.strictObject({
        uncertainColor:			RGBHexString,
        highCertaintyColor: 	RGBHexString,
        midCertaintyColor: 		RGBHexString,
        lowCertaintyColor: 		RGBHexString,
    })
});

export type Settings = z.infer<typeof Settings>;


/**
 * Local Storage structure
 */
export const LocalStorage = z.strictObject({
	downloads: z.record(z.coerce.number(), MediaDownload),
	settings: Settings,
});

export type LocalStorage = z.infer<typeof LocalStorage>;


/**
 * Extension name
 * TBD loading this from manifest?
 */
export const EXT_NAME = "f95Highlighter";

/**
 * Default user settings set on initialization.
 */
export const DEFAULT_SETTINGS: Settings = {
    strictMode: false,
    searchDepth: 5,
    highlights: {
        uncertainColor:		'#FF0000',
        lowCertaintyColor: 	'#FF7700',
        midCertaintyColor: 	'#FFFF00',
        highCertaintyColor:	'#00FF00'
    }
};

/**
 * Descriptions of what each setting does.
 */
export const SETTINGS_DESCRIPTIONS: Record<keyof Settings, string> = {
    strictMode: "Searches titles and first posts only when importing. This greatly reduces success rate but increases average certainty.",
    searchDepth: "Number of top search results checked per imported download",
    highlights: "Colors marking known downloads"
};

/**
 * Keys used for local storage
 */
export const LOCAL_STORAGE_KEYS = {
    DOWNLOADS: "downloads",
    SETTINGS: "settings",
} as const;

/**
 * Descriptions of every conflict resolution policy.
 * These are mostly used by the dialogue asking the user
 * how duplicate downloads should be handled
 */
export const CONFLICT_POLICY_DESCRIPTIONS: Record<ConflictResolutionPolicy, string> = {
    SKIP: "Skips duplicates; uses first new download if no existing one.",
    KEEP_MOST_CERTAIN: "Uses the download that matched its f95 media with the highest confidence.",
    REPLACE: "Uses newest download"
} as const;

/**
 * Max number of concurrent Media 
 * search queries when importing downloads.
 * 
 * This was chosen arbitrarily after testing how high it can
 * get before f95 starts sending error responses.
 */
export const CONCURRENT_SEARCH_LIMIT = 8;

/**
 * Default timeout for media queries after which
 * a they're considered to have failed.
 */
export const MEDIA_QUERY_TIMEOUT = 2300;

/**
 * Stores internally-relevant constants like
 * default settings and storage structure.
 */
export default {
    Settings, LocalStorage,
    
    EXT_NAME, DEFAULT_SETTINGS, LOCAL_STORAGE_KEYS,
    CONFLICT_POLICY_DESCRIPTIONS,
    CONCURRENT_SEARCH_LIMIT, MEDIA_QUERY_TIMEOUT,
}
