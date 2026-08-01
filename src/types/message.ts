import z from "zod";
import { MediaDownloadConflict, ImportResults, Media, MediaDownload } from "./data";


// Base message class which includes 
// intention and any relevant data
export const Message = z.strictObject({
	action: 	z.string(),
	payload: 	z.any().optional()
});

export type Message = z.infer<typeof Message>;


/**
 * Importing downloads from a list of directory item names.
 */
export const ImportDownloadsMessage = Message.safeExtend({
	action: 	z.literal('import-downloads'),
	payload:	z.array(z.string())
});

export type ImportDownloadsMessage = z.infer<typeof ImportDownloadsMessage>;


/**
 * Triggers the clearing of known downloads.
 * This doesn't actually delete the Media.
 */
export const ClearKnownDownloadsMessage = Message.safeExtend({
	action: 	z.literal('clear-known-downloads'),
	payload: 	z.null(),
});

export type ClearKnownDownloadsMessage = z.infer<typeof ClearKnownDownloadsMessage>;


/**
 * Service worker tasks popup with scraping a search results page
 */
export const ScrapeSearchResultsMessage = Message.safeExtend({
	action:		z.literal('scrape-search-results'),
	payload: 	z.string()
});

export type ScrapeSearchResultsMessage = z.infer<typeof ScrapeSearchResultsMessage>;


/**
 * User is prompted to select how duplicate downloads should be handled
 */
export const GetConflictPolicyMessage = Message.safeExtend({
	action:		z.literal('get-conflict-policy'),
	payload: 	z.record(z.coerce.number(), MediaDownloadConflict)
});

export type GetConflictPolicyMessage = z.infer<typeof GetConflictPolicyMessage>;


/**
 * Import results are displayed on popup
 */
export const ShowImportResultsMessage = Message.safeExtend({
	action:		z.literal('show-import-results'),
	payload:	ImportResults,
});

export type ShowImportResultsMessage = z.infer<typeof ShowImportResultsMessage>;


/**
 * Message used by content scripts to get whether the user is
 * logged in via the background script since they can't access cookies directly
 */
export const GetUserLoggedInMessage = Message.safeExtend({
	action: 	z.literal('get-user-logged-in'),
	payload: 	z.any().nullish()
});

export type GetUserLoggedInMessage = z.infer<typeof GetUserLoggedInMessage>;


/**
 * Message sent to popup to ask user if they want to flag
 * the given Media as downloaded.
 */
export const SaveDownloadPromptMessage = Message.safeExtend({
	action:		z.literal('save-download-prompt'),
	payload:	MediaDownload
})

export type SaveDownloadPromptMessage = z.infer<typeof SaveDownloadPromptMessage>;


/**
 * Message sent to popup to ask user if they want 
 * to update a MediaDownload to the given Media. This is triggered when
 * clicking a download link on a thread page for a known download that has < 100% certainty.
 * It updates the certainty to 100%--assuming the given thread page is the correct one
 * according to the user.
 */
export const UpdateDownloadPromptMessage = Message.safeExtend({
	action:			z.literal('update-download-prompt'),
	payload:		z.strictObject({
		old:		MediaDownload,
		new:		MediaDownload
	})
});

export type UpdateDownloadPromptMessage = z.infer<typeof UpdateDownloadPromptMessage>;
