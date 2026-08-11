import { Accordion } from "react-bootstrap";
import { BASE_SEARCH_URL, EX_SEARCH_PARAMS } from "utils/const";
import { prepSearchQuery } from "utils/func";

import styles from "./InfoScreen.module.css";


export function InfoScreen(args: {
    fontSize: string
}) {

    // TODO explain how importing and downloading from threads works
    // mention that all it's really checking is the name of the item
    // and trying to match it to Media on f95 using its search feature
    
    // Some example search queriesL
    const exampleSearches = ['Furries_Annonymous_Collection_2026-02', 'MyLifeAsGoon-v1.0.12-f95cracked'].map(s => {
        const query = prepSearchQuery(s);
        const url = `${BASE_SEARCH_URL}?q=${query}&${EX_SEARCH_PARAMS}`;
        return [s, url];
    });
    
    return (
        // <div className="p-2 pb-4 overflow-scroll" style={{ height: '400px', fontSize }}>
        <div className={styles.main}>
            <p className="p-2 text-break">
                This extension tracks what you've downloaded from f95zone.to and highlights it on the latest-updates page. You tell it what you've downloaded by either importing folders/files directly or through a popup which appears when clicking a download link from a thread page. For more details, expand the sections below.
            </p>

            <Accordion flush>
                <Accordion.Item eventKey="0" className="bg-dark text-white">
                    <Accordion.Button className="bg-secondary text-white">
                        Importing
                    </Accordion.Button>

                    <Accordion.Body>
                        <p>
                            When importing a download, the extension attempts to match it to a thread page. This boils down to converting a folder/file name into keywords, performing a search on f95zone, and scraping the results for the most likely match. For some example searches:
                        </p>
                        
                        {exampleSearches.map(([item, url]) => (
                            <p key={item}>
                                {item} {'->'} <a href={url}>{url}</a>
                            </p>
                        ))}

                        <p>
                            It then stores things like its ID (e.g., "123456"), name, and "certainty" percentage representing how close the match was. All of this is stored locally on your machine. The actual downloaded file(s) aren't touched; it just reads their name.
                        </p>

                        <p>
                            This method works well-ish, but it's not perfect. f95zone's search is <b>very</b> specific, so a search won't find the correct thread if there's so much as a slight mispelling or missing apostrophe. Not to mention inconsistencies between what a thread is titled and how its download files are labeled. In these cases, an import will fail. See next section for adding downloads manually.
                        </p>
                    </Accordion.Body>
                </Accordion.Item> 

                <Accordion.Item eventKey="1" className="bg-dark text-white">
                    <Accordion.Button className="bg-secondary text-white">
                        Downloading/Updating From a Thread
                    </Accordion.Button>
                    
                    <Accordion.Body>
                        You can add downloads manually through a popup which appears any time you click a download link on a thread page. The same popup will allow you to either create a new download or update an existing one.
                    </Accordion.Body>
                </Accordion.Item>

                <Accordion.Item eventKey="2" className="bg-dark text-white">
                    <Accordion.Button className="bg-secondary text-white">
                        Attributions
                    </Accordion.Button>
                    
                    <Accordion.Body>
                        <a href="https://www.flaticon.com/free-icons/input" title="input icons">Input icons created by Fathema Khanom - Flaticon</a>
                        <br/>
                        <a href="https://www.flaticon.com/free-icons/info" title="info icons">Info icons created by Anggara - Flaticon</a>
                        <br/>
                        <a href="https://www.flaticon.com/free-icons/settings" title="settings icons">Settings icons created by herikus - Flaticon</a>
                        <br/>
                        <a href="https://www.flaticon.com/free-icons/next" title="next icons">Next icons created by tenBystry - Flaticon</a>
                        <br/>
                        <a href="https://www.flaticon.com/free-icons/foursquare-check-in" title="foursquare check in icons">Foursquare check in icons created by hqrloveq - Flaticon</a>
                        <br/>
                        <a href="https://www.flaticon.com/free-icons/delete" title="delete icons">Delete icons created by Pixel perfect - Flaticon</a>
                    </Accordion.Body>
                </Accordion.Item>
            </Accordion>
        </div>
    );
}

export default InfoScreen;