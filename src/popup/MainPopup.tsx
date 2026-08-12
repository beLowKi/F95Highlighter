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
        chrome.storage.local.onChanged.addListener(storageListener);
        
        // Triggers refresh once to start
        refreshSettings().then();
        
        // Removes listeners when unmounting
        return () => {
            chrome.storage.local.onChanged.removeListener(storageListener);
        }
    }, [])
    

    return (
        <div className={`container ${styles.mainPopup}`}>
            <Modal.Dialog>
                
                {/* Title Header */}
                <Modal.Header className={`${styles.header} text-light text-center`}>
                    <h1 className="h-100 w-100 text-2xl">F95 Highlighter</h1>
                </Modal.Header>
                
                {/* Window content */}
                <TabContainer defaultActiveKey={TAB_KEYS.DOWNLOADS}>
                    <TabContent className="container overflow-hidden p-0">        
                        {/* DownloadManager Tab */}
                        <TabPane eventKey={TAB_KEYS.DOWNLOADS}>
                            <DownloadManager isBusy={isBusy}/>
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
}


export default MainPopup;
