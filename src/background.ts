import pLimit from "p-limit";
import {
	ConflictResolutionPolicy,
	ImportResults,
	LocalStorage,
	type Media,
	MediaDownload,
	type MediaDownloadConflict,
	SearchResult,
	Settings,
} from "types/data";
import { 
	ClearKnownDownloadsMessage, ImportDownloadsMessage, ImportStatusMessage, Message, 
	SaveDownloadMessage, 
	SaveDownloadPopupMessage, 
	UpdateDownloadMessage, 
	UpdateDownloadPopupMessage, 
	UserNotLoggedInMessage, 
	type GetConflictPolicyMessage, type ScrapeSearchResultsMessage, type ShowImportResultsMessage 
} from "types/message";

import {
	BASE_SEARCH_URL,
	CONCURRENT_SEARCH_LIMIT,
	DEFAULT_SETTINGS,
	EX_SEARCH_PARAMS,
	LOCAL_STORAGE_KEYS,
	SEARCH_TOKEN_DELIMIT_REGEX,
	SNAKE_SEGMENT_REGEX,
	UPPER_CASE_SPLIT_REGEX,
} from "utils/const";

import {
	concatRegex,
	prepSearchQuery,
	promptLogin,
	keywordScore,
	userLoggedIn,
	getUserDownloads,
	getUserSettings,
	isPopupActive,
	getMediaDownload,
} from "utils/func";


// Constants only used in this script that 
// I don't know where else to put...
const IMPORT_STATUS_UPDATE_RATE = 250;


// /**
//  * Searches for the given name in F95
//  * to find a best match for the actual Media.
//  */
// async function searchMediaName(
// 	name: string,
// ): Promise<{ media: Media; certainty: number } | null> {
// 	// Prompting login if needed so that the search feature is available
// 	if (!(await userLoggedIn())) {
// 		const success = await promptLogin();
// 		if (!success) {
// 			console.error("Failed to login to f95zone; triggering popup");

// 			// Opens popup if it isn't already active
// 			if (!isPopupActive()) {
// 				await chrome.action.openPopup();
// 			}
			
// 			// Messages popup to tell user they aren't logged in when they need to be.
// 			// The response should be a boolean for 'userLoggedIn'
// 			const msg: UserNotLoggedInMessage = { action: 'user-not-logged-in' };
// 			const userLoggedIn = await chrome.runtime.sendMessage(JSON.stringify(msg));
// 			if ( !!!userLoggedIn ) {
// 				return null;
// 			}
// 		}
// 	}

// 	// Peforming search
// 	const query = prepSearchQuery(name);
// 	const url = `${BASE_SEARCH_URL}?q=${query}&${EX_SEARCH_PARAMS}`;
// 	console.log(`Performing search query for ${name} at ${url}`);

// 	const res = await fetch(url);

// 	// Request failed
// 	if (res.status < 200 || res.status > 299) {
// 		console.error(`Received error response on Media search`);
// 		return null;
// 	}

// 	// Reading search results
// 	const html = await res.text();

// 	const message: ScrapeSearchResultsMessage = {
// 		action: 'scrape-search-results',
// 		payload: html,
// 	};

// 	const searchResults = await chrome.runtime.sendMessage(JSON.stringify(message));

// 	// Validating return
// 	if (!(searchResults instanceof Array) || searchResults.length <= 0) {
// 		console.error(`Failed to find search results for ${name}`);
// 		return null;
// 	}

// 	try {
// 		searchResults.forEach((sr) => SearchResult.parse(sr));
// 	} catch (error) {
// 		console.error(
// 			`Error validating search results: ${JSON.stringify(searchResults, null, 2)}`,
// 		);
// 		return null;
// 	}

// 	// Finding best match among results
// 	// console.log(
// 	// 	`Search results:\n${JSON.stringify(searchResults.slice(0, 5), null, 2)}`,
// 	// );

// 	const sampleSize = ( await getUserSettings() ).searchSampleSize;
// 	const sample = searchResults.slice(0, sampleSize);

// 	// Finding the search result whose title
// 	// is the most similar to 'name'
// 	let bestGuess: SearchResult | undefined;
// 	let bestGuessCertainty = 0.0;

// 	for (const result of sample) {
		
