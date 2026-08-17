import { MediaDownload, type Media } from "types/data";
import type { SaveDownloadMessage, UpdateDownloadMessage } from "types/message";
import { getOrInitDownloads, getThreadMedia } from "utils/func";

// console.log("thread page content script loaded");

/**
 * Matches internal links; some are masked via a redirect
 * page so there's an extra lookahead
 */
const INTERNAL_LINK_REGEX = /^https:\/\/f95zone.to\/(?!masked)/i;

/**
 * Labels of link lists unlikely to be downloads
 */
const LINK_LIST_BLACKLIST = /patch(?:es)?|extras?|/i   

/**
 * Labels of link lists unlikely to be downloads
 */
const LINK_NAME_BLACKLIST = /dlsite|ci-en|fantia|pixiv|twitter|steam|website|ko-?fi|itch\.?io|discord|trello|liberapay|patreon|walkthrough|patch|bonus|gog|(?<!.)x(?!.)|bluesky|7zip/i


async function handleDownloadLinkClicked(media: Media) : Promise<void> {
    // console.log("Download link clicked");

    const downloads = await getOrInitDownloads();
    if ( downloads === null ) {
        console.error('Downloads not initialized');
        return;
    }
    
    // DEBUG
    // console.log(`Downloads: ${JSON.stringify(downloads, null, 2)}`);
    
    // Sending 'update' message if existing download
    // with certainty < 1.0; otherwise, 'addNew' message.
    // The user confirming to update is assumed to mean
    // that it's a correct match.
    const existingDownload = downloads[+media.mediaId];
    const newDownload: MediaDownload = {
        name: media.title,
        certainty: 1.0,
        deleted: false,
        media,
    };

    // DEBUG
    // console.log(`Existing download: ${JSON.stringify(existingDownload, null, 2)}`);  
    
    let msg: UpdateDownloadMessage | SaveDownloadMessage;
    
    // New download
    if ( !!!existingDownload ) {
        msg = {
            action: 'save-download-prompt',
            payload: newDownload
        };
        
    // Existing download has different name or lower certainty;
    // asks user if they want to update to new info
    } else if ( existingDownload.name !== newDownload.name || existingDownload.certainty < 1.0 ) {
        msg = {
            action: 'update-download-prompt',
            payload: {
                old: existingDownload,
                new: newDownload,
            }
        };

    // Nothing happens otherwise
    } else return;
    
    await chrome.runtime.sendMessage(JSON.stringify(msg));
}


async function main(): Promise<void> {
    
    // First check if the media on this page is already a known download
    const media = getThreadMedia(document);
    if ( media === null ) {
        // TODO popup?
        console.error('Failed to get page media');
        return;
    }
    
    const linkEls = document.querySelectorAll('article article div span a.link, div.message-userContent article a.link');
    
    // Filtering unlikely links
    // This could just be a forEach, it's only done like this for the debug log.
    const downloadLinks = Array.from(linkEls).filter(l => {
        const textContent = l.textContent;

        // Checking for blacklisted link names
        if ( LINK_NAME_BLACKLIST.test(textContent) ) {
            // console.log(`Removed ${textContent} due to blacklisted name`);
            return false;
        }
        
        // Checking if inside blacklisted link list
        const parentEl = l.parentElement;
        const parentLabel = parentEl?.childNodes.item(0).textContent;
        if ( parentEl?.tagName === 'span' && parentLabel && LINK_LIST_BLACKLIST.test(parentLabel) ) {
            // console.log(`Removed ${textContent} due to blacklisted parent label ${parentLabel}`);
            return false;
        }
        
        // Checking if internal link
        const href = l.getAttribute('href');
        if ( href === null || INTERNAL_LINK_REGEX.test(href) ) {
            // console.log(`Removed ${textContent} due to internal link ${href}`);
            return false;
        }
        
        // Adding click-handling listener
        l.addEventListener('click', () => handleDownloadLinkClicked(media));
        
        return true;
    });

    // DEBUG
    // console.log(`${downloadLinks.length} Links post download filter: ${JSON.stringify(downloadLinks.map(l => l.textContent))}`);
}


main().catch((err) => console.error(`Error reading threadpage: ${err}`));
