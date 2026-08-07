import { useEffect, useState } from "react";
import { Button, ButtonGroup, Col, Modal, Spinner } from "react-bootstrap";
import type { MediaDownload } from "types/data";
import { Message, SaveDownloadPopupMessage, UpdateDownloadPopupMessage } from "types/message";

import styles from "./ThreadPopup.module.css";


function SaveNewDownload(args: { 
    download: SaveDownloadPopupMessage['payload'],
    onSubmit: (x: boolean) => void,
}) {
    
    const { download, onSubmit } = args;

    return (
        <div className="d-flex align-items-center justify-content-center">
            <div>
                <Modal.Title>Add Download for {download.name}?</Modal.Title>
                
                <Modal.Footer as="div" className="row">
                    <Col>
                        <Button type="submit" onClick={() => onSubmit(true)}>
                            Yes
                        </Button>
                    </Col>
                    <Col>
                        <Button type="reset" onClick={() => onSubmit(false)}>
                            No
                        </Button>
                    </Col>
                </Modal.Footer>
            </div>
        </div>
    );
}


function UpdateDownload(args: {
    old: MediaDownload,
    new: MediaDownload,
    onSubmit: (x: boolean) => void,
}) {

    const { old, new: newDownload, onSubmit } = args;
    
    return (
        <div className="d-flex align-items-center justify-content-center">
            <div>
                <Modal.Title>Update Download for {old.name}?</Modal.Title>
                
                <Modal.Body>
                    {/* TODO compare old and new */}
                </Modal.Body>
                
                <Modal.Footer>
                    <ButtonGroup>
                        <Button type="submit" onClick={() => onSubmit(true)}>
                            Confirm
                        </Button>
                        <Button type="reset" onClick={() => onSubmit(false)}>
                            Cancel
                        </Button>
                    </ButtonGroup>
                </Modal.Footer>
            </div>
        </div>
    );
}


export function ThreadPopup() {
    const [mode, setMode] = useState<'save'|'update'>('save');
    const [content, setContent] = useState<JSX.Element|null>();
    
    /**
     * Attaches chrome.runtime listener
     */
    useEffect(() => {
        // Listens to runtime messages
        const messageListener = (
            message:        any,
            sender:         chrome.runtime.MessageSender,
            sendResponse:   (x?: any) => void,
        ) => {

            console.log('Received message in main popup');
            
            // Parsing message
            const { 
                data: { action, payload } = {}, 
                error: messageErr, 
                success: isMessage
            } = Message.safeParse(JSON.parse(message));
            
            if ( !isMessage ) {
                console.error(`Popup received incorrectly formatted message:\n${messageErr.message}`);
                return false;
            }

            // Performing action
            switch ( action ) {
                case SaveDownloadPopupMessage.shape.action.value: {
                    const { data: download, error, success } = 
                        SaveDownloadPopupMessage.shape.payload.safeParse(payload);
                    
                    if (!success) {
                        console.error(`Popup received invalid new download:\n${error.message}`);
                        return false;
                    }
                    
                    // console.log('Creating confirm new download dialogue');

                    setContent(<SaveNewDownload download={download} onSubmit={(yes) => {
                        sendResponse(yes);
                        window.close();
                    }}/>)
                    
                    return true;
                }
                
                case UpdateDownloadPopupMessage.shape.action.value: {
                    const { data: { old, new: newDownload } = {}, error, success } = 
                        UpdateDownloadPopupMessage.shape.payload.safeParse(payload);
                    
                    if (!success) {
                        console.error(`Popup received invalid update payload:\n${error.message}`);
                        return false;
                    }
                    
                    // console.log('Creating update download dialogue');

                    setContent(<UpdateDownload old={old!} new={newDownload!} onSubmit={(yes) => {
                        sendResponse(yes);
                        window.close();
                    }}/>)
                    
                    return true;
                }
            }

            return true;
        }

        // Connecting listener
        chrome.runtime.onMessage.addListener(messageListener);

        // Removes listener when unmounting component
        return (() => {
            chrome.runtime.onMessage.removeListener(messageListener);
        })
    }, []);
    
    
    return (
        <div className={styles.threadPopup}>
            <Modal.Dialog>
                
                <div className="d-flex align-items-center justify-content-center">
                    <div>
                        {!!content
                            ? content
                            // Shows loading gif while content loads
                            : <Spinner animation="border" variant="primary"/>}
                    </div>
                </div>

            </Modal.Dialog>
        </div>
        
    );
}


export default ThreadPopup;
