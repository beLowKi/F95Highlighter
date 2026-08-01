import z from "zod";


/**
 * Supported media types
 */
export const MediaType = z.enum({
	GAMES: "GAMES",
	ANIMATIONS: "ANIMATIONS & LOOPS",
	COMICS: "COMICS & STILLS",
});

export type MediaType = z.infer<typeof MediaType>;


/**
 * Represents a video game, comic, or animation
 */
export const Media = z.strictObject({
	mediaType: MediaType,
	mediaId: z.number(),
	title: z.string(),
	threadLink: z.string(),
});

export type Media = z.infer<typeof Media>;


/**
 * Downloaded Media
 */
export const MediaDownload = z.strictObject({
	name: 		z.string(),
	mediaId: 	z.int(),
	certainty: 	z.float32(),
	deleted: 	z.boolean().default(false),
});

export type MediaDownload = z.infer<typeof MediaDownload>;


/**
 * Models a MediaDownload conflict which is happens
 * when 2 imported downloads have the same mediaId
 */
export const MediaDownloadConflict = z
	.strictObject({
		mediaId: z.number(),
		existing: MediaDownload.optional(),
		new: z.array(MediaDownload),
	})
	// Enforces that every download in
	// the conflict has the same mediaId
	.refine(
		(val) => {
			const downloads = [val.existing, ...val.new].filter((d) => !!d);
			return downloads.every((d) => d.mediaId === val.mediaId);
		},
		{ message: "Missing or mismatch mediaId(s) detected among downloads" },
	);

export type MediaDownloadConflict = z.infer<typeof MediaDownloadConflict>;


/**
 * Results of a f95 media search
 */
export const SearchResult = z.strictObject({
	mediaId: z.number(),
	title: z.string(),
	threadLink: z.string(),
	forum: MediaType,
});

export type SearchResult = z.infer<typeof SearchResult>;


/**
 * Describes the results of importing media downloads
 */
export const ImportResults = z.strictObject({
	success:			z.boolean(),
	numScanned:			z.number().optional(),
	newMediaIds:		z.array(z.number()).default([]).optional(),
	updatedMediaIds:	z.array(z.number()).default([]).optional(),
	failedItems:		z.array(z.string()).default([])
});

export type ImportResults = z.infer<typeof ImportResults>;


/**
 * User settings
 */
export const Settings = z.strictObject({});

export type Settings = z.infer<typeof Settings>;


/**
 * Local Storage structure
 */
export const LocalStorage = z.strictObject({
	downloads: z.record(z.coerce.number(), MediaDownload),
	settings: Settings,
});

export type LocalStorage = z.infer<typeof LocalStorage>;


/**
 * Policies for handling download conflicts
 * 
 * **SKIP** 				- Skips duplicates
 * 
 * **KEEP_MOST_CERTAIN** 	- Keeps whichever download has the highest certainty
 * 
 * **REPLACE** 				- Uses the latest new download
s */
export const ConflictResolutionPolicy = z.enum([
	"SKIP",
	"KEEP_MOST_CERTAIN",
	"REPLACE",
]);

export type ConflictResolutionPolicy = z.infer<typeof ConflictResolutionPolicy>;


/**
 * Checks which MediaType the given forum name refers to.
 * Returns null if aString doesn't match any MediaType.
 */
export function forumToMediaType(
	aString: string,
): keyof typeof MediaType | null {
	if (typeof aString !== "string") {
		throw new TypeError("'aString' must be a string");
	}

	let mtype = null;

	for (const [key, value] of Object.entries(MediaType)) {
		if (aString.toUpperCase().trim() === value) {
			mtype = key as keyof typeof MediaType;
			break;
		}
	}

	return mtype;
}
