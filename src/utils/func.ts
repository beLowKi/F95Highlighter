import { LocalStorage, Media, MediaDownload, MediaType, SearchResult, Settings } from "types/data.ts";
import type { ScrapeSearchResultsMessage, UserNotLoggedInMessage } from "types/message";

import {
	BASE_SEARCH_URL,
	DEFAULT_SETTINGS,
	DETAIL_SUFFIX_REGEX,
	DLSITE_CODE_REGEX,
	EX_SEARCH_PARAMS,
	FORUM_REGEX,
	HEX_COLOR_REGEX,
	LOCAL_STORAGE_KEYS,
	NUMBER_NO_PRECEDING_REGEX,
	SEARCH_TOKEN_DELIMIT_REGEX,
	SNAKE_SEGMENT_REGEX,
	THREAD_LINK_MEDIA_ID_REGEX,
	UPPER_CASE_SPLIT_REGEX,
} from "utils/const";
import z from "zod";


/**
 * Scrapes the Media of a thread page.
 * This returns null if the scraping failed.
 */
export function getThreadMedia(src: Document | string): Media | null {
	const document: Document = ( typeof src === 'string' )
		? (new DOMParser()).parseFromString(src, 'text/html')
		: src;
	
	// Getting mediaId from URL
	const idMatches = THREAD_LINK_MEDIA_ID_REGEX.exec(document.URL);
	if ( idMatches === null || idMatches.length !== 1 ) {
		console.error(`Failed to extract Media ID from URL ${document.URL}`);
		return null;
	}
	
	const mediaId = Number(idMatches[0]);
	if ( isNaN(mediaId) ) {
		console.error(`Extracted NaN Media ID from URL ${document.URL}`);
		return null;
	}
	
	// Getting thread title
	const titleEl = document.querySelector('div.pageContent div.p-title h1.p-title-value');
	if ( titleEl === null ) {
		console.error('Failed to find title element');
		return null;
	}

	// Most titles have preceding tags like game engine or completion status, so,
	// to get just the title of the Media, you can get the last child node.
	const title = titleEl.childNodes.item(titleEl.childNodes.length - 1).textContent;
	if ( title === null ) {
		console.error('Failed to extract title\'s text content from element ', titleEl.textContent);
		return null;
	}

	// Getting mediaType from forum name
	const forumEl = document.querySelector('div.pageContent ul.p-breadcrumbs');
	if ( forumEl === null ) {
		console.error('Failed to find forum element');
		return null;
	}
	
	// DEBUG
	// console.log('Found forum breadcrumb as ', forumEl.textContent);
	
	// There's a whole bunch of whitespace between crumbs, so this removes all that
	const forumCrumbs = Array.from(forumEl.childNodes)
		.filter( c => !!c.textContent && c.textContent.trim().length > 0)
		.map(c => c.textContent!.trim().toUpperCase());
	
	// ditto ^ sort of; this element is a breadcrumb and 
	// the element with the forum text is the last child
	const forumText = forumCrumbs.at(-1);
	if ( !!!forumText ) {
		console.error(`Failed to extract forum's text content from element ${forumEl.textContent}`);
		return null;
	}
	
	const { data: mediaType, error, success } = MediaType.safeParse(forumText);
	if ( !success ) {
		console.error(`Extracted forum text ${forumText} failed MediaType model:\n${error.message}`);
		return null;
	}
	
	return {
		mediaId,
		title,
		mediaType,
		threadLink: document.URL,
	};
}  


/**
 * Returns the tab currently in focus.
 */
export async function getCurrentTab(): Promise<chrome.tabs.Tab> {
	let queryOptions = { active: true, currentWindow: true };
	let [tab] = await chrome.tabs.query(queryOptions);
	return tab;
}


/**
 * Truncates a string to, at most, a certain length
 */
export function truncateStr(
	str: string, 
	length: number,
	cutoff: string = '...'
): string {

	const maxLength = Math.max(0, (length - cutoff.length));
	
	return ( str.length > maxLength )
        ? `${str.slice(0, maxLength)}${cutoff}`
        : str;
}


/**
 * Returns whether the popup is currently active
 */
export function isPopupActive(): boolean {
	const views = chrome.extension.getViews({ type: 'popup' });
	return views.length > 0;
}


/**
 * Returns MediaDownloads from storage.
 * 
 * TBD on if this should just re-init downloads if they're missing from storage
 * instead of every call to this func having to check if it returned null.
 */
