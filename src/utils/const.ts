import { concatRegex } from "./func";
import type { ConflictResolutionPolicy, Settings } from "types/data";

/**
 * Default user settings set on initialization.
 */
export const DEFAULT_SETTINGS: Settings = {
	searchSampleSize: 5,
	highlights: {
		uncertainColor:		'#FF0000',
		lowCertaintyColor: 	'#FF7700',
		midCertaintyColor: 	'#FFFF00',
		highCertaintyColor:	'#00FF00'
	}
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
 * search queries when importing downloads 
 */
export const CONCURRENT_SEARCH_LIMIT = 8;

/**
 * Extension name
 * TBD loading this from manifest?
 */
export const EXT_NAME = "f95Highlighter";

/**
 * Base URL for search results page. Combined with params like query (q), this
 * can search F95 Media.
 *
 * Reference: https://f95zone.to/search/{cache entry id?}/?q={search query}&c[container_only]=1&o=relevance
 *      c[container_only]=1 Marks "Search first posts and titles only"
 *      c[content]=thread only returns thread pages
 *      o=relevance orders the results by relevance.
 *
 * There's a number after /search/ which someone else on f95 guessed might be
 * a cache entry ID? Without it, you're sent to the search form page instead of results,
 * but apparently giving any number > 0 will auto-correct to the valid number.
 */
export const BASE_SEARCH_URL = "https://f95zone.to/search/1/";

/**
 * Extra parameters that help narrow search requests a bit
 */
export const EX_SEARCH_PARAMS = "c[title_only]=1&o=relevance";

/**
 * Search parameter that filters for game threads
 */
export const SEARCH_GAME_FILTER = 'c[child_nodes]=1&c[nodes][0]=2';

/**
 * Finds splits for camel- and title-case strings.
 * https://stackoverflow.com/a/7594052/32075069
 */
export const UPPER_CASE_SPLIT_REGEX =
	/(?<!(^|[A-Z\.-_]))(?=[A-Z])|(?<!)(?=[A-Z][a-z])/;

/**
 * Matches snake-case segments. Works with hyphens as well.
 */
export const SNAKE_SEGMENT_REGEX = /(?<=.)[_-]+|[_-]+(?=.)/g;

/**
 * Matches search results page.
 */
export const SEARCH_RESULTS_PAGE_REGEX =
	/^https:\/\/f95zone.to\/search\/(?:\d+)/i;

/**
 * Common tokens in downloadable files that make finding their respective
 * Media more difficult. These are usually OS, platform, language,
 * or some other bonus detail that isn't in the title of most Media's thread.
 */
export const SEARCH_TOKEN_BLACKLIST = new Set([
	// Platform
	"f95",
	"f95zone",
	"f95cracked",
	"pc",
	"patreon",
	"steam",
	"steamdlc",

	// Misc modifiers
	"uncensored",
	"dlc",
	"cracked",
	"collection",
	"copy",

	// OS
	"windows",
	"win",
	"linux",
	"window",
	"win64",
	"win32",

	// Language
	"tl",
	"mtl",
	"english",
	"eng",
	"japanese",
	"jpn",

	// Status
	"complete",
	"demo",
	"final",
	"public",
	"release",
	"update",
	"build",
	"memberversion",
]);

/**
 * Regex for common delimiters of media downlaods
 */
// export const SEARCH_TOKEN_DELIMIT_REGEX = /[-_\[\]\(\)\/\\]/g;
export const SEARCH_TOKEN_DELIMIT_REGEX = /[^a-zA-Z0-9 ]/g;

/**
 * Matches version numbers including ones written as
 * v1.0.23, Version-0.2.1, or ver 2.32.134.12356.
 *
 * Reference with great name:
 * https://ihateregex.io/expr/semver/
 */
export const VERSION_NUMBER_REGEX = 
	/(v(e(r(s(i(o(n)?)?)?)?)?)?)?(?: |(?:(?<=.)[_-]+|[_-]+(?=.)))?(\d+)\.(\d+)(?:\.\d+(?:\.\d+)?)?/gi;

/**
 * Matches dates formatted year-month-day (dashes optional).
 * Most media downloads I've seen follow this format with their files for some reason.
 */
export const YEAR_MONTH_DAY_REGEX =
	// /(?<=[^0-9])(\d{4})(?:[^0-9])?(\d{2})(?:[^0-9])?(\d{2})(?![0-9])/;
	/(\d{4})\D*(\d{2}(?!\d))?\D*(\d{2}(?!\d))?/g;

/**
 * Matches date ranges which a lot of comics/stills 
 * and animation collections use in their file names
 */
export const DATE_RANGE_REGEX =
	new RegExp(`${YEAR_MONTH_DAY_REGEX.source}(?:${SNAKE_SEGMENT_REGEX.source})?${YEAR_MONTH_DAY_REGEX.source}`, 'gi');
	
/**
 * Matches copied folders based on how Windows formats their names
 */
export const WINDOWS_COPY_REGEX = /- Copy \((\d*)\)$/i;

/**
 * Matches numbers without preceding characters.
 */
export const NUMBER_NO_PRECEDING_REGEX = /(?<!.)\d+/;

/**
 * Matches strings like XXX_Part-5, XXX pt.4, and XXX pt_123
 */
export const PART_REGEX = /(?<=.)(?:(?:part|pt(?:\.)?))(?:\D)?(\d+)/i;

/**
 * Matches strings like XXX_vol-1, XXX_volume. 5, and XXX_volu.-123
 */
export const VOLUME_REGEX =
	/(?:vol(?:u(?:m(?:e)?)?)?)(\.)?(?:\D)?\d+(?:\D)?\d+/i;

/**
 * Matches mediaId contained within a thread page's URL.
 * FIXME? idky but for some reason the global tag really messes this up
 * when scraping search results. It's fine without it since there should only be
 * 1 match anyway but :/.
 */
// export const THREAD_LINK_MEDIA_ID_REGEX = /(?<=\.)\d+(?=\/?$)/;  // OLD 
export const THREAD_LINK_MEDIA_ID_REGEX = /(?<=^(?:https:\/\/f95zone.to)?\/?threads\/[^.]+\.)\d+(?=\/?(?:post-\d+)?$)/i;

/**
 * Matches anything inside brackets (including brackets)
 */
export const INSIDE_BRACKETS_REGEX = /\[([^\]]*)\]/;

