import { useEffect, useState } from "react";
import { usePromiseModal } from "@prezly/react-promise-modal";

import { LocalStorage, MediaDownload, type ConflictResolutionPolicy, type ImportResults } from "types/data";

import { 
    ClearKnownDownloadsMessage, GetConflictPolicyMessage, ImportStatusMessage, Message, 
    ScrapeSearchResultsMessage, ShowImportResultsMessage, 
    type ImportDownloadsMessage 
} from "types/message";

import { EXE_FILENAME_REGEX, LOCAL_STORAGE_KEYS, THREAD_LINK_MEDIA_ID_REGEX, THREAD_URL_REGEX, THREAD_URL_TITLE_REGEX } from "utils/const";
import { getCurrentTab, getUserDownloads, scrapeSearchResults } from "utils/func";
import ConflictResolutionDialogue from "../ConflictPolicyDialogue/ConflictPolicyDialogue";
import { Button, ButtonGroup, Image, ProgressBar, Row, Spinner } from "react-bootstrap";
import ImportResultsDisplay from "components/ImportResultsDisplay/ImportResultsDisplay";
import { waitFor } from "utils";

import checkIcon from "../../../public/icons/check.png";
import xIcon from "../../../public/icons/remove.png";
import styles from "./DownloadManager.module.css";


/**
 * Directory picker options
 */
const DIR_SELECT_OPTIONS: DirectoryPickerOptions  = {
    id: 'import-downloads',
    mode: "read",
} as const;

/**
 * Heights that the component resizes to  
 * when certain dialogues are visibla
 */
const DIALOGUE_HEIGHTS = {
    CONFLICT_POLICY: '300px',
    IMPORT_RESULTS: '450px'
} as const;



/**
 * Handles download-related features of the popup
 * like importing and deleting.
 */
