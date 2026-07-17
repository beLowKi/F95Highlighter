import { MediaType, type SearchResult } from "types/data.ts";

import {
	FORUM_REGEX,
	INSIDE_BRACKETS_REGEX,
	NUMBER_NO_PRECEDING_REGEX,
	PART_REGEX,
	SEARCH_TOKEN_BLACKLIST,
	SEARCH_TOKEN_DELIMIT_REGEX,
	THREAD_LINK_MEDIA_ID_REGEX,
	UPPER_CASE_SPLIT_REGEX,
	VERSION_NUMBER_REGEX,
	VOLUME_REGEX,
	YEAR_MONTH_DAY_REGEX,
} from "utils/const";

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
export function concatRegex(
	r1: RegExp,
	r2: RegExp,
	delimiter: string = "|",
): RegExp {
	if (!(r1 instanceof RegExp && r2 instanceof RegExp)) {
		throw TypeError("'r1' and 'r2' must both be RegExp");
	}

	if (!(delimiter === "|" || delimiter === " ")) {
		throw TypeError("'delimiter' must be either '|' or a space");
	}

	// ref: https://www.geeksforgeeks.org/javascript/how-to-concatenate-regex-literals-in-javascript/
	const flags = (r1.flags + r2.flags)
		.split("")
		.sort()
		.join("")
		.replace(/(.)(?=.*\1)/g, "");

	return new RegExp(r1.source + delimiter + r2.source, flags);
}

/**
 * Returns if user is logged in to F95
 * @returns { boolean }
 */
export async function userLoggedIn() {
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
	throw new Error("Not implemented");
}

/**
 * Converts the given name to a valid search query.
 */
export function prepSearchQuery(name: string): string {
	if (typeof name !== "string") {
		throw new TypeError("'name' must be a string");
	}

	// Pre-delimit splitting regex
	const preProcess = [
		NUMBER_NO_PRECEDING_REGEX,
		YEAR_MONTH_DAY_REGEX,
		VERSION_NUMBER_REGEX,
		PART_REGEX,
		VOLUME_REGEX,
	].reduce((prev, curr) => concatRegex(prev, curr, "|"), / /g);

	// Fully tokenizes string
	const postProcess = [
		SEARCH_TOKEN_DELIMIT_REGEX,
		UPPER_CASE_SPLIT_REGEX,
	].reduce((prev, curr) => concatRegex(prev, curr, "|"), / /g);

	const cleaned = name.replaceAll(preProcess, " ").replaceAll(postProcess, " ");

	// Gets all tokens up until first blacklisted
	// token since they're usually at the end of file names
	const tokens = [];

	for (const piece of cleaned.split(" ")) {
		// Removing leading or trailing spaces
		const token = piece.trim().toLowerCase();

		// Filtering blacklisted tokens,
		// dates, and version numbers because they typically
		// aren't in the actual thread title.
		// Also removes empty strings
		if (token.length <= 0) {
			continue;
		}

		if (SEARCH_TOKEN_BLACKLIST.has(token)) {
			break;
		}

		// Lower-casing final output
		tokens.push(token);
		if (!isNaN(Number(token))) {
			break;
		}
	}

	// Joins tokens in the format that search queries expect
	return tokens.join("+");
}

/**
 * Extracts from search results page the titles and forums of each Media.
 */
export function scrapeSearchResults(html: string): SearchResult[] | null {
	const parser = new DOMParser();
	const page = parser.parseFromString(html, "text/html");

	// The only <ol> on the page should be the search results
	const resultsContainer = page.querySelector("ol");
	if (resultsContainer === null) {
		console.error("Failed to find search results container");
		return null;
	}

	// Each <li> contains a <div class="contentRow"> which
	// has info like prefixes, thread title, forum, etc.
	const searchResults: SearchResult[] = [];
	const listItems = resultsContainer.querySelectorAll("li.block-row");
	if (listItems.length <= 0) {
		console.error("No list items were found");
		return null;
	}

	for (const listItem of listItems) {
		const content = listItem.querySelector(
			"div.contentRow div.contentRow-main",
		);
		if (content === null) {
			console.error("Failed to find main content container");
			continue;
		}

		// Getting id and title
		// from an <a> tag containing both
		const titleEl = content.querySelector("h3.contentRow-title a");
		if (titleEl === null) {
			console.error("Failed to find title element");
			continue;
		}

		// Links are formatted like
		// /threads/{lower-case title}.{id}/
		const threadLink = titleEl.getAttribute("href")?.trim();
		if (!!!threadLink) {
			console.error("Failed to find thread link");
			continue;
		}

		const idMatches = THREAD_LINK_MEDIA_ID_REGEX.exec(threadLink);
		if (idMatches === null || idMatches.length !== 1) {
			console.error(
				`Regex matching failed on ${threadLink} ${THREAD_LINK_MEDIA_ID_REGEX.source} ${idMatches}`,
			);
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
			if (INSIDE_BRACKETS_REGEX.test(text)) {
				break;
			}

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
			console.error("Failed to find forum element");
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
 * Returns if the given value is a string array
 */
export function isStringArr(arr: any): arr is string[] {
	return arr instanceof Array && arr.every((i) => typeof i === "string");
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
		console.error("Zero matches");
		return 0.0;
	}

	// Final calculation
	const t = numTrans / 2.0;
	return (1.0 / 3.0) * (m / s1 + m / s2 + (m - t) / m);
}

/**
 * Returns the Jaro-Winkler similarity of 2 strings.
 * This is case sensative.
 * @reference https://moj-analytical-services.github.io/splink/topic_guides/comparisons/comparators.html#jaro-winkler-similarity
 */
export function jaroWinklerSimilarity(
	str1: string,
	str2: string,
	p: number = 0.1,
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
	return jar + p * l * (1 - jar);
}