/**
 * Extracts Forum
 */
export const FORUM_REGEX = /(?<=Forum:\s)[^0-9]+$/i;

/**
 * Matches valid executable file names
 */
export const EXE_FILENAME_REGEX = /.+\.exe$/gi;

/**
 * Matches DLSite codes which a lot of 
 * games will include in their filenames.
 * 
 * It's just RJ{combination of numbers}
 */
export const DLSITE_CODE_REGEX = /RJ\d+/gi;

/**
 * Contains month-name-matching regexes
 */
export const MONTH_REGEXES = {
	JANUARY:  /(?:jan(?:uary)?)/gi,
	FEBRUARY: /(?:feb(?:ruary)?)/gi,
	MARCH:    /(?:mar(?:ch)?)/gi,
	APRIL:    /(?:apr(?:il)?)/gi,
	MAY:      /may/gi,
	JUNE:     /(?:jun(?:e)?)/gi,
	JULY:     /(?:jul(?:y)?)/gi,
	AUGUST:   /(?:aug(?:ust)?)/gi,
	SEPTEMBE: /(?:sep(?:t(?:ember)?)?)/gi,
	OCTOBER:  /(?:oct(?:ober)?)/gi,
	NOVEMBER: /(?:nov(?:ember)?)/gi,
	DECEMBER: /(?:dec(?:ember)?)/gi,
} as const;

/**
 * Matches any month name
 */
export const MONTH_REGEX = Object.values(MONTH_REGEXES).reduce((p, c) => concatRegex(p, c));

/**
 * Matches hex color strings like #00ff00
 * Adding [0-9a-f]{3} supports 3-number
 */
export const HEX_COLOR_REGEX = /(?<!.)#(?:[0-9a-f]{6})(?!.)/i;

/**
 * Matches rgb strings like rgb(255, 12, 123)
 */
export const RGB_REGEX = /(?<!.)rgb\(([0-2]?(?:[0-4]?[0-9]|5[0-5])), ?([0-2]?(?:[0-4]?[0-9]|5[0-5])), ?[0-2]?(?:[0-4]?[0-9]|5[0-5])\)(?!.)/i;

// Don't worry about this
const THREAD_TITLE_TOKEN_BLACKLIST = new Set<RegExp>([
	/collection|m?tl|f95(?:zone|cracked)?|pc|patreon|steam(?:dlc)?|uncensored|dlc|cracked/gi,
	/copy|win(?:dows)?|linux|win(?:\d{2})?|demo|final|public|release|update|build/gi,
	/member(?:\D+)?version|animations?|assorted|compressed/gi,
	new RegExp(`all(?:${SNAKE_SEGMENT_REGEX.source})?in(?:${SNAKE_SEGMENT_REGEX.source})?one`, 'gi'),
	new RegExp(`(?:not)?(?:${SNAKE_SEGMENT_REGEX.source})?complete`, 'gi'),
	PART_REGEX,
	VERSION_NUMBER_REGEX,
	YEAR_MONTH_DAY_REGEX,
	MONTH_REGEX,
	DATE_RANGE_REGEX,
	/up(?:${SNAKE_SEGMENT_REGEX.source})?to/gi,
	new RegExp(`until(?:${SNAKE_SEGMENT_REGEX.source})?${YEAR_MONTH_DAY_REGEX.source}`, 'gi'),
	VOLUME_REGEX
]);


// console.log('Concated suffix regex: ', Array.from(THREAD_TITLE_TOKEN_BLACKLIST).reduce((p, c) => concatRegex(p, c, '|')).source);

/**
 * Matches a detail suffix which many download files and thread titles use.
 * It's essentially just checking if the tail-end of a string contains nothing
 * but blacklisted terms.
 * 
 * Something like XX_Collection_up_to_Mar-2020.
 */
export const DETAIL_SUFFIX_REGEX = new RegExp('(?<=.)' +
	`(?:(?:${SNAKE_SEGMENT_REGEX.source})?` +
	`(?:${Array.from(THREAD_TITLE_TOKEN_BLACKLIST).reduce((p, c) => concatRegex(p, c, '|')).source})` +
	`(?:${SNAKE_SEGMENT_REGEX.source})?)+` +
'$', 'gi');

// console.log('Complete regex:', DETAIL_SUFFIX_REGEX.source);
