import { concatRegex } from "./func";


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
 * Matches common separators like spaces and snake-case segments
 */
export const STR_SEPARATOR_REGEX = new RegExp(` +|(?:${SNAKE_SEGMENT_REGEX.source})`, 'gi');

/**
 * Matches search results page.
 */
export const SEARCH_RESULTS_PAGE_REGEX =
	/^https:\/\/f95zone.to\/search\/(?:\d+)/i;

/**
 * Regex for common delimiters of media downlaods
 */
export const SEARCH_TOKEN_DELIMIT_REGEX = /[^a-zA-Z0-9 ]/g;

/**
 * Matches version numbers including ones written as
 * v1.0.23, Version-0.2.1, or ver 2.32.134.12356.
 *
 * Reference with great name:
 * https://ihateregex.io/expr/semver/
 */
export const VERSION_NUMBER_REGEX = 
	/(v(e(r(s(i(o(n)?)?)?)?)?)?)?(?:[ .]|(?:(?<=.)[_-]+|[_-]+(?=.)))?(\d+)\.(\d+)(?:\.\d+(?:\.\d+)?)?/i;

/**
 * Matches dates formatted year-month-day (dashes optional).
 * Most media downloads I've seen follow this format with their files for some reason.
 */
export const YEAR_MONTH_DAY_REGEX =
	new RegExp(
		`(?:20\\d{2})(?:${SNAKE_SEGMENT_REGEX.source})?` + 
		`(?:\\d{2})?(?:${SNAKE_SEGMENT_REGEX.source})?(?:\\d{2})?`,
	'gi');

export const YEAR_TO_YEAR_RANGE_REGEX = 
	new RegExp(`\\d{4}(?:${STR_SEPARATOR_REGEX.source})?\\d{4}`, 'gi');
	
export const MONTH_TO_MONTH_RANGE_REGEX =
	new RegExp(`(?:\\d{4})?(?:${STR_SEPARATOR_REGEX.source})?\\d{2}(?:(?:(?:${STR_SEPARATOR_REGEX.source})?up)?(?:${STR_SEPARATOR_REGEX.source})?to(?:${STR_SEPARATOR_REGEX.source})?)?(?:\\d{4})?\\d{2}`, 'gi');

/**
 * Matches date ranges which a lot of comics/stills 
 * and animation collections use in their file names
 */
export const DATE_RANGE_REGEX =
	// /(\d{4})(?:(?<=.)[_-]+|[_-]+(?=.))?(\d{2})?(?:(?<=.)[_-]+|[_-]+(?=.))?(\d{2})?(?:(?<=.)[_-]+|[_-]+(?=.))?(\d{4})(?:(?<=.)[_-]+|[_-]+(?=.))?(\d{2})?(?:(?<=.)[_-]+|[_-]+(?=.))?(\d{2})?/gi;
		
	new RegExp(`(?:${YEAR_MONTH_DAY_REGEX.source})(?:(?:(?:${STR_SEPARATOR_REGEX.source})?up)?(?:${STR_SEPARATOR_REGEX.source})?to(?:${STR_SEPARATOR_REGEX.source})?)?(?:${YEAR_MONTH_DAY_REGEX.source})`, 'gi');

	// [
	// 	new RegExp(`(?:${YEAR_MONTH_DAY_REGEX.source})(?:(?:(?:${STR_SEPARATOR_REGEX.source})?up)?(?:${STR_SEPARATOR_REGEX.source})?to(?:${STR_SEPARATOR_REGEX.source})?)?(?:${YEAR_MONTH_DAY_REGEX.source})`, 'gi'),

	// 	// YEAR_TO_YEAR_RANGE_REGEX,
	// 	MONTH_TO_MONTH_RANGE_REGEX		
	// ].reduce((p, c) => concatRegex(p, c))

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
 * Matches thread page URLs
 */
export const THREAD_URL_REGEX = /^https:\/\/f95zone.to\/threads\//i;

/**
 * Matches just the name part of a thread link's URL
 */
export const THREAD_URL_TITLE_REGEX = 
	new RegExp(`(?<=${THREAD_URL_REGEX.source})[^.]+(?=\.)`, 'i');
	
/**
 * Matches mediaId contained within a thread page's URL.
 * FIXME? idky but for some reason the global tag really messes this up
 * when scraping search results. It's fine without it since there should only be
 * 1 match anyway but :/.
 */
