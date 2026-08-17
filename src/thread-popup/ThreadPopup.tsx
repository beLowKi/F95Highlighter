import { useEffect, useState } from "react";
import { Button, Col, Image, Modal, Row, Spinner } from "react-bootstrap";
import type { MediaDownload } from "types/data";
import { Message, SaveDownloadPopupMessage, UpdateDownloadPopupMessage } from "types/message";

import styles from "./ThreadPopup.module.css";
import rightArrow from "../../public/icons/right-chevron.png";
import { truncateStr } from "utils/func";
import MediaDownloadDisplay from "components/MediaDownloadDisplay/MediaDownloadDisplay";


function ThreadDialogue(args: { 
    title:      string, 
    content?:    JSX.Element,
    onSubmit:   (x: boolean) => void
}) {

    const { title, content, onSubmit } = args;
    
    const body = ( !!content )
        ? <Modal.Body className={`container ${styles.dialogueBody}`}>
            {content}
        </Modal.Body>

        : undefined;
    
    return (
        <>
            <Modal.Header className={`${styles.dialogueTitle} fs-4 d-flex align-items-center justify-content-center`}>
                {title}
            </Modal.Header>
            
            {body}
            
            <Modal.Footer as="div" className={`${styles.dialogueButtonContainer} row`}>
                <Col className="d-flex align-items-center justify-content-center">
                    <div>
                        <Button className={`${styles.dialogueButton} d-inline-flex justify-content-center align-items-center`}
                            variant="primary"
                            onClick={() => onSubmit(true)}>
                            Yes
                        </Button>
                    </div>
                </Col>
                
                <Col className="d-flex align-items-center justify-content-center">
                    <div>
                        <Button className={`${styles.dialogueButton} d-inline-flex justify-content-center align-items-center`}
                            variant="secondary"
                            onClick={() => onSubmit(false)}>
                            No
                        </Button>
                    </div>
                </Col>                
            </Modal.Footer>
        </>
    );
}


function SaveNewDownload(args: { 
    download: SaveDownloadPopupMessage['payload'],
    onSubmit: (x: boolean) => void,
}) {
    
    const { download, onSubmit } = args;
    const content = (
        <div className="d-flex h-100 align-items-center justify-content-center">
            <div>
                <h1 className="fs-6 text-center">{truncateStr(download.name, 100)}</h1>
            </div>
        </div>
    );
    
    return (
        <ThreadDialogue 
            title={`Add New Download?`}
            content={content}
            onSubmit={onSubmit}/>
    );
}


function UpdateDownload(args: {
    old: MediaDownload,
    new: MediaDownload,
    onSubmit: (x: boolean) => void,
}) {

    const { old, new: newDownload, onSubmit } = args;
    const maxNameLength = 30;
    
    const content = (
        <div className="d-flex h-100 align-items-center justify-content-center">
            <div className="d-flex text-center text-break align-items-center">
                <div className={`d-inline-block h-100 align-items-center justify-content-center ${styles.updateDialogueDownloadContainer}`}>
                    <MediaDownloadDisplay download={old} maxNameLength={maxNameLength} height={'100%'}/>
                </div>
                
                <div 
                    className={`d-inline-block ${styles.updateDialogueArrowContainer}`}>
                    <Image src={rightArrow} fluid/>
                </div>

                <div className={`d-inline-block align-items-center justify-content-center ${styles.updateDialogueDownloadContainer}`}>
                    <MediaDownloadDisplay download={newDownload} maxNameLength={maxNameLength}height={'100%'}/>
                </div>
            </div>
        </div>
    );
    
    return (<ThreadDialogue
        title={`Update Download?`}
        content={content}
        onSubmit={onSubmit}/>);
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

            // console.log('Received message in thread popup');
            
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
        }

        // Connecting listener
        chrome.runtime.onMessage.addListener(messageListener);

        // Removes listener when unmounting component
        return (() => {
            chrome.runtime.onMessage.removeListener(messageListener);
        })
    }, []);
    
    
    return (
        <Modal.Dialog className={`${styles.threadPopup}`}>
            
            {
                !!content
                    ? content
                    // Shows loading gif while content loads
                    : <div className="d-flex align-items-center justify-content-center">
                        <Spinner animation="border" variant="primary"/>
                    </div>
            }

        </Modal.Dialog>
    );
}


export default ThreadPopup;