export async function getUserDownloads(): Promise<LocalStorage['downloads']> {
	let storage: any;

	// NOTE an Error is thrown when getting keys that don't exist
	try {
		storage = (await chrome.storage.local.get(LOCAL_STORAGE_KEYS.DOWNLOADS)).downloads;
		
	} catch (error) {
		// console.error(`Attempted to get user downloads before it was initialized`);

		// Re-initializing
		await chrome.storage.local.set({[LOCAL_STORAGE_KEYS.DOWNLOADS]: {}});
		
		storage = {};
	}
	
	// Validating
	const { data: downloads, error, success } = LocalStorage.shape.downloads.safeParse(storage);
	if ( !success ) {
		throw new Error(`Broken download storage:\n${error.message}\n${JSON.stringify(storage, null, 2)}`);
	}

	return downloads;
}


/**
 * Returns user settings.
 */
export async function getUserSettings(): Promise<Settings> {
	let storage: any;

	// This looks weird because chrome.storage gets return the full
	// { [key]: value } object instead of just the value the key points to,
	// so you have to access the key twice.
	try {
		storage = (await chrome.storage.local.get(LOCAL_STORAGE_KEYS.SETTINGS))[LOCAL_STORAGE_KEYS.SETTINGS];

	} catch (error) {
		await chrome.storage.local.set({
			[LOCAL_STORAGE_KEYS.SETTINGS]: DEFAULT_SETTINGS
		});

		storage = DEFAULT_SETTINGS;
	}

	// Validating against model
	const { data: settings, error, success } = Settings.safeParse(storage);
	if ( !success ) {
		throw new Error(`Error: settings in broken state:\n${error.message}`);
	}

	return settings;
}


/**
 * Sets Object value along a nested path--creating
 * all necessary properties for it to exist.
 * This modifies the given object and returns a reference to it.
 */
export function nestedSet(target: any, path: string, value: any): any {
	const keys = path.split(".");

	keys.reduce((acc, key, index) => {
		// On last key, assign value
		if (index === keys.length - 1) {
			acc[key] = value;
		} else {
			if (!acc[key] || typeof acc[key] !== "object") {
				acc[key] = {};
			}
		}

		return acc[key];
	}, target);

	return target;
}


/**
 * Concatenates two regular expressions without duplicating flags.
 * 'delimiter' determines if they're combined as a union (OR) or
 * an intersection (AND).
 *
 * @param { RegExp } r1
 * @param { RegExp } r2
 * @param { '|' | ' ' } delimiter
 *
 * @returns { RegExp }
 */
export function concatRegex(r1: RegExp, r2: RegExp, delimiter = "|"): RegExp {
	if (!(r1 instanceof RegExp && r2 instanceof RegExp)) {
		throw TypeError("'r1' and 'r2' must both be RegExp");
	}

	if ( !(delimiter === "|" || delimiter === " ") ) {
		throw TypeError("'delimiter' must be either '|' or a space");
	}

	// ref: https://www.geeksforgeeks.org/javascript/how-to-concatenate-regex-literals-in-javascript/
	const flags = (r1.flags + r2.flags)
		.split("")
		.sort()
		.join("")
		.replace(/(.)(?=.*\1)/g, "");

	// console.log(`Combined flags ${r1.flags} and ${r2.flags} into ${flags}`);
	
	const out = new RegExp(r1.source + delimiter + r2.source, flags);
		
	// console.log(`concatenated ${r1} and ${r2} into ${out}`);

	return out;
}


/**
 * Returns a copy of a string converted to title format; i.e.,
 * words aren't split by underscores or pascal casing and the first
 * letter of every word is capitalized.
 */
export function toTitle(aString: string) : string {
	// Combination of snake-case and camelCase regex
	const re = concatRegex(SNAKE_SEGMENT_REGEX, UPPER_CASE_SPLIT_REGEX);
	
	// Splitting and formatting tokens
	const tokens = aString.split(re)
		// Filters nulls and empty strings
		.filter(s => ( typeof s === 'string' && s.length > 0 ))
		
		// Capitalizing first character
		.map(s => {
			let formatted = s.at(0)!.toUpperCase();
			if ( s.length > 1 ) {
				formatted += s.slice(1).toLowerCase();
			}

			return formatted;
		});
	
	// console.log(`Titleized ${aString} to ${tokens.join(' ')}`)  // DEBUG
	
	// Re-combining
	return tokens.join(' ');
}	