export function DownloadManager(args: { isBusy?: boolean }) {
    const [isBusy, setIsBusy] = useState(!!args.isBusy);
    const [importStatus, setImportStatus] = useState<ImportStatusMessage['payload']>()
    const [isThreadPage, setIsThreadPage] = useState(false);
    const [pageDownload, setPageDownload] = useState<MediaDownload|null>(null);

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
            results={results}/>
    ));
    

    /**
     * Listens to messages (mostly) from the background script
     */
    useEffect(() => {

        // Listens to runtime events from the background
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
                    setImportStatus(undefined);

                    // Pause for pizazz
                    await waitFor(100);
                    
                    try {
                        const policy = await collectConflictPolicy.invoke({ conflicts: payload });
                        sendResponse(policy);
                        
                    } catch (error) {``
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
        
        // TODO should update pageDownload
        // when download storage changes
        const storageListener = async ( changes: { [key: string]: chrome.storage.StorageChange } ) => {
            if ( LOCAL_STORAGE_KEYS.DOWNLOADS in changes ) {
                const { newValue } = changes[LOCAL_STORAGE_KEYS.DOWNLOADS];
                
                const { data: downloads, error, success } = 
                    LocalStorage.shape.downloads.safeParse(newValue);

                if ( !success ) {
                    console.error(`Broken downloads received in DownloadManager storageListener:\n${error.message}\n${JSON.stringify(changes, null, 2)}`);
                    return;
                }

                console.log(JSON.stringify(newValue, null, 2));
                
                await checkThreadPage(downloads);
            }
        };
        
        // Adding listener when this component mounts
        chrome.runtime.onMessage.addListener(handleListeners);
        chrome.storage.local.onChanged.addListener(storageListener)
        
        // Triggers first page check
        checkThreadPage().catch(err => console.error(`Error during initial load of page media: ${err}`));
        
        // Removes listener when unmounting
        return () => {
            chrome.runtime.onMessage.removeListener(handleListeners);
            chrome.storage.local.onChanged.removeListener(storageListener)
        }
    }, []);
    

    /**
     * Checks if current tab is a thread page and
     * updates display if it is
     */
    async function checkThreadPage(userDownloads?: LocalStorage['downloads']): Promise<void> {
        console.log('Re-checking current tab');
        
        const tab = await getCurrentTab();

        if ( !(!!tab && !!tab.url) ) {
            console.error('Failed to get Tab.url; may be due to lack of \'tabs\' permissions');
            return;
        }
        
        // Checking if tab has valid thread page URL
        if ( !THREAD_URL_REGEX.test(tab.url) ) {
            console.error(`${tab.url} did not match thread URL regex`);
            return;
        }

        // Tab is a thread page, so we check
        // if this media is downloaded
        const mediaId = THREAD_LINK_MEDIA_ID_REGEX.exec(tab.url)?.at(0);
        if ( mediaId === undefined ) {
            console.error(`Failed to get mediaId from ${tab.url}`);
            setIsThreadPage(false);
            setPageDownload(null);
            return;
        }
        
        setIsThreadPage(true)

        // Getting download to update content
        const downloads = (!!userDownloads) 
            ? userDownloads
            : await getUserDownloads();
        
        const d = downloads[+mediaId];
        setPageDownload((!!d) ? d : null);
    }
    
    
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
        // setIsBusy(true);
        
        const message: ClearKnownDownloadsMessage = {
            action: 'clear-known-downloads',
            payload: null
        };
        
        const res = await chrome.runtime.sendMessage(JSON.stringify(message));
        // TODO handle response if there is one

        // setIsBusy(false);
    }

    /**
     * Handles when the user toggles the download status of a thread's Media.
     */
    async function handleDownloadToggle(): Promise<void> {
        const downloads = await getUserDownloads();
        
        if ( pageDownload === null ) {
            console.log('Creating download');
            
            // let media: Media | null | undefined;
            const tab = await getCurrentTab();
            
            // Creating a download from the name 
            // and ID contained in every thread page's URL
            let download: MediaDownload;
            try {
                // tab.url requires 'tabs' permission in 
                // manifest to not be undefined
                const url = tab.url;
                if ( url === undefined ) {
                    console.error('Undefined tab url; potentially due to missing \'tabs\' permission in manifest');
                    return;
                }
                
                const mediaId = Number(THREAD_LINK_MEDIA_ID_REGEX.exec(url)?.at(0));
                const title = THREAD_URL_TITLE_REGEX.exec(url)?.at(0);
                if ( isNaN(mediaId) || title === undefined ) {
                    console.error(`Failed to find mediaId and/or name from url ${url}`);
                    return;
                }
                
                download = {
                    name: 'n/a',
                    media: {
                        mediaId, 
                        title,
                        threadLink: url
                    },
                    certainty: 1.0,
                    deleted: false,
                }
                
            } catch (error) {
                console.error(`Error creating download: ${error}`);
                return;
            }
            
            // DEBUG
            console.log(`Created Download:\n${JSON.stringify(download, null, 2)}`);
            
            setPageDownload(download);
            downloads[download.media.mediaId] = download;
    
        } else {
            console.log('Deleting download');            
            delete downloads[pageDownload.media.mediaId];
            setPageDownload(null);
        }

        // Updating storage
        await chrome.storage.local.set({
            [LOCAL_STORAGE_KEYS.DOWNLOADS]: downloads
        });
    }  


    // Popup only contains a dialogue's modal if its active
    const activeDialogue = [collectConflictPolicy, showImportResults]
        .filter(d => d.isDisplayed)
        .at(0);

    let content: JSX.Element;
    
    // Showing progress bar for import status
    if ( !!importStatus ) {
        // const ratio = Math.round((importStatus.processed / importStatus.total) * 100);
        // console.log('Progress ratio: ', ratio);

        content = (
            <div className="vw-100 p-4">
                <ProgressBar 
                    striped animated visuallyHidden
                    variant="info"
                    now={importStatus.processed} 
                    max={importStatus.total}
                    />
            </div>
        );
        
    // Showing spinner for misc busy status
    } else if ( isBusy ) {
        content = <Spinner animation="border" variant="primary"/>;
    
    // Standard content for deleting and importing    
    } else {
        content = (
            <div className="container p-0">
                {isThreadPage
                    ? <Row className="p-1">
                        <Button
                            className={`container ${styles.pageDownloadToggle}`} 
                            onClick={handleDownloadToggle}>
                            
                            <Row className="h-100">
                                <div className="col-2 d-flex align-items-center">
                                    <Image fluid src={(!!pageDownload) ? checkIcon : xIcon}/>
                                </div>
                                
                                <div className="col d-flex align-items-center">
                                    This thread's media is downloaded?
                                </div>
                            </Row>

                        </Button>
                    </Row>

                    : null}
                
                <Row className="p-1">
                    <ButtonGroup size="sm">
                        <Button id="import-button" onClick={handleImportDownloads} type="submit">
                            Import Downloads
                        </Button>
                        <Button id="delete-downloads" onClick={handleDeleteDownloads} type="reset">
                            Delete Downloads
                        </Button>
                    </ButtonGroup>
                </Row>

            </div>
        );
    }
    
    // As far as I can tell, there's no simple way to have this component
    // scale to a Modal dialogue's size. This is the easy way of
    // making the popup larger when big dialogues are visible
    let height: string;

    switch ( activeDialogue ) {
        case collectConflictPolicy:
            height = DIALOGUE_HEIGHTS.CONFLICT_POLICY;
            break;
    
        case showImportResults:
            height = height = DIALOGUE_HEIGHTS.IMPORT_RESULTS;
            break;
            
        default:
            height = 'auto';
    }
    
    return (
        <div className={`container ${styles.main}`} style={{ height }}>

            <div className="d-flex h-100 align-items-center justify-content-center overflow-hidden p-3">
                {content}
            </div>
            
            {activeDialogue?.modal}
        </div>
    );
}


export default DownloadManager;