// 		// Preparing title for keyword scoring
// 		// by removing delimiting characters like (), [], & /
// 		// and putting spaces between snake and camel-case splits.
// 		// This makes the tokens extracted from the title easier to
// 		// match with 'query'
// 		const re = [
// 			UPPER_CASE_SPLIT_REGEX,
// 			SNAKE_SEGMENT_REGEX
// 		].reduce((p, c) => concatRegex(p, c, '|'));

// 		const prepped = result.title
// 			.replaceAll(SEARCH_TOKEN_DELIMIT_REGEX, '')
// 			.replaceAll(re, ' ');
		
// 		const certainty = keywordScore(
// 			query.split('+'), 
// 			prepped
// 		);

// 		if ( bestGuess === undefined || bestGuessCertainty < certainty ) {
// 			bestGuess = result;
// 			bestGuessCertainty = certainty;
// 		}
// 	}
	
// 	if (!!!bestGuess) {
// 		console.error(
// 			"Something went horribly wrong; bestGuess is not defined when it should be",
// 		);
// 		return null;
// 	}

// 	const media: Media = {
// 		mediaType: bestGuess.forum,
// 		mediaId: bestGuess.mediaId,
// 		title: bestGuess.title,
// 		threadLink: bestGuess.threadLink,
// 	};

// 	return { media, certainty: bestGuessCertainty };
// }


// /**
//  * Attempts to create a MediaDownload from the given directory item name.
//  * Return also includes whether a download for this Media already exists.
//  *
//  * **NOTE** Currently, each call does a full scan of Media titles
//  * to find which ones 'name' matches most with.
//  */
// async function getMediaDownload(name: string): Promise<MediaDownload | null> {
// 	// console.log(`Searching for media matching ${name}`);
	
// 	// Attempting to find matching Media
// 	const result = await searchMediaName(name);
// 	if (result === null) {
// 		console.error("Failed to find media");
// 		return null;
// 	}

// 	// console.log(JSON.stringify(result, null, 2));
	
// 	return {
// 		name,
// 		media: result.media,
// 		certainty: result.certainty,
// 		deleted: false,
// 	};
// }


/**
 * Peforms full 'import-downloads' action--updating
 * database of user's downloaded Media.
 *
 * @param items List of directory item names
 */
