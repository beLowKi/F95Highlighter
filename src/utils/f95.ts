import { MediaType, SearchResult } from "types/data";
import { ScrapeSearchResultsMessage } from "types/message";
import { THREAD_LINK_MEDIA_ID_REGEX, FORUM_REGEX } from "./const";

export const SEARCH_BASE_URL = 'https://f95zone.to/search/1/';
export const SEARCH_URL_REGEX = /^https:\/\/f95zone.to\/search\/(?:\d+)/i;
export const SEARCH_THREADS_PARAM = 't=post'
export const SEARCH_TITLES_AND_FIRST_POSTS_PARAM = 'c[container_only]=1';
export const SEARCH_TITLES_ONLY_PARAM = 'c[title_only]=1';
export const SEARCH_FORUM_PARAM_BASE = 'c[nodes]';
export const SEARCH_SUB_FORUMS_PARAM_BASE = 'c[child_nodes]=';
export const SEARCH_ORDER_BY_PARAM_BASE = 'o=';
export const SEARCH_DISPLAY_AS_THREADS_PARAM_BASE = 'g=';

export const THREAD_URL_REGEX = /^https:\/\/f95zone.to\/threads\//i;
export const THREAD_URL_DECONSTRUCTOR = /(?<=^https:\/\/f95zone.to\/threads\/)(?<title>[^.]+)(?:\.)(?<id>\d+)/i;
export const THREAD_FORUM_REGEX = /(?<=Forum:\s)[^0-9]+$/i;


/**
 * The different forums that threads can belong to.
 * These values are taken from the URL created from
 * f95's search form with their respective forum flagged.
 * 
 * They appear to be enum values, so it's important to ensure they match. 
 */
export enum Forum {
    Games = 1,
    ComicsAndAnimations = 39,
    ComicsAndStills = 40,
    AnimationsAndLoops = 94
};

export enum OrderBy {
    Relevance = 'relevance',
}


export type ThreadSearchParams = {
    titlesAndFirstPostsOnly?: boolean,
    titlesOnly?: boolean,
    
    /**
     * Filters by the user who made the thread.
     * 
     * c[users]={lowerTokens.join(+)}%2C+...
     */
    postedBy?: string,

    /**
     * Filters by forum the thread belongs to.
     * Apparantly, you can search multiple forums at once
     * like this but that's not stated on the detailed search form.
     * 
     * c[nodes][0]=19&c[nodes][1]=22...
     */
    forums?: Forum[],

    /**
     * Flags if sub-forums of base forum should be included.
     * Only works when forum is specified.
     * 
     * c[child_nodes]=1
     */
    searchSubForums?: boolean,

    /**
     * Orders search results
     * 
     * o={orderBy}
     */
    orderBy?: OrderBy,

    /**
     * Groups results by thread--meaning posts in the same thread
     * won't each have a search result.
     * 
     * g={0|1}
     */
    displayAsThreads?: boolean,

    /**
     * Fetch request fails after this many milliseconds when provided.
     */
    timeout?: number
};



export function getForumsUrlParam( fs: Forum[]  ): string {
    let i = 0;
    const paramStrs: string[] = [];
    
    for (const forum of fs) {
        paramStrs.push(`${SEARCH_FORUM_PARAM_BASE}[${i}]=${forum}`);
        i++;
    }
    
    return paramStrs.join('&');
}


export function threadSearchParamsToStr( params: ThreadSearchParams ): string {
    const paramStrs: string[] = [];

    // Converting each param to its URL equivalent
    for ( const [key, value] of Object.entries(params) ) {
        switch ( key as keyof ThreadSearchParams ) {
            case 'titlesAndFirstPostsOnly':
                if (!!value) paramStrs.push(SEARCH_TITLES_AND_FIRST_POSTS_PARAM);
                break;
        
            case 'titlesOnly':
                if (!!value) paramStrs.push(SEARCH_TITLES_ONLY_PARAM);
                break;

            case 'postedBy':
                // TODO
                break;

            case 'forums':
                paramStrs.push(getForumsUrlParam(value as Forum[]));
                break;
                
            case 'searchSubForums':
                if (!!value) paramStrs.push(`${SEARCH_SUB_FORUMS_PARAM_BASE}1`);
                break;
                
            case 'orderBy':
                paramStrs.push(`o=${value}`);
                break;

            case 'displayAsThreads':
                if (!!value) paramStrs.push(`${SEARCH_DISPLAY_AS_THREADS_PARAM_BASE}1`);
                break;
                
            default:
                break;
        }
    }
    
    const out = paramStrs.filter(p => p.length > 0).join('&');
    // console.log('Converted ', JSON.stringify(params, null, 2), '\nto ', out);
    
    return out;
};


