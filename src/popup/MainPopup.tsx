import { useEffect, useState } from "react";
import { Modal, Nav, Spinner, TabContainer, TabContent, TabPane } from "react-bootstrap";

import downloadsIcon from "../../public/icons/downloads.png";
import infoIcon from '../../public/icons/info.png';
import settingsIcon from '../../public/icons/settings.png';

import TabNavigator from "../components/TabNavigator/TabNavigator";
import DownloadManager from "../components/DownloadManager/DownloadManager";
import InfoScreen from "../components/InfoScreen/InfoScreen";
import type { Settings } from "types/data";
import { getUserSettings } from "utils/func";
import SettingsScreen from "../components/SettingsScreen/SettingsScreen";
import { LOCAL_STORAGE_KEYS } from "utils/const";

import styles from "./MainPopup.module.css"; 


const TAB_KEYS = {
    DOWNLOADS:  'download-manager',
    HELP:       'help',
    SETTINGS:   'settings',
} as const;


export function MainPopup() {
    const [isBusy, setIsBusy] = useState(false);
    const [settings, setSettings] = useState<Settings>();
    
    // Invokes modal that gets confirmation on saving a new download
    // const confirmNewDownload = usePromiseModal<boolean, { download: MediaDownload }>(
    //     ({ show, onSubmit, onDismiss, download }) => (
    //         <NewDownloadConfirm 
    //             show={show}
    //             onDismiss={onDismiss}
    //             onSubmit={onSubmit}
    //             download={download}
    //         />
    // ));
    
    // // Invokes modal that gets confirmation on updating a download
    // const confirmDownloadUpdate = usePromiseModal<boolean, { old: MediaDownload, new: MediaDownload }>(
    //     ({ show, onSubmit, onDismiss, old, new: newDownload }) => (
    //         <UpdateDownloadConfirm 
    //             show={show}
    //             onDismiss={onDismiss}
    //             onSubmit={onSubmit}
    //             old={old} 
    //             new={newDownload}                
    //         />
    // ));
    
    
    // Updates in-memory settings
    async function refreshSettings(): Promise<void> {
        try {
            const newSettings = await getUserSettings();
            setSettings(newSettings);
        } catch (error) {
            console.error(`Error refreshing settings: ${error}`);
        }
    }
    

    /**
     * This hook handles Message listeners
     */
    useEffect(() => {

        // Updates in-memory settings object when settings are changed
        const storageListener = async (
            changes: { [key: string]: chrome.storage.StorageChange }
        ) => {
            if ( LOCAL_STORAGE_KEYS.SETTINGS in changes ) {
                await refreshSettings();
            }
        }

        // Connecting listeners
        // chrome.runtime.onMessage.addListener(messageListener);
        chrome.storage.local.onChanged.addListener(storageListener);
        
        // Triggers refresh once to start
        refreshSettings().then();
        
        // Removes listeners when unmounting
        return () => {
            // chrome.runtime.onMessage.removeListener(messageListener);
            chrome.storage.local.onChanged.removeListener(storageListener);
        }
    }, [])
    

    return (
        <div className={styles.mainPopup}>
            <Modal.Dialog>
                
                {/* Title Header */}
                <Modal.Header className={`${styles.header} text-light text-center`}>
                    <h1 className="h-100 w-100 text-2xl">F95 Highlighter</h1>
                </Modal.Header>
                
                {/* Window content */}
                <TabContainer defaultActiveKey={TAB_KEYS.DOWNLOADS}>
                    <TabContent>        
                        {/* DownloadManager Tab */}
                        <TabPane eventKey={TAB_KEYS.DOWNLOADS}>
                            <DownloadManager 
                                // setActiveDialogue={setActiveDialogue}
                                isBusy={isBusy}
                                setIsBusy={setIsBusy}/>
                        </TabPane>
                        
                        {/* Info Tab */}
                        <TabPane eventKey={TAB_KEYS.HELP}>
                            <InfoScreen fontSize="16px"/>
                        </TabPane>

                        {/* Settings Tab */}
                        <TabPane eventKey={TAB_KEYS.SETTINGS}>
                            {!!settings
                                ? <SettingsScreen settings={settings}/>
                                : <Spinner animation="border" variant="primary"/>}
                        </TabPane>
                    </TabContent>
                    
                    {/* Tab Changing Buttons */}
                    <Modal.Footer>
                        <Nav className="p-0" variant="pills" justify>
                            {/* Download Manager */}
                            <TabNavigator
                                eventKey={TAB_KEYS.DOWNLOADS}
                                tooltip="Manage Downloads"
                                icon={downloadsIcon}
                                disabled={isBusy}/>
                            
                            {/* Info */}
                            <TabNavigator
                                eventKey={TAB_KEYS.HELP}
                                tooltip="Info"
                                icon={infoIcon}
                                disabled={isBusy}/>

                            {/* Settings */}
                            <TabNavigator
                                eventKey={TAB_KEYS.SETTINGS}
                                tooltip="Settings"
                                icon={settingsIcon}
                                disabled={isBusy}/>
                        </Nav>
                    </Modal.Footer>

                </TabContainer>
                
            </Modal.Dialog>
        </div>
    );
    
    
    // return (<>
    //     <Modal.Dialog className="p-0" style={{ 
    //         width: (!!activeDialogue) ? "450px" : "350px",
    //         height: (!!activeDialogue) ? "350px" : "auto"
    //     }}>
            
    //         {/* Title Header */}
    //         <Modal.Header className="bg-dark p-2 text-light text-center">
    //             <h1 className="w-100 text-2xl">F95 Highlighter</h1>
    //         </Modal.Header>
            
    //         {/* Main content */}
    //         <Modal.Body>
    //             <div className="d-flex p-4 align-items-center justify-content-center">
    //                 <div>{ content }</div>
    //             </div>
    //         </Modal.Body>

    //         <Modal.Footer>
    //             Settings and Help buttons will go here

    //             <span>

                    
    //                 {/* Attribution for icons */}
    //                 <a href="https://www.flaticon.com/free-icons/settings" title="settings icons">Settings icons created by Pixel perfect - Flaticon</a>
    //             </span>
    //         </Modal.Footer>
	// 	</Modal.Dialog>

    //     {activeDialogue?.modal}
    // </>);
}


export default MainPopup;
