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
	name: z.string(),
	mediaId: z.number(),
	certainty: z.number(),
});

export type MediaDownload = z.infer<typeof MediaDownload>;

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
 * User settings
 */
export const Settings = z.strictObject({});

export type Settings = z.infer<typeof Settings>;

/**
 * Local Storage structure
 */
export const LocalStorage = z.strictObject({
	downloads: z.array(MediaDownload),
	settings: Settings,
});

export type LocalStorage = z.infer<typeof LocalStorage>;

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