/**
 * Returns if user is logged in to F95
 */
export async function userLoggedIn(): Promise<boolean> {
	// 'xf_user' cookie is a session tag I believe;
	// when missing, that means the user isn't logged in
	const userSession = await chrome.cookies.get({
		name: "xf_user",
		url: "https://f95zone.to",
	});

	return userSession !== undefined;
}


/**
 * Prompts user to login to F95.
 */
export async function promptLogin(): Promise<boolean> {
	// Opens popup if it isn't already active
	if (!isPopupActive()) {
		await chrome.action.openPopup();
	}
	
	// Messages popup to tell user they aren't logged in when they need to be.
	// The response should be a boolean for 'userLoggedIn'
	const msg: UserNotLoggedInMessage = { action: 'user-not-logged-in' };
	const userLoggedIn = await chrome.runtime.sendMessage(JSON.stringify(msg));
	
	return !!userLoggedIn;
}


/**
 * Converts the given name to a valid search query.
 */
export function prepSearchQuery(name: string): string {
	if (typeof name !== "string") {
		throw new TypeError("'name' must be a string");
	}

	// Matches a bunch of extra stuff that isn't
	// part of a Media's title
	const filterMatch = [
		NUMBER_NO_PRECEDING_REGEX,
		DLSITE_CODE_REGEX,
		DETAIL_SUFFIX_REGEX
	].reduce((prev, curr) => concatRegex(prev, curr, "|"));

	// Common ways that file names split tokens
	const delimitMatch = [
		SEARCH_TOKEN_DELIMIT_REGEX,
		UPPER_CASE_SPLIT_REGEX,
	].reduce((prev, curr) => concatRegex(prev, curr, "|"), / /g);

	let cleaned = name.replaceAll(filterMatch, "");
	// console.log(`Post filter match: ${cleaned}`);
	
	cleaned = cleaned.replaceAll(delimitMatch, ' ');
	// console.log('Post delimit ', cleaned);

	const tokens = cleaned.split(' ')
		.filter(s => !!s && s.length > 0)
		.map(s => s.trim().toLowerCase());

	// Joins tokens in the format that search queries expect
	return tokens.join("+");
}


/**
 * Returns the most likely keywords of the given string.
 */
export function keywordsOf( str: string ) : string[] {
	
	// Matches a bunch of extra stuff that isn't
	// part of a Media's title
	const filterMatch = [
		NUMBER_NO_PRECEDING_REGEX,
		DLSITE_CODE_REGEX,
		DETAIL_SUFFIX_REGEX
	].reduce((prev, curr) => concatRegex(prev, curr, "|"));

	// Common ways that file names split tokens
	const delimitMatch = [
		SEARCH_TOKEN_DELIMIT_REGEX,
		UPPER_CASE_SPLIT_REGEX,
	].reduce((prev, curr) => concatRegex(prev, curr, "|"), / /g);

	let cleaned = str.replaceAll(filterMatch, "");
	// console.log(`Post filter match: ${cleaned}`);
	
	cleaned = cleaned.replaceAll(delimitMatch, ' ');
	// console.log('Post delimit ', cleaned);

	return cleaned.split(' ')
		.filter(s => !!s && s.length > 0)
		.map(s => s.trim().toLowerCase());
}


/**
 * Peforms a thread search with the given keywords
 */
export async function queryMedia( keywords: string[] ): Promise<SearchResult[] | null> {
	// Peforming search
	const res = await fetch(`${BASE_SEARCH_URL}?q=${keywords.join('+')}&${EX_SEARCH_PARAMS}`);

	// Request failed
	if (res.status < 200 || res.status > 299) {
		console.error(`Received error response on Media search`);
		return null;
	}

	// Reading search results
	return await scrapeSearchResults(await res.text());
}


/**
 * Extracts from search results page the titles and forums of each Media.
 */
