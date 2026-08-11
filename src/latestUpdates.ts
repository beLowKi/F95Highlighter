import { LocalStorage, MediaDownload, Settings } from "types/data";
import { LOCAL_STORAGE_KEYS } from "utils/const";
import { getUserDownloads, getUserSettings } from "utils/func";

// console.log("latest updates content script loaded");

// TODO it'd be cool if there was a 'click to add' feature
// where clicking a Media tile adds it as a download.
// I'm thinking a toggle in the popup that also prevents
// it from closing when clicked off of?

// Stores the colors used to show different certainties
let highlights: Settings['highlights'] = {
    uncertainColor:     '',
    lowCertaintyColor:  '',
    midCertaintyColor:  '',
    highCertaintyColor: ''    
};

// Stores Media downloads
let downloads: LocalStorage['downloads'];


/**
 * Updates a Media tile <div>'s style based on the given download.
 */
function updateTile(tile: HTMLDivElement, download?: MediaDownload) {

    // Resetting inline style
    if ( download === undefined ) {
        tile.style.padding = '0';
        tile.style.backgroundColor = '';
        return;
    }
    
    // DEBUG
    // const titleEl = tile.querySelector('header div h2');
    // console.log(`Updating tile for ${titleEl?.textContent}`);
    
    // TODO make this customizable
    tile.style.padding = '4px';
    
    if ( download.certainty >= 0.8 ) {
        tile.style.backgroundColor = highlights.highCertaintyColor;
        
    } else if ( download.certainty >= 0.65 ) {
        tile.style.backgroundColor = highlights.midCertaintyColor;

    } else if ( download.certainty > 0.5 ) {
        tile.style.backgroundColor = highlights.lowCertaintyColor;

    } else {
        tile.style.backgroundColor = highlights.uncertainColor;
    }
}


/**
 * Updates the tiles of the itemWrapper.
 * This is called when media tiles are loaded
 */
async function updateTiles( itemWrapper: HTMLElement ) {
    // Every div in item wrapper represents a Media
    // and it should have an attribute called 'data-thread-id' which
    // contains the its Media's ID. It also has a single <a> tag child
    // which has a thread page link containing the same ID.
    // const mediaTiles = itemWrapper.getElementsByTagName('div');
    const mediaTiles = [...itemWrapper.children] as HTMLDivElement[];
    // console.log(`Found ${mediaTiles.length} media tiles`);
    
    let i = 0;

    for (const tile of mediaTiles) {
        i++;
        
        const idAttr = tile.getAttribute('data-thread-id');
        if ( idAttr === null ) {
            // console.log(`Failed to find idAttr of tile #${i + 1}`)
            continue;
        }
        
        // Finding matching download
        const mediaId = Number(idAttr);
        const download = downloads[mediaId];
        
        try {
            updateTile(tile, download);
        } catch (error) {
            console.error(`Error updating tile #${i}: ${error}`);    
        }
    }
}   


async function main(): Promise<void> {
    // Parent of the element containing Media tiles
    // This changes when switching categories (games, comics, animations) or pages
    // and is used to re-observe the itemWrapper.
    // const pageWrapper = document.getElementById('latest-page_items-wrap');
    // if ( pageWrapper === null ) {
    //     console.error('Failed to find page wrapper');
    //     return;
    // }
    
    // This element is a child of the page 
    // wrapper and contains all the Media tiles
    const itemWrapper = document.getElementById("latest-page_items-wrap_inner");
    if ( itemWrapper === null ) {
        console.error('Failed to find item wrapper');
        return;
    }
    
    // Initial load of downloads and settings
    getUserDownloads().then(res => downloads = res);
    getUserSettings().then(res => highlights = res.highlights);
    
    // highlights = ( await getUserSettings() ).highlights;

    // Tracks number of media tiles updated
    let numTilesUpdated = 0;
    
    // Queues an update
    const queueUpdate = ( signal: AbortSignal ) => {
        return new Promise<void>((res, rej) => {
            if ( signal.aborted ) {
                return rej();
            }
            
            const taskId = setTimeout(async () => {
                updateTiles(itemWrapper);
                numTilesUpdated = itemWrapper.children.length;
                res();
            }, 500);
            
            const onAbort = () => {
                cleanup();
                rej(signal.reason);
            }

            function cleanup() {
                clearTimeout(taskId);
                signal.removeEventListener('abort', onAbort);
            }
            
            signal.addEventListener('abort', onAbort);
        })
    }
    
    // Media tiles are loaded asynchronously, so an observor is
    // needed to update displays as they appear.
    const mediaTileObservor = new MutationObserver(async (mutations, observor) => {
        for (const mutation of mutations) {
            if ( mutation.type !== 'childList' ) continue;
            
            // Doesn't rescan unless number of tiles has changed
            // NOTE I tried having observor disconnect when this happens--
            // reconnecting it after a reload like when changing category, page, etc. --
            // but I couldn't figure out a way to detect this. This works for now,
            // but it does mean the observor is checking a bunch of unecessary mutations.
            const nodeCount = itemWrapper.children.length;
            if ( numTilesUpdated === nodeCount ) {
                return;
            }
            
            try {
                const controller = new AbortController();
                await queueUpdate(controller.signal);
                
            } catch (error) {
                // console.error(`Error updating Media tiles: ${error}`);
            }
        }
    });
    
    // Updates downloads and highlight colors whenever storage 
    // changes and triggers a tile update
    chrome.storage.local.onChanged.addListener(async (changes) => {
        // Downloads were changed
        if ( LOCAL_STORAGE_KEYS.DOWNLOADS in changes ) {
            downloads = changes[LOCAL_STORAGE_KEYS.DOWNLOADS].newValue;
            queueUpdate(new AbortController().signal);
        }
        
        // Highlight settings were changed
        if ( 
            LOCAL_STORAGE_KEYS.SETTINGS in changes && 
            'highlights' in changes[LOCAL_STORAGE_KEYS.SETTINGS].newValue
        ) {
            highlights = changes[LOCAL_STORAGE_KEYS.SETTINGS].newValue.highlights;
            queueUpdate(new AbortController().signal);
        }
    });
    
    mediaTileObservor.observe(itemWrapper, { childList: true });
}


main().catch((err) => console.error(`F95Highlighter Error :${err}`));
