import { MediaDownload, MediaType, type Media } from "types/data";
import type { SaveDownloadMessage, UpdateDownloadMessage } from "types/message";
import { THREAD_LINK_MEDIA_ID_REGEX } from "utils/const";
import { getUserDownloads } from "utils/func";

// console.log("thread page content script loaded");


/**
 * Returns the Media on this page
 */
function getPageMedia(): Media | null {
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


async function handleDownloadLinkClicked(media: Media) : Promise<void> {
    console.log("Download link clicked");

    /**
     *      1) Message popup so it can do 'Would you like to save this download?' prompt
     *      2) Response should be boolean YES|NO
     *      3) If NO: return
     *      4) Create MediaDownload
     *      5) Save download to storage
     */

    const downloads = await getUserDownloads();
    if ( downloads === null ) {
        console.error('Downloads not initialized');
        return;
    }
    
    // Sending 'update' message if existing download
    // with certainty < 1.0; otherwise, 'addNew' message.
    // The user confirming to update is assumed to mean
    // that it's a correct match.
    const existingDownload = downloads[media.mediaId];
    const newDownload: MediaDownload = {
        name: media.title,
        mediaId: media.mediaId,
        certainty: 1.0,
        deleted: false
    };

    if ( !!existingDownload && existingDownload.certainty < 1.0 ) {
        const msg: UpdateDownloadMessage = {
            action: 'update-download-prompt',
            payload: {
                old: existingDownload,
                new: newDownload,
            }
        }

        console.log('Existing download found; sending update prompt message');
        await chrome.runtime.sendMessage(JSON.stringify(msg));
    
    } else {
        const msg: SaveDownloadMessage = {
            action: 'save-download-prompt',
            payload: newDownload
        };

        console.log('No existing download found; sending save download prompt message');
        await chrome.runtime.sendMessage(JSON.stringify(msg));
    }
}


async function main(): Promise<void> {
    
    // TODO first check if the media on this page is already a known download
    const media = getPageMedia();
    if ( media === null ) {
        console.error('Failed to get page media');
        return;
    }

    // const downloads = await getUserDownloads();
    // if ( downloads === null ) {
    //     console.error('Downloads not initialized');
    //     return;
    // }
    
    // if ( media.mediaId in downloads ) {
    //     console.log('Media on this page is already downloaded');  // DEBUG
    //     return;
    // }
    
    const linkEls = document.querySelectorAll('article article div span a.link, div.message-userContent article a.link');
    console.log(`Found ${linkEls.length} linkEls`);

    // const test = Array.from(linkEls).map(l => l.textContent);
    // console.log(JSON.stringify(test));

    // Matches internal links; some are masked via a redirect
    // page so there's an extra lookahead
    const internalLinkRe = /^https:\/\/f95zone.to\/(?!masked)/i;  

    // Labels of link lists unlikely to be downloads
    const linkListBlacklist = /patch(?:es)?|extras?|/i          

    // Link names that usually aren't downloads
    const linkNameBlacklist = /dlsite|ci-en|fantia|pixiv|twitter|steam|website|discord|walkthrough|patch|bonus|patreon|gog|(?<!.)x(?!.)|bluesky|7zip/i
    
    // Filtering unlikely links
    // This could just be a forEach, it's only done like this for the debug log.
    const downloadLinks = Array.from(linkEls).filter(l => {
        const textContent = l.textContent;

        // Checking for blacklisted link names
        if ( linkNameBlacklist.test(textContent) ) {
            // console.log(`Removed ${textContent} due to blacklisted name`);
            return false;
        }
        
        // Checking if inside blacklisted link list
        const parentEl = l.parentElement;
        const parentLabel = parentEl?.childNodes.item(0).textContent;
        if ( parentEl?.tagName === 'span' && parentLabel && linkListBlacklist.test(parentLabel) ) {
            // console.log(`Removed ${textContent} due to blacklisted parent label ${parentLabel}`);
            return false;
        }
        
        // Checking if internal link
        const href = l.getAttribute('href');
        if ( href === null || internalLinkRe.test(href) ) {
            // console.log(`Removed ${textContent} due to internal link ${href}`);
            return false;
        }
        
        // Adding click-handling listener
        l.addEventListener('click', () => handleDownloadLinkClicked(media));
        
        return true;
    });

    // DEBUG
    console.log(`${downloadLinks.length} Links post download filter: ${JSON.stringify(downloadLinks.map(l => l.textContent))}`);
}


main().catch((err) => console.error(`Error reading threadpage: ${err}`));