async function importDownloads(items: string[]): Promise<void> {
	// Prompting login if needed so that the search feature is available.
	// Failing both, the import is cancelled.
	if ( !((await userLoggedIn()) || (await promptLogin())) ) {
		throw new Error('User not logged in and login prompt failed');
	}
	
	// NOTE this throws an Error if downloads store gets broken (fails LocalStorage model)
	// for some reason, but this function should fail when that happens anyway
	const downloads = await getUserDownloads();
	// console.log(`Downloads pre-import:\n${JSON.stringify(downloads, null, 2)}`);
	
	// Collecting new downloads
	const newMedia: NonNullable<ImportResults['newMedia']> = {};	
	const failedItems: NonNullable<ImportResults['failedItems']> = [];
	const conflicts: Record<number, MediaDownloadConflict> = {};
	
	// Number of downloads processed;
	// used for heartbeat message to popup
	let queuedUpdate: Timer;
	let processedDownloads: number = 0;
	
	// Limits number of concurrent promises so
	// there aren't too many requests being sent to f95
	const limit = pLimit(CONCURRENT_SEARCH_LIMIT);
	const queue = items.map((item) => limit(async () => {
		let d = null;
		
		try {
			d = await getMediaDownload(item);			
		} finally {
			processedDownloads++;
			return d;
		}
	}));
	
	// Loops for as long as import takes--occasionally
	// sending a status update to popup
	// FIXME large imports send wrong total?
	const loop = async () => {
		if ( processedDownloads >= queue.length ) {
			console.log(`Processed ${processedDownloads} out of ${queue.length}; stopping heartbeat`);
			clearTimeout(queuedUpdate);
			return;
		}
		
		// Queues next heartbeat
		queuedUpdate = setTimeout(loop, IMPORT_STATUS_UPDATE_RATE);
		
		const msg: ImportStatusMessage = {
			action: 'import-status-update',
			payload: {
				// FIXME this isn't updating correctly
				failedItems: 	Array.from(failedItems),
				total: 			queue.length,
				processed: 		processedDownloads,
			}
		};
		
		// console.log('Sending heartbeat');
		await chrome.runtime.sendMessage(JSON.stringify(msg));
	}
	
	loop().then();

	try {
		// FIXME closing popup should abort this
		// rn it continues as normal, so if you re-open the popup everything (seems)
		// to just continue as usual. If popup is still closed then, the results message fails
		// to send so the process fails as expected, but it should stop sooner than that.
		const foundDownloads = await Promise.all(queue);
		
		for (const [index, download] of foundDownloads.entries()) {

			// Updating failed items
			if (download === null) {
				failedItems.push(items.at(index)!);
				continue;
			};

			const mediaId = download.media.mediaId;

			// New media
			if ( !( mediaId in downloads ) ) {
				newMedia[download.name] = mediaId;
				downloads[mediaId] = download;
				continue;
			}

			// New conflicts
			if ( !( mediaId in conflicts ) ) {
				conflicts[mediaId] = {
					mediaId,
					existing: downloads[mediaId],
					new: [download],
				};
				
				continue;
			}

			// Adding to existing conflict
			conflicts[mediaId].new.push(download);
		}

	} catch (error) {
		console.error(`Error importing downloads: ${error}`);
		return;
	}

	// How duplicate downloads are handled
	let conflictPolicy: ConflictResolutionPolicy = 'KEEP_MOST_CERTAIN';
	
	// Triggers popup prompt asking user how to handle duplicates
	if ( Object.keys(conflicts).length > 0 ) {
		const message: GetConflictPolicyMessage = {
			action: 'get-conflict-policy',
			payload: conflicts,
		};

		// Collecting conflict policy
		const policy = await chrome.runtime.sendMessage(JSON.stringify(message));
		
		// User cancelled or otherwise failed to get 
		// conflict policy so we cancel import
		if ( !(!!policy) ) {
			console.log('Background received null | undefined conflict policy');
			return;
		}
		
		// Parsing
		const {
			data: parsed,
			error,
			success,
		} = ConflictResolutionPolicy.safeParse(policy);

		// Big problem; an invalid policy or 
		// completely different type was received
		if (!success) {
			console.error(
				"Internal Error: popup failed to respond with" +
					` valid conflict resolution policy:\n${error.message}`,
			);
		} else {
			conflictPolicy = parsed;
		}
	}

	// Handling conflicts
	// Tracks which media downloads have been updated
	const updatedMedia: NonNullable<ImportResults['updatedMedia']> = {};

	switch (conflictPolicy) {
		// Keeps the latest download, so whichever
		// item happened to be first in ordering
		case "SKIP":
			for (const [mediaId, conflict] of Object.entries(conflicts) ) {
				const choice = (!!conflict.existing)
					? conflict.existing
					: conflict.new.at(0);
				
				// Invalid conflict created with
				// no existing or new downloads
				if ( choice === undefined ) {
					console.error(
						`Conflict on Media ID ${mediaId} with no new or existing downloads:` +
						`\n${JSON.stringify(conflict, null, 2)}`
					);
					continue;
				}
					
				downloads[Number(mediaId)] = choice;
			}
			break;

		// Uses download with highest certainty
		case "KEEP_MOST_CERTAIN":
			for ( const [mediaId, conflict] of Object.entries(conflicts) ) {
				const options: MediaDownload[] = 
					[conflict.existing, ...conflict.new].filter(d => ( d !== undefined ));

				// Invalid conflict created with
				// no existing or new downloads
				if ( options.length <= 1 ) {
					console.error(
						`Conflict on Media ID ${mediaId} with no new or existing downloads:` +
						`\n${JSON.stringify(conflict, null, 2)}`
					);
					continue;
				}
					
				const choice = options.reduce(
					(prev, curr) => (curr.certainty > prev.certainty) ? curr : prev
				);

				// console.log(`Selected ${JSON.stringify(choice, null, 2)} out of ${JSON.stringify(options, null, 2)}`);
				
				const numberedId = +mediaId;
				if ( choice !== conflict.existing ) {
					updatedMedia[numberedId] = {
						old: downloads[numberedId],
						new: choice,
					};
					// updatedMediaIds.add(Number(mediaId));
				}
				
				downloads[numberedId] = choice;
			}
			break;

		// Keeps latest item
		case "REPLACE":
			for (const [mediaId, conflict] of Object.entries(conflicts)) {
				const options: MediaDownload[] = 
					[conflict.existing, ...conflict.new].filter(d => !!d);
				
				// Invalid conflict created with
				// no existing or new downloads
				if ( options.length <= 1 ) {
					console.error(
						`Conflict on Media ID ${mediaId} with no new or existing downloads:` +
						`\n${JSON.stringify(conflict, null, 2)}`
					);
					continue;
				}
					
				const choice = options.at(-1)!;
				const numberedId = +mediaId;
				
				if ( choice !== conflict.existing ) {
					updatedMedia[numberedId] = {
						old: downloads[numberedId],
						new: choice
					}
				}

				downloads[numberedId] = choice;
			}
			break;

		default:
			throw new Error(
				`Unhandled ConflictResolutionPolicy received: ${conflictPolicy}`,
			);
	}
	
	// DEBUG
	// console.log(`Final downloads:\n${JSON.stringify(downloads, null, 2)}`);
	
	// Adding downloads to storage
	const importResultsMessage: ShowImportResultsMessage = {
		action: 'show-import-results',
		payload: { success: false, failedItems: [] },
	};

	try {
		await chrome.storage.local.set({
			[LOCAL_STORAGE_KEYS.DOWNLOADS]: downloads,
		});

		importResultsMessage.payload = {
			success: 			true,
			numScanned: 		items.length,
			newMedia,
			updatedMedia,
			failedItems: 		Array.from(failedItems)
		}
		
	} catch (error) {
		console.error(`Error saving imports: ${error}`);
	}

	// Triggers popup display for import results
	await chrome.runtime.sendMessage(JSON.stringify(importResultsMessage));
}