export async function scrapeSearchResults(html: string): Promise<SearchResult[] | null> {
	
	// Checking if DOMParser is available
	// It won't be if this is called from the service worker.
	if ( typeof DOMParser === 'undefined' ) {
		const message: ScrapeSearchResultsMessage = {
			action: 'scrape-search-results',
			payload: html,
		};

		const res = await chrome.runtime.sendMessage(JSON.stringify(message));
		
		// Validating return
		const { data: searchResults, error, success  } = z.array(SearchResult).nullable().safeParse(res);
		if ( !success ) {
			console.error(`Received invalid SearchResult[] from popup:\n${error.message}`);
			return null;
		}

		return searchResults;
	}
	
	const parser = new DOMParser();
	const page = parser.parseFromString(html, "text/html");

	// The only <ol> on the page should be the search results
	const resultsContainer = page.querySelector("ol");
	if (resultsContainer === null) {
		// console.error("Failed to find search results container");
		return null;	
	}

	// Each <li> contains a <div class="contentRow"> which
	// has info like prefixes, thread title, forum, etc.
	const searchResults: SearchResult[] = [];
	const listItems = resultsContainer.querySelectorAll("li.block-row");
	if (listItems.length <= 0) {
		// console.error("No list items were found");
		return null;
	}

	for (const listItem of listItems) {
		const content = listItem.querySelector(
			"div.contentRow div.contentRow-main",
		);
		if (content === null) {
			// console.error("Failed to find main content container");
			continue;
		}

		// Getting id and title
		// from an <a> tag containing both
		const titleEl = content.querySelector("h3.contentRow-title a");
		if (titleEl === null) {
			// console.error("Failed to find title element");
			continue;
		}

		// Links are formatted like
		// /threads/{lower-case title}.{id}/
		const threadLink = titleEl.getAttribute("href")?.trim();
		if (!!!threadLink) {
			// console.error("Failed to find thread link");
			continue;
		}

		const idMatches = THREAD_LINK_MEDIA_ID_REGEX.exec(threadLink);
		if (idMatches === null || idMatches.length !== 1) {
			// console.error(
			// 	`Regex matching failed on ${threadLink} ${THREAD_LINK_MEDIA_ID_REGEX.source} ${idMatches}`,
			// );
			continue;
		}

		const mediaId = Number(idMatches[0]);

		// Getting title
		// console.log('Converting title content: ', titleEl.textContent);

		let title = "";
		for (const child of titleEl.childNodes) {
			const text = child.textContent?.trim();
			if (text === null || text === undefined) continue;

			// Breaks on first detail
			// if (INSIDE_BRACKETS_REGEX.test(text)) {
			// 	break;
			// }

			// Skipping <span> tags which have prefixes like
			// collection, VN, or abandoned
			if (text.length <= 0 || child.nodeName.toLowerCase() === "span") {
				continue;
			}

			if (title.length > 0) title += " ";
			title += text;
		}

		// Forum is kept inside a <ul>
		const suffixEls = [
			...content
				.querySelectorAll("div.contentRow-minor ul.listInline li")
				.values(),
		];
		const forumEl = suffixEls.find((el) =>
			/forum:(?:\s)?\D+/gi.test(el.textContent),
		);
		if (!!!forumEl) {
			// console.error("Failed to find forum element");
			continue;
		}

		const forumText = FORUM_REGEX.exec(forumEl.textContent)
			?.at(0)
			?.toUpperCase();
		const { data: forum, error, success } = MediaType.safeParse(forumText);

		if (!success) {
			// console.error(`Failed to get valid forum from ${forumEl.textContent}:\n${error.message}`);
			continue;
		}

		searchResults.push({ forum, mediaId, title, threadLink });
	}

	// console.log(JSON.stringify(searchResults, null, 2));

	return searchResults;
}


/**
 * Attempts to create a MediaDownload from the given directory item name.
 * Return also includes whether a download for this Media already exists.
 */
