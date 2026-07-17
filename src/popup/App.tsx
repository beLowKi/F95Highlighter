import { BackgroundActions, Message, PopupActions } from "types/message";
import { scrapeSearchResults } from "utils/func";


// Directory picker options
const DIR_SELECT_OPTIONS = {
    id: 'import-downloads',
    mode: "read",
} as const;


export function App() {
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

        const items = (await Array.fromAsync(directory.values())).map(d => d.name);
        console.log(`Found sub-directories:\n${JSON.stringify(items, null, 2)}`);

        const message: Message = {
            action: BackgroundActions.IMPORT_DOWNLOADS,
            payload: JSON.stringify(items),
        };

        chrome.runtime.sendMessage(message);
    }
    
	return (
		<div className="w-80 p-6">
			<h1 className="text-2xl">F95 Highlighter</h1>
			<button id="import-button" type="submit" onClick={handleImportDownloads}>
				Import Downloads
			</button>
		</div>
	);
}


/**
 * Listens to messages (mostly) from the background script
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('message received');
    
    const { data: msg, error, success } = Message.safeParse(message);
    if ( !success ) {
        console.error(`Popup received incorrectly formatted message:\n${error.message}`);
        return;
    }
    
    // Service worker sent over search results HTML to scrape
    if ( msg.action === PopupActions.SCRAPE_SEARCH_RESULTS ) {
        const html = msg.payload;
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
    }
});