export function getThreadSearchUrl( q: string, params?: ThreadSearchParams ): string {
    // URL without params
    let url = `${SEARCH_BASE_URL}?q=${q.replaceAll(' ', '+')}`;

    // Adding parameters
    if ( params !== undefined ) {
        const paramStr = threadSearchParamsToStr(params);
        url += '&' + paramStr;
    };

    return url;
}


export async function searchThreads( q: string, params?: ThreadSearchParams ): Promise<SearchResult[] | null> {
    // console.log('Beginning search for ', q, ' Params:\n', JSON.stringify(params, null, 2));
    
    const url = getThreadSearchUrl(q, params);

    // Making request
    let res;
    const reqInit: FetchRequestInit = {
        signal: ( !!params?.timeout ) ? AbortSignal.timeout(params.timeout) : undefined,
        redirect: 'follow',
        cache: 'no-store'
    };

    try {
        console.log(`Making request at ${url}`);
        res = await fetch(url, reqInit);
        
    // Request timed out or there was another expected error
    } catch (error) {
        console.error(error);
        return null
    }

    // Request failed
	if (res.status < 200 || res.status > 299) {
		console.error(`Received error response on Media search`);
		return null;
	}

    return await scrapeSearchResults(await res.text());
};


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
        const { data: searchResults, error, success  } = SearchResult.array().nullable().safeParse(res);
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
};


/**
 * This contains utilities having to do with f95zone.to. 
 */
const f95 = {
    /**
     * Contains all search-related utilities
     */
    search: {
        /**
         * Base URL for search results page. Combined with params like query (q), this
         * can search F95 Media.
         *
         * Reference: https://f95zone.to/search/{cache entry id?}/?q={search query}&c[container_only]=1&o=relevance
         *      c[container_only]=1 Marks "Search first posts and titles only"
         *      c[content]=thread only returns thread pages
         *      o=relevance orders the results by relevance.
         *
         * There's a number after /search/ which someone else on f95 guessed might be
         * a cache entry ID? Without it, you're sent to the search form page instead of results,
         * but apparently giving any number > 0 will auto-correct to the valid number.
         */
        BASE_URL: SEARCH_BASE_URL,
        
        /**
         * Matches search results page.
         */
        URL_REGEX: SEARCH_URL_REGEX,
        
        threadSearchParamsToStr,
        searchThreads,
        scrapeSearchResults,
        
        /**
         * Parameters use for searching
         */
        // params: {
        //     /**
        //      * Configures searches to check titles and the contents of a thread's first post.
        //      */
        //     TITLES_AND_FIRST_POSTS: SEARCH_TITLES_AND_FIRST_POSTS_PARAM,

        //     /**
        //      * Configures searches to only check titles
        //      */
        //     TITLES_ONLY: SEARCH_TITLES_ONLY_PARAM,
        // },
    },

    /**
     * Contains utilities related to threads
     */
    thread: {
        /**
         * Matches a thread url
         */
        URL_REGEX: THREAD_URL_REGEX,

        /**
         * Extracts title and ID from a thread URL into 'title' and 'id' groups, respectively.
         */
        URL_DECONSTRUCTOR: THREAD_URL_DECONSTRUCTOR,

        /**
         * Extracts forum from the "Forums > ..." breadcrumb at the top of threads
         */
        FORUM_REGEX: THREAD_FORUM_REGEX,
    }
} as const;


export default f95;
