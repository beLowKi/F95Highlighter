import type { AddDownloadsMessage, RemoveDownloadsMessage } from "types/message";
import { Media, MediaDownload, MediaType } from "types/data";
import { THREAD_LINK_MEDIA_ID_REGEX } from "utils/const";
import { getOrInitDownloads, getOrInitSettings } from "utils/func";

import styles from 'latestUpdates.module.css';
import meta, { LocalStorage, Settings } from "./utils/meta";


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
 * Returns the mediaType currently being shown
 */
function getCurrentMediaType(): MediaType | null {
    const categoryEl = document.getElementById('filter-block_cat');
    if ( categoryEl === null ) {
        console.error('Failed to find category Element');
        return null;
    }

    // The category element has a list of buttons, and the selected
    // has the 'filter-selected' class
    const selectedEl = categoryEl.querySelector('div.filter-block_content div:has(a.filter-selected)');
    if ( selectedEl === null ) {
        console.error('Failed to get selected element');
        return null;
    }

    // Converting text to MediaType
    const text = selectedEl.textContent.trim().toLowerCase();
    
    switch ( text ) {
        case 'games':
            return 'GAMES';
            
        case 'comics':
            return 'COMICS & STILLS';
        
        case 'animations':
            return 'ANIMATIONS & LOOPS'
        
        // This'll trigger for assets and mods
        default:
            return null;
    }
}


/**
 * Gets the Media represented by the given Media tile.
 * Returns null if not a valid media tile.
 */
function getTileMedia( tile: HTMLDivElement ): Media | null {
    // mediaId, title, threadLink, mediaType?

    // There should only be a single child which is an <a>
    // tag containing the rest of the tile
    const linkEl = tile.getElementsByTagName('a').item(0);
    if ( linkEl === null ) {
        return null;
    } 

    // This tag's href is its thread's URL without a title.
    // e.g., https://f95zone.to/threads/123456
    const threadLink = linkEl.href;
    const mediaId = THREAD_LINK_MEDIA_ID_REGEX.exec(threadLink)?.at(0);
    if ( mediaId === undefined ) {
        return null;
    }

    const titleEl = tile.querySelector('header div h2');
    if ( titleEl === null ) {
        return null;
    }
    
    const mediaType = getCurrentMediaType();

    return {
        mediaId: +mediaId,
        title: titleEl.textContent,
        threadLink, 
        mediaType: mediaType || undefined
    }
}


/**
 * Returns a fully functioal download button 
 * for either adding or removing.
 */
function getDownloadButton( tile: HTMLDivElement, type: 'add' | 'remove' ): HTMLButtonElement {
    const el = document.createElement('button');
    el.classList.add(styles.downloadButton);
    el.textContent = ( type === 'add' ) ? '+' : '-';

    // Adding onclick handler
    el.addEventListener('click', (event) => {
        event.stopPropagation();  // prevents parent from receiving click event

        // DEBUG
        // const titleEl = tile.querySelector('header div h2');
        // console.log(`Clicked add-download button for ${titleEl?.textContent}`);
        
        const media = getTileMedia(tile);
        if ( media === null ) {
            console.error(`Failed to create Media from tile`);
            return;
        }
    
        let msg: AddDownloadsMessage | RemoveDownloadsMessage;
        
        // Adding new download
        if ( type === 'add' ) {
            msg = {
                action: 'add-downloads',
                payload: {
                    [media.mediaId]: {
                        media,
                        name: media.title,
                        certainty: 1.0,
                        deleted: false
                    }
                }
            };
        
        // Removing a download
        } else {
            msg = {
                action: 'remove-downloads',
                payload: [media.mediaId]
            };
        }
        
        chrome.runtime.sendMessage(JSON.stringify(msg));
    });

    return el;
}


/**
 * Updates a Media tile <div>'s style based on the given download.
 */
function updateTile(tile: HTMLDivElement, download?: MediaDownload) {

    // Removing existing button
    const hasBtn = Array.from(tile.children).some(
        el => el.classList.contains(styles.downloadButton)
    );

    if ( hasBtn ) {
        const btn = tile.getElementsByClassName(styles.downloadButton).item(0);
        btn?.remove();
    }

    // Adding 'add/remove-download' button
    const btn = getDownloadButton(tile, (!!!download) ? 'add' : 'remove');
    tile.appendChild(btn);
    
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
    // This element is a child of the page 
    // wrapper and contains all the Media tiles
    const itemWrapper = document.getElementById("latest-page_items-wrap_inner");
    if ( itemWrapper === null ) {
        console.error('Failed to find item wrapper');
        return;
    }

    // ELement containing category-select buttons
    const categoryEl = document.getElementById('filter-block_cat');
    if ( categoryEl === null ) {
        console.error('Failed to find category Element');
        return;
    }

    
    // Initial load of downloads and settings
    getOrInitDownloads().then(res => downloads = res);
    getOrInitSettings().then(res => highlights = res.highlights);
    
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
        // Doesn't bother listening to mutations
        // unless the category is a valid MediaType
        // const mtype = getCurrentMediaType();
        // if ( mtype === null ) return; 
        
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
        if ( meta.LOCAL_STORAGE_KEYS.DOWNLOADS in changes ) {
            downloads = changes[meta.LOCAL_STORAGE_KEYS.DOWNLOADS].newValue;
            queueUpdate(new AbortController().signal);
        }
        
        // Highlight settings were changed
        if ( 
            meta.LOCAL_STORAGE_KEYS.SETTINGS in changes && 
            'highlights' in changes[meta.LOCAL_STORAGE_KEYS.SETTINGS].newValue
        ) {
            highlights = changes[meta.LOCAL_STORAGE_KEYS.SETTINGS].newValue.highlights;
            queueUpdate(new AbortController().signal);
        }
    });
    
    // Gets category-select buttons so that tile updates can be turned off
    // when showing unsupported media like assets and mods
    const categorySelectButtons = 
        categoryEl.querySelectorAll('div.filter-block_content div:has(a.filter-block_button)');
    
    categorySelectButtons.forEach(el => {
        el.addEventListener('click', async () => {
            const text = el.textContent.trim().toLowerCase();
            const isValidType = ['games', 'animations', 'comics'].includes(text);

            // console.log(`Clicked ${text}; is valid type: ${isValidType}`);

            if ( isValidType ) {
                mediaTileObservor.observe(itemWrapper, { childList: true });     

                // Triggers immediate update when connecting observor
                // NOTE I wish there was an easy to check if the observor
                // is already connected, but, since repeated calls to this
                // overwrite each other, it shouldn't be a big deal.
                const controller = new AbortController();
                await queueUpdate(controller.signal);

            } else {
                mediaTileObservor.disconnect();
            }
        });
    });
    
    // Initial update connection if showing supported MediaType
    const mtype = getCurrentMediaType();
    if ( mtype !== null ) mediaTileObservor.observe(itemWrapper, { childList: true });
}


main().catch((err) => console.error(`F95Highlighter Error :${err}`));
