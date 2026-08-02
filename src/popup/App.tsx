import { useEffect, useState } from "react";
import { usePromiseModal } from "@prezly/react-promise-modal";

import type { ConflictResolutionPolicy, MediaDownload } from "types/data";

import { 
    ClearKnownDownloadsMessage, GetConflictPolicyMessage, Message, 
    SaveDownloadPopupMessage, ScrapeSearchResultsMessage, ShowImportResultsMessage, 
    UpdateDownloadPopupMessage, type ImportDownloadsMessage 
} from "types/message";

import { LOCAL_STORAGE_KEYS, EXE_FILENAME_REGEX } from "utils/const";
import { binSearch, scrapeSearchResults } from "utils/func";
import ConflictResolutionDialogue from "./ConflictPolicyDialogue/ConflictPolicyDialogue";
import { Button, ButtonGroup, Modal } from "react-bootstrap";
import { NewDownloadConfirm } from "./NewDownloadConfirm/NewDownloadConfirm";
import { UpdateDownloadConfirm } from "./UpdateDownloadConfirm/UpdateDownloadConfirm";


/**
 * Different modes when importing downloads
 */
enum ImportMode {
    /**
     * Includes all items found in the selected directory 
     */
    FULL,

    /**
     * Filters out known downloads
     * 
     * **NOTE** a download is only considered known
     * if it's name is an exact match
     */
    NEW_ONLY
};

// Directory picker options
const DIR_SELECT_OPTIONS: DirectoryPickerOptions  = {
    id: 'import-downloads',
    mode: "read",
} as const;