export async function getMediaDownload(name: string): Promise<MediaDownload | null> {
	// Prompting login if needed so that the search feature is available
	if (!(await userLoggedIn())) {
		const success = await promptLogin();
		if (!success) {
			console.error("Failed to login to f95zone; triggering popup");

			// Opens popup if it isn't already active
			if (!isPopupActive()) {
				await chrome.action.openPopup();
			}
			
			// Messages popup to tell user they aren't logged in when they need to be.
			// The response should be a boolean for 'userLoggedIn'
			const msg: UserNotLoggedInMessage = { action: 'user-not-logged-in' };
			const userLoggedIn = await chrome.runtime.sendMessage(JSON.stringify(msg));
			if ( !!!userLoggedIn ) {
				return null;
			}
		}
	}
	
	const keywords = keywordsOf(name);
	const searchResults = await queryMedia(keywords);
	
	if ( searchResults === null ) {
		console.error(`Received null search results for ${name}`);
		return null;
	}

	const sampleSize = ( await getUserSettings() ).searchSampleSize;
	const sample = searchResults.slice(0, sampleSize);

	// Finding the search result whose title
	// is the most similar to 'name'
	let bestGuess: SearchResult | undefined;
	let bestGuessCertainty = 0.0;

	for (const result of sample) {
		
		// Preparing title for keyword scoring
		// by removing delimiting characters like (), [], & /
		// and putting spaces between snake and camel-case splits.
		// This makes the tokens extracted from the title easier to
		// match with 'query'
		const re = [
			UPPER_CASE_SPLIT_REGEX,
			SNAKE_SEGMENT_REGEX
		].reduce((p, c) => concatRegex(p, c, '|'));

		const prepped = result.title
			.replaceAll(SEARCH_TOKEN_DELIMIT_REGEX, '')
			.replaceAll(re, ' ');
		
		const certainty = keywordScore(
			keywords, 
			prepped
		);

		if ( bestGuess === undefined || bestGuessCertainty < certainty ) {
			bestGuess = result;
			bestGuessCertainty = certainty;
		}
	}
	
	if (!!!bestGuess) {
		console.error(
			"Something went horribly wrong; bestGuess is not defined when it should be",
		);
		return null;
	}

	const media: Media = {
		mediaType: bestGuess.forum,
		mediaId: bestGuess.mediaId,
		title: bestGuess.title,
		threadLink: bestGuess.threadLink,
	};
	
	return {
		name, media,
		certainty: bestGuessCertainty,
		deleted: false,
	};
}


/**
 * Returns if the given value is a string array
 */
export function isStringArr(arr: any): arr is string[] {
	return Array.isArray(arr) && arr.every((i) => typeof i === "string");
}


/**
 * Calculates the Jaro similarity between 2 strings.
 * @reference https://en.wikipedia.org/wiki/Jaro–Winkler_distance
 */
export function jaroSimilarity(str1: string, str2: string): number {
	if (!(typeof str1 === "string" && typeof str2 === "string")) {
		throw new TypeError("'str1' and 'str2' must both  be strings");
	}

	// Exits early on exact match
	if (str1 === str2) {
		return 1.0;
	}

	// m = number of matching characters
	// s1 = length of str1
	// s2 = length of str2
	const s1 = str1.length;
	const s2 = str2.length;

	// Exits early if either is empty
	if (s1 <= 0 || s2 <= 0) {
		// console.log(`Empty string in jaro: s1: ${str1} s2: ${str2}`);
		return 0.0;
	}

	// Largest comparable character index
	const sMax = Math.min(s1, s2);

	// Characters are only considered matching if
	// within this many indexes of each other
	// ref: https://moj-analytical-services.github.io/splink/topic_guides/comparisons/comparators.html#jaro-similarity
	const maxMatchDistance = Math.floor(sMax / 2) - 1;

	// These track which characters have been "used"
	// so duplicate characters don't inflate the number of matches
	const s1Matches = new Array(s1);
	const s2Matches = new Array(s2);

	// Getting number of matching characters and transpositions
	let m = 0,
		numTrans = 0;

	for (let i = 0; i < sMax; i++) {
		const char = str1[i];
		const leftMatchBound = Math.max(0, i - maxMatchDistance);
		const rightMatchBound = Math.min(sMax, i + maxMatchDistance);

		for (let i2 = leftMatchBound; i2 < rightMatchBound; i2++) {
			const char2 = str2[i2];

			if (!(s1Matches[i] || s2Matches[i2]) && char === char2) {
				m++;
				s1Matches[i] = true;
				s2Matches[i2] = true;

				// Increments transpositions
				// if this match occured at incorrect index
				if (i !== i2) numTrans++;

				break;
			}
		}
	}

	// Exits early on 0 matches
	if (m <= 0) {
		// console.error("Zero matches");
		return 0.0;
	}

	// Final calculation
	const t = numTrans / 2.0;
	return (1.0 / 3.0) * ( (m / s1) + (m / s2) + ((m - t) / m) );
}


/**
 * Returns the Jaro-Winkler similarity of 2 strings.
 * This is case sensative.
 * @reference https://moj-analytical-services.github.io/splink/topic_guides/comparisons/comparators.html#jaro-winkler-similarity
 */
