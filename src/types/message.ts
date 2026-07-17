import z from "zod";

/**
 * Defines message actions which the
 * background script listens for
 */
export const BackgroundActions = {
	IMPORT_DOWNLOADS: "import-downloads",
} as const;

/**
 * Defines message actions which the popup listens for
 */
export const PopupActions = {
	SCRAPE_SEARCH_RESULTS: "scrape-search-results",
} as const;

/**
 * Format of native messages
 */
export const Message = z.strictObject({
	action: z.string(),
	payload: z.any().optional(),
});

export type Message = z.infer<typeof Message>;

export default {
	BackgroundActions,
	PopupActions,
};