export function App() {
    // Invokes modal that gets conflict policy
    const collectConflictPolicy = usePromiseModal<
        ConflictResolutionPolicy, 
        { conflicts: GetConflictPolicyMessage['payload'] }
    >(({ show, onSubmit, onDismiss, conflicts }) => (
        <ConflictResolutionDialogue
            show={show}
            onDismiss={onDismiss}
            onSubmit={onSubmit}
            conflicts={conflicts}
        />
    ));

    // Invokes modal that gets confirmation on saving a new download
    const confirmNewDownload = usePromiseModal<boolean, { download: MediaDownload }>(
        ({ show, onSubmit, onDismiss, download }) => (
            <NewDownloadConfirm 
                show={show}
                onDismiss={onDismiss}
                onSubmit={onSubmit}
                download={download}
            />
    ));
    
    // Invokes modal that gets confirmation on updating a download
    const confirmDownloadUpdate = usePromiseModal<boolean, { old: MediaDownload, new: MediaDownload }>(
        ({ show, onSubmit, onDismiss, old, new: newDownload }) => (
            <UpdateDownloadConfirm 
                show={show}
                onDismiss={onDismiss}
                onSubmit={onSubmit}
                old={old} 
                new={newDownload}                
            />
    ));
    

    /**
     * Listens to messages (mostly) from the background script
     */
    useEffect(() => {
        const handleListeners = async (
            message: any, 
            sender: chrome.runtime.MessageSender,
            sendResponse: (response?: any) => void
        ) => {
            
            console.log('Received message in popup');
            
            // Parsing message
            const { 
                data: { action, payload } = {}, 
                error: messageErr, 
                success: isMessage
            } = Message.safeParse(JSON.parse(message));
            
            if ( !isMessage ) {
                console.error(`Popup received incorrectly formatted message:\n${messageErr.message}`);
                return;
            }
            
            // Performing action
            switch (action) {
                // Service worker sent over search results HTML to scrape
                // since service workers don't have DOM access like popups
                case ScrapeSearchResultsMessage.shape.action.value:
                    const html = payload;
                    if ( typeof html !== 'string' ) {
                        console.error(`Received invalid HTML; expected string but received ${typeof html}`);
                        return;
                    } 
                    
                    try {
                        const searchResults = scrapeSearchResults(html);
                        // console.log(JSON.stringify(searchResults, null, 2));  // DEBUG
                        
                        sendResponse(searchResults);
                        
                    } catch (error) {
                        console.error(`Error scraping search results: ${error}`);
                        sendResponse(null);
                    }
                    
                    return true;

                // Triggers a user prompt which determines how
                // duplicate downloads are handled during an import
                // **NOTE** response may be undefined if user cancelled without
                // selecting a policy
                case GetConflictPolicyMessage.shape.action.value:
                    console.log('Getting conflict resolution policy');

                    const { 
                        error: confErr, 
                        success: isConflicts 
                    } = GetConflictPolicyMessage.shape.payload.safeParse(payload);
                    
                    if ( !isConflicts ) {
                        console.error(`Invalid conflicts received: ${confErr.message}`);
                        sendResponse(null);
                    }
                    
                    // console.log('Invoking modal promise');
                    
                    try {
                        const policy = await collectConflictPolicy.invoke({ conflicts: payload });
                        sendResponse(policy);
                        
                    } catch (error) {
                        console.error(`Error getting conflict policy: ${error}`);
                        sendResponse(null);
                    }

                    return true;

                // Shows import results
                case ShowImportResultsMessage.shape.action.value: {
                    const { data: results, error, success } = 
                        ShowImportResultsMessage.shape.payload.safeParse(payload);
                    
                    if (!success) {
                        console.error(`Popup received invalid results:\n${error.message}`);
                        return false;
                    }
                        
                    // TODO better display

                    console.log(`Import results:\n${JSON.stringify(results, null, 2)}`);
                    break;
                }

                case SaveDownloadPopupMessage.shape.action.value: {
                    const { data: download, error, success } = 
                        SaveDownloadPopupMessage.shape.payload.safeParse(payload);
                    
                    if (!success) {
                        console.error(`Popup received invalid new download:\n${error.message}`);
                        return false;
                    }
                    
                    console.log('Creating confirm new download dialogue');
                    let res = await confirmNewDownload.invoke({ download });

                    // A cancel also doesn't save the download
                    if ( res === undefined ) res = false;

                    sendResponse(res);
                    
                    return true;
                }

                case UpdateDownloadPopupMessage.shape.action.value:
                    const { data: { old, new: newDownload } = {}, error, success } = 
                        UpdateDownloadPopupMessage.shape.payload.safeParse(payload);
                    
                    if (!success) {
                        console.error(`Popup received invalid update payload:\n${error.message}`);
                        return false;
                    }
                    
                    console.log('Creating update download dialogue');
                    let res = await confirmDownloadUpdate.invoke({ old: old!, new: newDownload! });
                    
                    // A cancel also doesn't save the download
                    if ( res === undefined ) res = false;

                    sendResponse(res);
                    
                    return true;
            }
        };
        
        // Adding listener when this component mounts
        chrome.runtime.onMessage.addListener(handleListeners);
        
        // Removes listener when unmounting
        return () => {
            chrome.runtime.onMessage.removeListener(handleListeners);
        }
    }, []);
    
    
    /**
     * Begins download import
     */
    async function handleImportDownloads(): Promise<void> {
        let directory: FileSystemDirectoryHandle;
        
        try {
            directory = await window.showDirectoryPicker(DIR_SELECT_OPTIONS);

        } catch (error) {
            console.error(`Unexpected Error: ${error}`);
            return;
        }
        
        console.log(`Selected directory ${directory.name}`);

        const items = new Set<string>();

        for await (const item of directory.values()) {
            // Files must be executables, anything else is
            // assumed to not be a game file
            // TBD on if this is a good idea
            if ( item.kind === 'directory' || EXE_FILENAME_REGEX.test(item.name) ) {
                // console.log('Adding ', item.name);
                items.add(item.name.replace(/\.exe/i, ''));
            }
        }
        
        // TBD and TODO this better
        // switch (importMode) {
        //     case ImportMode.FULL:
        //         break;

        //     // Filtering out existing downloads
        //     case ImportMode.NEW_ONLY:
        //         const downloads: Record<number, MediaDownload> = 
        //             await chrome.storage.local.get(LOCAL_STORAGE_KEYS.DOWNLOADS);

        //         const records = Object.values(downloads);
        //         records.sort((a, b) => a.name.localeCompare(b.name));
                
        //         items = items.filter( i => !!binSearch(records, (r) => i.localeCompare(r.name)) );
                
        //         break;
        
        //     default:
        //         throw new Error(`Unhandled ImportMode: ${importMode}`);
        // }
        
        // console.log(`Found sub-directories:\n${JSON.stringify(Array.from(items), null, 2)}`);

        const message: ImportDownloadsMessage = {
            action: 'import-downloads',
            payload: Array.from(items),
        };

        chrome.runtime.sendMessage(JSON.stringify(message));
    }

    /**
     * TODO tells background to sync downloads
     * based on selected directory.
     */
    async function handleSyncDownloads(): Promise<void> {

    }
    
    /**
     * TMP tells background to clear downloads
     */
    async function handleDeleteDownloads(): Promise<void> {
        const message: ClearKnownDownloadsMessage = {
            action: 'clear-known-downloads',
            payload: null
        };
        
        const res = await chrome.runtime.sendMessage(JSON.stringify(message));
        // TODO handle response if there is one
    }
    

    // Popup only contains a dialogue's modal if its active
    const activeDialogue = [collectConflictPolicy, confirmNewDownload, confirmDownloadUpdate]
        .filter(d => d.isDisplayed)
        .at(0);

    const content = ( !!activeDialogue )
        ? activeDialogue.modal
        : (<>
            <ButtonGroup>
                <Button id="import-button" onClick={handleImportDownloads} type="submit">
                    Import Downloads
                </Button>
                <Button id="delete-downloads" onClick={handleDeleteDownloads} type="reset">
                    Delete Downloads
                </Button>
            </ButtonGroup>
        </>)
    
    return (<>
        <div className="w-80 p-6">
            <h1 className="text-2xl">F95 Highlighter</h1>
            <div className="p-2">
                { content }
            </div>
		</div>
    </>);
}


export default App;
