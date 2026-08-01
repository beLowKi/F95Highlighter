import { LocalStorage, MediaDownload } from "types/data";
import { LOCAL_STORAGE_KEYS } from "utils/const";
import { getUserDownloads } from "utils/func";

console.log("latest updates content script loaded");


/**
 * Updates a Media tile <div>'s style based on the given download.
 */
function updateTile(tile: HTMLDivElement, download?: MediaDownload) {
    if ( download === undefined ) {
        // TBD I think media without a download should
        // just display as normal
        return;
    }
    
    // DEBUG
    const titleEl = tile.querySelector('header div h2');
    console.log(`Updating tile for ${titleEl?.textContent}`);
    
    // TODO make this customizable
    tile.style.padding = '3px';
    
    if ( download.certainty >= 0.8 ) {
        tile.style.backgroundColor = "#0F0";
        
    } else if ( download.certainty >= 0.65 ) {
        tile.style.backgroundColor = '#FF0';

    } else if ( download.certainty > 0.5 ) {
        tile.style.backgroundColor = 'rgb(255, 90, 0)';

    } else {
        tile.style.backgroundColor = '#F00';
    }
}


/**
 * Updates the tiles of the itemWrapper.
 * This is called when media tiles are loaded
 * 
 * TODO find a way for this not to trigger 30+ times per page?
 */
function updateTiles(itemWrapper: HTMLElement, downloads: LocalStorage['downloads']) {
    // Every div in item wrapper represents a Media
    // and it should have an attribute called 'data-thread-id' which
    // contains the its Media's ID. It also has a single <a> tag child
    // which has a thread page link containing the same ID.
    // const mediaTiles = itemWrapper.getElementsByTagName('div');
    const mediaTiles = [...itemWrapper.children] as HTMLDivElement[];
    console.log(`Found ${mediaTiles.length} media tiles`);
    
    let i = 0;

    for (const tile of mediaTiles) {
        i++;
        
        const idAttr = tile.getAttribute('data-thread-id');
        if ( idAttr === null ) {
            console.log(`Failed to find idAttr of tile #${i + 1}`)
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
    
    // Getting downloads
    const downloads = await getUserDownloads();
    if ( downloads === null ) {
        console.error('Downloads not initialized');
        return;
    }
    
    // Tracks number of media tiles updated
    let numTilesUpdated = 0;
    
    // Queues an update
    const queueUpdate = ( signal: AbortSignal ) => {
        return new Promise<void>((res, rej) => {
            if ( signal.aborted ) {
                return rej();
            }
            
            const taskId = setTimeout(() => {
                updateTiles(itemWrapper, downloads);
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
    
    mediaTileObservor.observe(itemWrapper, { childList: true });
}


main().catch((err) => console.error(`F95Highlighter Error :${err}`));
