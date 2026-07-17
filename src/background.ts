import { type Media, MediaDownload, SearchResult, Settings } from "types/data";
import { BackgroundActions, Message, PopupActions } from "types/message";
import { BASE_SEARCH_URL, EX_SEARCH_PARAMS } from "utils/const";
import {
	isStringArr,
	jaroWinklerSimilarity,
	prepSearchQuery,
	promptLogin,
	userLoggedIn,
} from "utils/func";

/**
 * Searches for the given name in F95
 * to find a best match for the actual Media.
 */
async function searchMediaName(
	name: string,
): Promise<{ media: Media; certainty: number } | null> {
	// Prompting login if needed so that the search feature is available
	if (!(await userLoggedIn())) {
		const success = await promptLogin();
		if (!success) {
			// TODO show this via popup or toast
			console.error("Failed to login to f95zone");
		}
	}

	// Peforming search
	const query = prepSearchQuery(name);
	const url = `${BASE_SEARCH_URL}?q=${query}&${EX_SEARCH_PARAMS}`;
	console.log(`Performing search query for ${name} at ${url}`);

	const res = await fetch(url);

	// Request failed
	if (res.status < 200 || res.status > 299) {
		console.error(`Received error response on Media search`);
		return null;
	}

	// Reading search results
	const html = await res.text();

	const message: Message = {
		action: PopupActions.SCRAPE_SEARCH_RESULTS,
		payload: html,
	};

	let searchResults = await chrome.runtime.sendMessage(message);

	// Validating return
	if (!(searchResults instanceof Array) || searchResults.length <= 0) {
		console.error("Failed to find search results");
		return null;
	}

	try {
		searchResults.forEach((sr) => SearchResult.parse(sr));
	} catch (error) {
		console.error(
			`Error validating search results: ${JSON.stringify(searchResults, null, 2)}`,
		);
		return null;
	}

	// Finding best match among results
	console.log(
		`Search results:\n${JSON.stringify(searchResults.slice(0, 5), null, 2)}`,
	);

	const sampleSize = 5; // TODO get from settings
	const sample = searchResults.slice(0, sampleSize);

	// Finding the search result whose title
	// is the most similar to 'name'

	// TODO const p = getSetting('prefix scale ratio');
	// then pass p to jaroWinklerSimilarity

	let bestGuess: SearchResult | undefined;
	let bestGuessCertainty = 0.0;

	for (const result of sample) {
		const certainty = jaroWinklerSimilarity(
			query,
			prepSearchQuery(result.title),
		);

		if (bestGuess === undefined || bestGuessCertainty < certainty) {
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

	return { media, certainty: bestGuessCertainty };
}

/**
 * Attempts to create a MediaDownload from the given directory item name.
 * Return also includes whether a download for this Media already exists.
 *
 * **NOTE** Currently, each call does a full scan of Media titles
 * to find which ones 'name' matches most with.
 */
async function getMediaDownload(name: string): Promise<MediaDownload | null> {
	// Attempting to find matching Media
	const result = await searchMediaName(name);
	if (result === null) {
		console.error("Failed to find media");
		return null;
	}

	console.log(JSON.stringify(result, null, 2));

	// return new MediaDownload(name, result.media.mediaId, result.certainty);

	return {
		name,
		mediaId: result.media.mediaId,
		certainty: result.certainty,
	};
}

/**
 * Peforms full 'import-downloads' action--updating
 * database of user's downloaded Media.
 *
 * @param items List of directory item names
 */
async function importDownloads(items: string[]): Promise<void> {
	// const downloads: MediaDownload[] = [];

	const imports: Record<number, MediaDownload[]> = {};
	const existingDownloads: Record<number, MediaDownload> = {};

	try {
		for await (const download of items.map(getMediaDownload)) {
			if (download === null) {
				continue;
			}

			// Pushes all scanned duplicates together
			// they'll be handled later
			if (!(download.mediaId in imports)) {
				imports[download.mediaId] = [];
			}

			imports[download.mediaId].push(download);

			// Checking for in-storage duplicate
			try {
				const rec = await chrome.storage.local.get(`${download.mediaId}`);
				const {
					data: inStoreDuplicate,
					error,
					success,
				} = await MediaDownload.safeParseAsync(rec);
				if (!success) {
					console.error(
						`Big problem; stored MediaDownload failed its model:\n${error.message}`,
					);
					return;
				}

				existingDownloads[inStoreDuplicate.mediaId] = inStoreDuplicate;

				// Promise rejects if key, i.e., a
				// duplicate dowload, doesn't exist.
			} catch (error) {}
		}
	} catch (error) {
		console.error(`Error importing downloads: ${error}`);
		return;
	}

	/** Now we got all these MediaDownloads
	 *
	 *      1) Check for duplicates
	 *          a) build list of { new: MediaDownload, old: MediaDownload }
	 *          for downlaods with duplicate mediaIds
	 *
	 *      2) If there are any duplicates, message popup to prompt user
	 *      on how duplicates should be handled
	 *          a) could be a default setting for this
	 *          b) maybe gets set with "Never ask again" checkbox
	 *
	 *      3) Deal with duplicates accordingly
	 *
	 *      4) Update database with remaining downloads
	 *
	 *      5) Message popup that import was a success/failure
	 *
	 *      6) We're done
	 */

	// Checking for duplicates either to db entries
	// or downloads within the same scan.

	// Checking current scan
	// TODO

	// Checking storage
	// TODOs

	/**
	 * "(X) folders approximated to the same Media"
	 *      ... then list out those folders' name
	 *
	 * "How would you like to proceed?"
	 *      ... skip (keeps earliest entry) or overwrite (keeps latest)
	 *
	 * could also have a "Do the same for on-file duplicates" checkbox
	 *
	 * Something something when importDuplicate is also storedDuplicate
	 *      Popup compares on-file download to scanned one(s)
	 *      Buttons to select which one to keep
	 *
	 * Collect this as DuplicateResolvePolicy or something
	 *
	 * switch ... do the policy
	 *
	 * continue updating storage as normal
	 */
}

/**
 * Saves user settings to storage.
 * Returns true|false based on if this was successful or not.
 */
async function saveSettings(settings: Settings): Promise<boolean> {
	if (
		!(
			typeof settings === "object" &&
			Object.keys(settings).every((k) => typeof k === "string")
		)
	) {
		throw new TypeError("'settings' must be a Record<string, any>");
	}

	// TODO save settings to chrome.storage

	throw new Error("Not implemented");
}

/**
 * Returns user settings as Record<string, any>
 */
async function getSettings(): Promise<Settings> {
	// TODO
	throw new Error("Not implemented");
}

/**
 * Triggers when extension is first installed or updated
 */
chrome.runtime.onInstalled.addListener(async (details) => {
	// uncomment if you want options.html to be opened after extension is installed
	// if ( details.reason === chrome.runtime.OnInstalledReason.INSTALL ) {
	//   chrome.tabs.create({
	//     url: 'options.html',
	//   });
	// }
});

/**
 * Native message listener; mainly just stuff coming from the popup
 */
chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
	const { data: msg, error, success } = Message.safeParse(message);
	if (!success) {
		console.error(
			`Popup received incorrectly formatted message:\n${error.message}`,
		);
		return;
	}

	switch (msg.action) {
		// Importing a list of downloads
		case BackgroundActions.IMPORT_DOWNLOADS:
			const parsed = JSON.parse(msg.payload);

			if (!isStringArr(parsed)) {
				console.error(
					`import-downloads actions expected string[] but recieved ${typeof parsed}`,
				);
				sendResponse(false);
				return;
			}

			try {
				await importDownloads(parsed);
			} catch (error) {
				console.error(`Unexpected error importing downloads: ${error}`);
				sendResponse(false);
				return;
			}

			break;

		default:
			console.error(
				"Missing or invalid action in message" +
					` received by service-worker: ${JSON.stringify(message, null, 2)}`,
			);
	}
});