export const THREAD_LINK_MEDIA_ID_REGEX = 
	/(?:(?<=(?:https:\/\/f95zone.to\/)?threads\/[^.]+\.)\d+|(?<=(?:https:\/\/f95zone.to\/)?threads\/)\d+)(?=\/?(?:.+)$)/i;

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
 * It's just R(G|J|E){combination of numbers}
 * honestly, I've yet to figure out the second letter and
 * why it's different sometimes.
 */
export const DLSITE_CODE_REGEX = /R(?:G|J|E)\d+/i;

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


/**
 * Combined list of details often included in downloaded files
 * that aren't the name of the Media: release date, version, platform, etc.
 * 
 * The main purpose of this is to filter parts of imported downloads' names
 * that may make their search less effective because of how strict f95's searching is.
 * 
 * Each of these is a separate item wherever possible so that they can be 'joined' 
 * with a RegExp that puts an optional snake-case segment between them.
 * 
 * **NOTES ON ADDING MORE** 
 * Don't bother adding tags since their combination just uses 'gi' tags.
 * When using the snake segment regex as part of an item, make sure to use its 'source'.
 */
export const IMPORT_TOKEN_BLACKLIST = new Set<RegExp>([
	// Platform
	new RegExp(`win(?:dows)?(?:${STR_SEPARATOR_REGEX.source})?(?:\\d{2})?`, 'i'),
	/linux/,
	/f95(?:zone)/,
	/pc/,
	/patreon/,
	/steam/,
	
	// Release status
	/demo/,
	/final/,
	/public/,
	/release/,
	new RegExp(`update(?:${STR_SEPARATOR_REGEX.source})?\\d*`, 'i'),
	/complete/,
	new RegExp(`not(?:${STR_SEPARATOR_REGEX.source})?complete`, 'i'),
	new RegExp(`up(?:${STR_SEPARATOR_REGEX.source})?to`, 'i'),
	new RegExp(`until(?:${STR_SEPARATOR_REGEX.source})?${YEAR_MONTH_DAY_REGEX.source}`, 'i'),
	new RegExp(`build(?:${STR_SEPARATOR_REGEX.source})?` + /\d+/.source, 'i'),
	new RegExp(`member(?:${STR_SEPARATOR_REGEX.source})?` + /version/.source, 'i'),
	new RegExp(`all(?:${STR_SEPARATOR_REGEX.source})?in(?:${STR_SEPARATOR_REGEX.source})?one`, 'i'),
	VERSION_NUMBER_REGEX,
	YEAR_MONTH_DAY_REGEX,
	DATE_RANGE_REGEX,
	PART_REGEX,
	WINDOWS_COPY_REGEX,
	MONTH_REGEX,
	VOLUME_REGEX,
	
	// Misc
	/collection/,
	/m?tl/,
	/uncensored/,
	/dlc/,
	/cracked/,
	/copy/,
	/demo/,
	/animations?/,
	/assorted/,
	/comp(?:ressed)?/,
	/launcher/,
	/archives?/,
]);


/**
 * Matches a detail suffix which many download files and thread titles use.
 * It's essentially just checking if the tail-end of a string contains nothing
 * but blacklisted terms.
 * 
 * Something like XX_Collection_up_to_Mar-2020.
 */
export const DETAIL_SUFFIX_REGEX = new RegExp('(?<=.)' +
	`(?:(?:${STR_SEPARATOR_REGEX.source})?` +
	`(?:${Array.from(IMPORT_TOKEN_BLACKLIST).reduce((p, c) => concatRegex(p, c, '|')).source})` +
	`(?:${STR_SEPARATOR_REGEX.source})?)+` +
'$', 'gi');

// DEBUG
// console.log('Complete regex:', DETAIL_SUFFIX_REGEX.source);

export default {
	UPPER_CASE_SPLIT_REGEX, SNAKE_SEGMENT_REGEX, SEARCH_RESULTS_PAGE_REGEX,
	SEARCH_TOKEN_DELIMIT_REGEX, VERSION_NUMBER_REGEX,
	YEAR_MONTH_DAY_REGEX, DATE_RANGE_REGEX, WINDOWS_COPY_REGEX,
	NUMBER_NO_PRECEDING_REGEX, PART_REGEX, VOLUME_REGEX,
	THREAD_URL_REGEX, THREAD_URL_TITLE_REGEX, THREAD_LINK_MEDIA_ID_REGEX,
	INSIDE_BRACKETS_REGEX, FORUM_REGEX, EXE_FILENAME_REGEX,
	DLSITE_CODE_REGEX, MONTH_REGEXES, MONTH_REGEX,
	HEX_COLOR_REGEX, RGB_REGEX, STR_SEPARATOR_REGEX,
	IMPORT_TOKEN_BLACKLIST, DETAIL_SUFFIX_REGEX,
}