export function jaroWinklerSimilarity(
	str1: string,
	str2: string,
	p = 0.1,
): number {
	// NOTE jaroSimilarity throws on invalid str1 and str2
	// so those checks don't need to exist here
	if (typeof p !== "number") throw new TypeError("'p' must be a number");

	const jar = jaroSimilarity(str1, str2);

	// Getting length of common prefix
	let l = 0;

	for (let i = 0; i < str1.length; i++) {
		if (i < str2.length && str1[i] === str2[i]) {
			++l;
			continue;
		}
		break;
	}

	// Final calculation
	const out = jar + p * l * (1 - jar);
	// console.log(`JaroWinkler similarity of ${str1} and ${str2}: ${out}`);  // DEBUG
	
	return out;
}


/**
 * Returns indexes of all occurrances of a substring in another string.
 * https://stackoverflow.com/a/3410557/32075069
 */
export function getIndexesOfStr(searchStr: string, str: string): number[] {
	let searchStrLen = searchStr.length;
	if ( searchStrLen <= 0 ) {
		return [];
	}
	
	const indices: number[] = [];
	let startIndex = 0, index;

	while ( (index = str.indexOf(searchStr, startIndex)) > -1 ) {
		indices.push(index);
		startIndex = index + searchStrLen;
	}

	return indices;
}


/**
 * Returns all the indexes of the given item within an array
 */
export function getIndexesOfArr(finding: any, arr: any[]): number[] {
	const indices: number[] = [];

	for ( const [index, item] of arr.entries() ) {
		if ( item === finding ) {
			indices.push(index);
		};
	}

	return indices;
}


/**
 * Returns indexes of all items in an array 
 * which satisfy the given predicate.
 */
export function findIndexAll<T extends any>(
	pred: (x: T) => boolean, 
	arr: T[]
): number[] {
	return arr.reduce(
		(prev, curr, index) => ( pred(curr) ? [...prev, index] : prev ), 
		new Array<number>()
	);
}


/**
 * Returns a map of keyword occurrances in a string; e.g.,
 * { foo: [0, 1], bar: [8] }.
 * These numbers represent token index **NOT** string index. 
 */
export function keywordMap(
	str: string, 
	keywords: Set<string>, 
	tokenizer: string | RegExp = ' ',
): Map<string, number[]> {

	// Tokenizing
	const tokens = str.split(tokenizer)
		.filter(t => typeof t === 'string' && t.length > 0)
		.map(t => t.toLowerCase());
	// console.log(`Tokens of ${str}:\n${JSON.stringify(tokens)}`);
	
	// Creating map
	const occurrences = new Map<string, number[]>();

	for (const word of keywords) {
		// TODO this makes this function less modular but it's 
		// how I need it for this extension. It would technically be better
		// if there were function param(s) for how exact token matching should be.
		// const re = new RegExp(word, 'gi');
		// occurrences.set(word, findIndexAll((x: string) => re.test(x), tokens));
		occurrences.set(word, getIndexesOfArr(word, tokens));
	}

	return occurrences;
}


/**
 * Scores how well a string matches a list of keywords
 * as determined by the following:
 * 
 * coverage 	- Keywords present in string
 * order		- Correctly-ordered keyword pairs 
 * proximity 	- Present keyword pairs regardless of order 
 * frequency	- Number of times keywords appear (with a per-word cap)
 * 
 * @param keywords List of keywords **IMPORTANT** order matters for keyword pairings
 * @param aString String to score
 * @param options Tuning parameters
 * 
 * @returns Number between [0.0, 1.0] representing a percentage
 */