/**
 * Saves a number of new downloads to storage.
 */
async function saveDownloads(newDownloads: LocalStorage['downloads']): Promise<void> {
	const downloads = await getUserDownloads();
	
	for (const mediaId in newDownloads) {
		delete downloads[mediaId];
		downloads[mediaId] = newDownloads[mediaId]
	}
	
	// console.log(`New downloads: ${JSON.stringify(newDownloads, null, 2)}`);
	// console.log(`Updated downloads: ${JSON.stringify(downloads, null, 2)}`);

	await chrome.storage.local.set({
		[LOCAL_STORAGE_KEYS.DOWNLOADS]: downloads,
	});
}


/**
 * Clears known downloads
 */
async function clearKnownDownloads(): Promise<void> {
	// console.log('Clearing downloads');
	
	await chrome.storage.local.set({
		[LOCAL_STORAGE_KEYS.DOWNLOADS]: {}
	});

	// DEBUG
	// const downloads =
	// 	await chrome.storage.local.get(LOCAL_STORAGE_KEYS.DOWNLOADS);
	
	// console.log(`Downloads post clear:\n${downloads}`)
}	


/**
 * TBD/TODO 
 * This would scan downloads and flag any stored download
 * missing from scan as deleted
 */
async function syncDownloads() {

}


/**
 * Triggers a save-download prompt on the popup
 */
async function saveDownloadPrompt(download: SaveDownloadMessage['payload']): Promise<void> {
	// console.log('Opening prompt ');
	
	// Sets a new popup that handles thread stuff
	await chrome.action.setPopup({ popup: 'thread-popup/index.html' });

	// Triggers popup prompt and waits for a response or cancellation
	await chrome.action.openPopup();

	const msg: SaveDownloadPopupMessage = {
		action: 'save-download-popup-prompt',
		payload: download,
	}

	try {
		const res = await chrome.runtime.sendMessage(JSON.stringify(msg));
		if ( !!res ) {
			// console.log(`Received truthy response ${res}; saving download:\n${JSON.stringify(download)}`);
			await saveDownloads({ [download.media.mediaId]: download });
			
		// DEBUG
		} else {
			// console.log('New download canceled or user decided not to save');
		}

	} catch (error) {
		console.error(`Error saving download: ${error}`);
	}

	// Reseting popup
	await chrome.action.setPopup({ popup: 'popup/index.html' });
}


/**
 * Triggers an update-download prompt on the popup
 */
