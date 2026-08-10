import { useEffect, useState } from "react";
import { usePromiseModal } from "@prezly/react-promise-modal";

import type { ConflictResolutionPolicy, ImportResults } from "types/data";

import { 
    ClearKnownDownloadsMessage, GetConflictPolicyMessage, ImportStatusMessage, Message, 
    ScrapeSearchResultsMessage, ShowImportResultsMessage, 
    type ImportDownloadsMessage 
} from "types/message";

import { EXE_FILENAME_REGEX } from "utils/const";
import { scrapeSearchResults } from "utils/func";
import ConflictResolutionDialogue from "../ConflictPolicyDialogue/ConflictPolicyDialogue";
import { Button, ButtonGroup, ProgressBar, Spinner } from "react-bootstrap";
import ImportResultsDisplay from "components/ImportResultsDisplay/ImportResultsDisplay";


// Directory picker options
const DIR_SELECT_OPTIONS: DirectoryPickerOptions  = {
    id: 'import-downloads',
    mode: "read",
} as const;


/**
 * TODO
 * 
 *  1) Show import results in temp popup
 *      a) Num scanned, failed items, etc.
 *      b) Collapsable button revealing scrollable list of which items failed
 *      (and what search query was used for them?)
 */
export function DownloadManager(args: {
    isBusy?:             boolean,
    // setIsBusy:          (x: boolean) => void,
}) {
    
    const [isBusy, setIsBusy] = useState(!!args.isBusy);
    const [importStatus, setImportStatus] = useState<ImportStatusMessage['payload']>()
    
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

    // Invokes popup displaying import results
    const showImportResults = usePromiseModal<
        void, 
        { results: ImportResults }
    >(({ show, onSubmit, onDismiss, results }) => (
        <ImportResultsDisplay 
            show={show} 
            onSubmit={onSubmit} 
            onDismiss={onDismiss} 
            results={results}
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
            
            // console.log('Received message in DownloadManager');
            
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
                    
                    setIsBusy(true);
                    setImportStatus(undefined);
                    await showImportResults.invoke({ results });
                    setIsBusy(false);
                    
                    // console.log(`Import results:\n${JSON.stringify(results, null, 2)}`);
                    break;
                }

                case ImportStatusMessage.shape.action.value: {
                    const { data: status, error, success } =    
                        ImportStatusMessage.shape.payload.safeParse(payload);
                        
                    if (!success) {
                        console.error(`Popup received broken import-status heartbeat:\n${error.message}`);
                        return false;
                    }
                    
                    // TODO update progress bar
                    console.log(`Heartbeat:\n${JSON.stringify(payload, null, 2)}`);
                    setImportStatus(status);
                        
                    break;
                }
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
        setIsBusy(true);
        
        let directory: FileSystemDirectoryHandle;
        
        try {
            directory = await window.showDirectoryPicker(DIR_SELECT_OPTIONS);

        } catch (error) {
            console.error(`Unexpected Error: ${error}`);
            setIsBusy(false);
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

        await chrome.runtime.sendMessage(JSON.stringify(message));
        
        setIsBusy(false);
    }

    /**
     * TODO tells background to sync downloads
     * based on selected directory.
     */
    // async function handleSyncDownloads(): Promise<void> {

    // }
    
    /**
     * TMP tells background to clear downloads
     */
    async function handleDeleteDownloads(): Promise<void> {
        setIsBusy(true);
        
        const message: ClearKnownDownloadsMessage = {
            action: 'clear-known-downloads',
            payload: null
        };
        
        const res = await chrome.runtime.sendMessage(JSON.stringify(message));
        // TODO handle response if there is one

        setIsBusy(false);
    }
    

    // Popup only contains a dialogue's modal if its active
    const activeDialogue = [collectConflictPolicy, showImportResults]
        .filter(d => d.isDisplayed)
        .at(0);

    let content: JSX.Element;
    
    // Showing progress bar for import status
    if ( !!importStatus ) {
        const ratio = Math.round((importStatus.processed / importStatus.total) * 100);
        console.log('Progress ratio: ', ratio);

        content = (
            <div className="vw-100 p-4">
                <ProgressBar 
                    striped animated visuallyHidden
                    variant="info"
                    now={ratio} max={importStatus.total}
                    />
            </div>
        );
        
    // Showing spinner for misc busy status
    } else if ( isBusy ) {
        content = <Spinner animation="border" variant="primary"/>;
    
    // Standard content for deleting and importing    
    } else {
        content = (<>
            <ButtonGroup size="sm">
                <Button id="import-button" onClick={handleImportDownloads} type="submit">
                    Import Downloads
                </Button>
                <Button id="delete-downloads" onClick={handleDeleteDownloads} type="reset">
                    Delete Downloads
                </Button>
            </ButtonGroup>
        </>);
    }
    
    return (
        <div 
            className='d-flex align-items-center justify-content-center'
            style={{ height: ( !!activeDialogue ) ? '350px' : '100px' }}>

            <div className="container d-flex align-items-center justify-content-center">
                {content}
            </div>
            
            {activeDialogue?.modal}
        </div>
    );
}


export default DownloadManager;