export function keywordScore(
	keywords: string[], 
	aString: string,
	options = {
		weights: {
			coverage: 	0.35,
			order:		0.25,
			proximity:	0.2,
			frequency:	0.2
		},
		maxKeywordScore: 3,
		roundTo: 2
	},
): number {
	// console.log(`Proximity matching keywords ${JSON.stringify(keywords)} against string ${aString}`);
	
	// Validating options
	const { weights, maxKeywordScore, roundTo } = options;
	
	const weightSum = Object.values(weights).reduce((p, c) => ( p + c ));
	if ( Math.abs(1.0 - weightSum) > Number.EPSILON ) {
		throw new Error(`Invalid weights; must add to 1.0:\n${JSON.stringify(weights, null, 2)}`);
	}

	if ( roundTo <= 0 ) {
		throw new Error(`Invalid 'roundTo'; must be positive number`);
	}

	if ( maxKeywordScore <= 0 ) {
		throw new Error(`Invalid 'maxKeywordScore'; must be positive number`);
	}
	
	// Creating a lookup table of keyword occurrences
	const keywordOccurrences = keywordMap(aString, new Set(keywords));
	// console.log('Keyword occurances:\n', JSON.stringify(Object.fromEntries(keywordOccurrences.entries()), null, 2));
	
	let frequencyScore = 0, numOrderedPairs = 0, numAdjacentPairs = 0;
	
	for (const [word, occurrences] of keywordOccurrences) {

		// Doesn't add to score if no occurrences
		if ( occurrences.length <= 0 ) {
			continue;
		}
		
		const keywordIndex = keywords.indexOf(word);
		
		// Checking order + proximity 
		// Only checks adjacency in one direction
		// to prevent the same pair scoring twice
		const next = ( keywordIndex < keywords.length )
			? keywords.at(keywordIndex + 1)
			: undefined;
		
		if ( !!next && keywordOccurrences.has(next) ) {
			const nextWordOccurrences = keywordOccurrences.get(next)!;

			// Checking for at least one adjacent 
			// and correctly ordered pair of keywords
			let foundAdjacent = false, foundOrdered = false;			
			for (const index of occurrences) {
				for (const nextIndex of nextWordOccurrences) {
					const distance = ( nextIndex - index );

					if ( Math.abs(distance) <= 1 ) {
						if ( distance > 0 ) foundOrdered = true;
						foundAdjacent = true;
					}

					if ( foundOrdered && foundAdjacent ) {
						break;
					}
				}

				if ( foundOrdered && foundAdjacent ) {
					break;
				}
			}

			if ( foundAdjacent ) numAdjacentPairs++;
			if ( foundOrdered ) numOrderedPairs++;
		}
		
		// This increases score based on how many times the keyword appears.
		// The bonus-per-keyword is capped.
		frequencyScore += Math.min(occurrences.length, maxKeywordScore) / ( keywordOccurrences.size * maxKeywordScore );
	}

	// console.log(`Results:\n${JSON.stringify({ coverage, orderScore, proximityScore, frequencyScore }, null, 2)}`);
	
	// Calculating normalized score
	const coverage = keywordOccurrences.size / keywords.length;
	const numPairs = ( keywords.length - 1 );

	const orderScore = ( numPairs > 0 )
		? numOrderedPairs / numPairs
		: 1.0;
	
	const proximityScore = ( numPairs > 0 )
		? numAdjacentPairs / numPairs
		: 1.0;
	
	const score = weights.coverage * coverage +
		weights.order * orderScore +
		weights.proximity * proximityScore +
		weights.frequency * frequencyScore;

	return Number(score.toPrecision(roundTo));
}


/**
 * Searches for Array element that satisfies predicate
 * using binary search. Assumes the array is pre-sorted.
 * 'predicate' should return a negative if target is less
 * than the given value, a positive if it's greater, and 0
 * on a match.
 *
 * @param arr Array of items
 * @param predicate Callback function checking for a match
 * @returns Full value of first match or undefined if not found
 */
export function binSearch<T>(
	arr: T[],
	predicate: (value: T, index: number, obj: T[]) => number,
): T | undefined {
	// ref: https://www.geeksforgeeks.org/dsa/binary-search/
	let low = 0;
	let high: number = arr.length - 1;
	let mid: number;

	while (high >= low) {
		mid = low + Math.floor((high - low) / 2.0);

		const value: T = arr.at(mid)!;

		// Element found at middle
		if (predicate(value, mid, arr) === 0) {
			return value;
		}

		// Element is to the left
		if (predicate(value, mid, arr) < 0) {
			high = mid - 1;

			// Element is to the right
		} else {
			low = mid + 1;
		}
	}

	return undefined;
}


/**
 * Expands a 3-number hex into 6 letter format.
 * Throws an Error if input isn't a valid hex string.
 */
export function expandRGBHex(hex: string): string {
	if ( !HEX_COLOR_REGEX.test(hex) ) {
		throw new Error(`Invalid RGB hex: ${hex}`);
	}

	let cleanHex = hex.replace('#', '');
	
	if (cleanHex.length === 3) {
		cleanHex = cleanHex.replace(/./g, char => char + char);
	}
	
	return `#${cleanHex}`;
}