async function updateDownloadPrompt(payload: UpdateDownloadMessage['payload']): Promise<void> {
	
	// Sets a new popup that handles thread stuff
	await chrome.action.setPopup({ popup: 'thread-popup/index.html' });

	// Triggers popup prompt and waits for a response or cancellation
	await chrome.action.openPopup();

	const msg: UpdateDownloadPopupMessage = {
		action: 'update-download-popup-prompt',
		payload,
	}

	try {
		const res = await chrome.runtime.sendMessage(JSON.stringify(msg));
		if ( !!res ) {
			// console.log(
			// 	`Received truthy resopnse ${res}; Updating download` +
			// 	`\nOld: ${JSON.stringify(payload.old)}` +
			// 	`\nNew: ${JSON.stringify(payload.new)}`
			// );
	
			await saveDownloads({ [payload.new.media.mediaId]: payload.new });
		
		// DEBUG
		} else {
			// console.log('Download update canceled or user decided not to save');
		}

	} catch (error) {
		console.error(`Error during update download prompt: ${error}`);
	}

	// Resetting popup
	await chrome.action.setPopup({ popup: 'popup/index.html' });
}


/**
 * Triggers when extension is first installed or updated
 */
chrome.runtime.onInstalled.addListener(async (details) => {
	// TMP
	// await chrome.storage.local.clear();
	
	// Initializing storage
	// 'get' promises reject when that key doesn't exist
	
	// Downloads are just an empty object
	try {
		const key = LOCAL_STORAGE_KEYS.DOWNLOADS;
		const value = await chrome.storage.local.get(key);
		if ( typeof value[key] === 'undefined' ) {
			await chrome.storage.local.set({[key]: {}});
		}
	} catch (error) {
	}

	// Settings make sure all values are present
	try {
		const key = LOCAL_STORAGE_KEYS.SETTINGS;
		const value = await chrome.storage.local.get(key);
		const settings = value[key];
		if ( settings === 'undefined' || !Settings.safeParse(settings).success ) {
			await chrome.storage.local.set({[key]: DEFAULT_SETTINGS});
		}
	} catch (error) {
	}

	// DEBUG
	// const storage = await chrome.storage.local.get();
	// console.log(`Initialized storage to ${JSON.stringify(storage, null, 2)}`);
});


/**
 * Native message listener; mainly just stuff coming from the popup
 */
chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
	// console.log('Message received in background');
	
	const { data: { action, payload } = {}, error, success } = Message.safeParse(JSON.parse(message));
	if (!success) {
		console.error(
			`Popup received incorrectly formatted message:\n${error.message}`,
		);
		return;
	}

	switch (action) {
		// Importing a list of downloads
		case ImportDownloadsMessage.shape.action.value:			
			// Validating payload
			const { 
				data: imports, 
				error, 
				success 
			} = ImportDownloadsMessage.shape.payload.safeParse(payload);

			if ( !( success && !!imports ) ) {
				console.error(`Error with ${action} payload: ${error!.message}`);
				// sendResponse(false);
				return false;
			}

			// console.log('background beginning import')
			try {
				await importDownloads(imports);
				sendResponse(true);
			
			} catch (error) {
				console.error(`Unexpected error importing downloads: ${error}`);
				sendResponse(false);
			}

			return true;
		
		// TMP Clearing downloads
		case ClearKnownDownloadsMessage.shape.action.value:
			try {
				await clearKnownDownloads();
				sendResponse(true);
			} catch (error) {
				console.error(`Error clearing downloads: ${error}`);
				sendResponse(false);
			}
			
			return true;
		
		// Saving a new download from thread page
		case SaveDownloadMessage.shape.action.value: {
			const { data: download, error, success } = 
				SaveDownloadMessage.shape.payload.safeParse(payload);
			
			if ( !success ) {
				console.error(
					'Background received save-download message ' +
					`with invalid payload:\n ${error.message}`
				);
				return false;
			}
			
			try {
				await saveDownloadPrompt(download);
				sendResponse(true);

			// Unexpected error counts as a cancel
			} catch (error) {
				console.error(`Unexpected error during save-download prompt: ${error}`);
				sendResponse(false);
			}

			return true;
		}

		// Updating a download from thread page
		case UpdateDownloadMessage.shape.action.value: {
			const { data: update, error, success } = 
				UpdateDownloadMessage.shape.payload.safeParse(payload);
			
			if ( !success ) {
				console.error(
					'Background received update-download message ' +
					`with invalid payload:\n ${error.message}`
				);
				return false;
			}
			
			try {
				await updateDownloadPrompt(update);
				sendResponse(true);

			// Unexpected error counts as a cancel
			} catch (error) {
				console.error(`Unexpected error during update-download prompt: ${error}`);
				sendResponse(false);
			}
			
			return true;
		}
	}

	return false;
});
