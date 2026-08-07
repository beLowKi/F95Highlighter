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
 * Triggers a prompt asking the user if they want to save the
 * given download. This happens after clicking a download link on a thread page.
 * 
 * Content scripts can't trigger popups directly, so this message actually goes to
 * the service worker who then sends another message to the popup.
 */
export const SaveDownloadMessage = Message.safeExtend({
	action:		z.literal('save-download-prompt'),
	payload:	MediaDownload
})

export type SaveDownloadMessage = z.infer<typeof SaveDownloadMessage>;


/**
 * 2nd part of the 'save download' prompt. 
 * This one is sent from the service-worker to the popup.
 */
export const SaveDownloadPopupMessage = Message.safeExtend({
	action:		z.literal('save-download-popup-prompt'),
	payload:	SaveDownloadMessage.shape.payload
})

export type SaveDownloadPopupMessage = z.infer<typeof SaveDownloadPopupMessage>;


/**
 * Message sent to popup to ask user if they want 
 * to update a MediaDownload to the given Media. This is triggered when
 * clicking a download link on a thread page for a known download that has < 100% certainty.
 * It updates the certainty to 100%--assuming the given thread page is the correct one
 * according to the user.
 */
export const UpdateDownloadMessage = Message.safeExtend({
	action:			z.literal('update-download-prompt'),
	payload:		z.strictObject({
		old:		MediaDownload,
		new:		MediaDownload
	})
});

export type UpdateDownloadMessage = z.infer<typeof UpdateDownloadMessage>;


/**
 * 2nd part of the 'update download' prompt. 
 * This one is sent from the service-worker to the popup.
 */
export const UpdateDownloadPopupMessage = Message.safeExtend({
	action:		z.literal('update-download-popup-prompt'),
	payload:	UpdateDownloadMessage.shape.payload
})

export type UpdateDownloadPopupMessage = z.infer<typeof UpdateDownloadPopupMessage>;


/**
 * Message sent when an action requiring the user be logged
 * in to f95 is triggered without the user actually being logged in.
 */
export const UserNotLoggedInMessage = Message.safeExtend({
	action:		z.literal('user-not-logged-in'),
	payload:	z.never().optional()
});

export type UserNotLoggedInMessage = z.infer<typeof UserNotLoggedInMessage>;