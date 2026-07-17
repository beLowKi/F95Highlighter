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
 * Finds splits for camel- and title-case strings.
 * https://stackoverflow.com/a/7594052/32075069
 */
// export const UPPER_CASE_SPLIT_REGEX = /(?<!(^|[A-Z]))(?=[A-Z])|(?<!^)(?=[A-Z][a-z])/g;
// export const UPPER_CASE_SPLIT_REGEX = /(?<!(^|[A-Z]))(?=[A-Z])|(?<!)(?=[A-Z][a-z])/gm;
export const UPPER_CASE_SPLIT_REGEX =
	/(?<!(^|[A-Z\.-_]))(?=[A-Z])|(?<!)(?=[A-Z][a-z])/;

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
export const SEARCH_TOKEN_DELIMIT_REGEX = /[-_\[\]\(\)]/;

/**
 * Matches version numbers including ones written as
 * v1.0.23, Version-0.2.1, or ver 2.32.134.12356.
 *
 * Reference with great name:
 * https://ihateregex.io/expr/semver/
 */
export const VERSION_NUMBER_REGEX =
	/(v(e(r(s(i(o(n)?)?)?)?)?))?[^a-zA-Z]?(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?(\.\d*)?/i;

/**
 * Matches dates formatted year-month-day (dashes optional).
 * Most media downloads I've seen follow this format with their files for some reason.
 */
export const YEAR_MONTH_DAY_REGEX =
	/(?<=[^0-9])(\d{4})(?:[^0-9])?(\d{2})(?:[^0-9])?(\d{2})(?![0-9])/;

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
export const PART_REGEX = /(?<=.*)(?:(?:part|pt(?:\.)?))(?:\D)?(\d+)/i;

/**
 * Matches strings like XXX_vol-1, XXX_volume. 5, and XXX_volu.-123
 */
export const VOLUME_REGEX =
	/(?:vol(?:u(?:m(?:e)?)?)?)(\.)?(?:\D)?\d+(?:\D)?\d+/i;

/**
 * Matches mediaId contained within a thread page's URL.
 */
export const THREAD_LINK_MEDIA_ID_REGEX = /(?<=\.)\d+(?=\/?$)/;

/**
 * Matches anything inside brackets (including brackets)
 */
export const INSIDE_BRACKETS_REGEX = /\[([^\]]*)\]/;

/**
 * Extracts Forum
 */
export const FORUM_REGEX = /(?<=Forum:\s)[^0-9]+$/i;

// export default {
//     EXT_NAME,
//     BASE_SEARCH_URL, EX_SEARCH_PARAMS,
//     SEARCH_TOKEN_BLACKLIST, SEARCH_TOKEN_DELIMIT_REGEX,
//     VERSION_NUMBER_REGEX, YEAR_MONTH_DAY_REGEX,
// };
