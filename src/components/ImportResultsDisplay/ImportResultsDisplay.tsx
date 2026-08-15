import type { ImportResults, LocalStorage, MediaDownload } from "types/data";
import { Accordion, Button, Col, Image, Modal, Row, Spinner } from "react-bootstrap";

import { getUserDownloads, prepSearchQuery, truncateStr } from "utils/func";
import { useEffect, useState } from "react";
import MediaDownloadDisplay from "components/MediaDownloadDisplay/MediaDownloadDisplay";

import rightArrow from "../../../public/icons/right-chevron.png";
import styles from "./ImportResultsDisplay.module.css";


/**
 * Column size of the center arrow of ImportResult components 
 */
const ARROW_COLUMN_SIZE = 2;


function Fail(args: { reason: string }) {
    const { reason } = args;
    
    return (
        <>
            Icon Here 

            Fail message: {reason}
        </>
    );
}


/**
 * Header for each part of import results
 */
function ResultsHeader(args: {
    col1: string,
    col2: string
}) {

    const { col1, col2 } = args;
    
    return (
        <div className="container" style={{ height: 'auto' }}>
            <Row className={`text-center ${styles.resultsHeader}`}>
                <Col className="d-flex justify-content-center align-items-center">{col1}</Col>
                <Col xs={ARROW_COLUMN_SIZE} > </Col>
                <Col className="d-flex justify-content-center align-items-center">{col2}</Col>
            </Row>
        </div>
    )
}


function ImportResult(args: {
    left:   JSX.Element | string,
    right:  JSX.Element | string,
    exClass?:  string,
}) {

    const { left, right, exClass } = args;
    
    return (
        <div className={`container p-1 px-2 border-bottom border-white ${styles.importResult} ${exClass}`}>
            <Row className="h-100 text-center text-break">
                <Col className="d-flex justify-content-center align-items-center">
                    {left}
                </Col>

                <Col xs={ARROW_COLUMN_SIZE} className="d-flex justify-content-center align-items-center">
                    <Image className={styles.importResultArrow} src={rightArrow}/>
                </Col>
                
                <Col className="d-flex justify-content-center align-items-center">
                    {right}
                </Col>
            </Row>
        </div>
    );
}


function NewMedia(args: { 
    item: string, 
    mediaName: string,

    /**
     * Names past this length are truncated with a trailing '...'.
     * 
     * Defaults to 80
     */
    maxNameLength?: number
}) {

    const { item, mediaName, maxNameLength } = args;
    const strLength = maxNameLength || 80;
    
    return (
        <ImportResult 
            left={truncateStr(item, strLength).trim()} 
            right={truncateStr(mediaName, strLength).trim()}
            exClass={styles.newMedia}/>
    );
}


function UpdatedMedia(args: { old: MediaDownload, new: MediaDownload }) {
    const { old, new: newDownload } = args;

    return (
        <ImportResult
            left={<MediaDownloadDisplay download={old} maxNameLength={80} height={'100%'}/>}
            right={<MediaDownloadDisplay download={newDownload} maxNameLength={80} height={'100%'}/>}
            exClass={styles.updatedMedia}/>
    );
}


function FailedItem(args: { item: string }) {
    const { item } = args;
    
    return (
        <ImportResult
            left={item}
            right={prepSearchQuery(item).replaceAll('+', ' ')}/>
    );
}


function Success(args: { results: ImportResults }) {
    const [downloads, setDownloads] = useState<LocalStorage['downloads']>();

    // Begins loading downloads
    useEffect(() => {
        getUserDownloads()
            .then(ds => setDownloads(ds))
            .catch(err => console.error(`Error loading downloads for import Success ${err}`));
    }, []);
    
    const { results } = args;

    /**
     * TODO
     *  1) show check icon for a bit
     *  2) transition to list of 
     *      
     *      +-------------------+
     *      | New Media         |
     *      | [NewMedia...]     |
     *      |                   |
     *      | Updated           |
     *      | [UpdatedMedia...] |
     *      |                   |
     *      | Failed            |
     *      | [FailedItem...]   |
     *      +-------------------+
     */
    
    let content: JSX.Element;

    // Displays a Spinner while downloads are loaded
    if ( downloads === undefined ) {
        content = <Spinner animation="border" variant="primary"/>;
        
    // Main poup content
    } else {
        // Creating new media rows
        const newMedia = ( results.newMedia !== undefined )
            ? Object.entries(results.newMedia).map(([item, mediaId]) => {
                const d: MediaDownload | undefined = downloads[mediaId];
                if ( d === undefined ) {
                    console.error(
                        'Import results returned new media ID ' +
                        `not found in downloads: ${mediaId}; matched to item ${item}`
                    );

                    return null;
                }
                
                return (<NewMedia item={item} mediaName={d.media.title} key={d.media.mediaId}/>);
            })
                // Filtering any failed rows
                .filter(el => !!el)

            : null;

        // Creating updated media rows
        const updatedMedia = ( results.updatedMedia !== undefined )
            ? Object.entries(results.updatedMedia).map(([item, update]) => (
                <UpdatedMedia old={update.old} new={update.new}/>
            ))

            : null;
    
        // Creating failed item rows
        const failedItems = ( results.failedItems !== undefined )
            ? results.failedItems.map(i => (
                <FailedItem item={i}/>
            ))
            : null;
        
        content = (
            <Accordion flush>
                <Accordion.Item eventKey="0">
                    <Accordion.Header>
                        {newMedia?.length || 0} New Media 
                    </Accordion.Header>

                    {
                        ( !!newMedia && newMedia.length > 0 )
                            ? <Accordion.Body className={styles.importResultContainer}>
                                <ResultsHeader col1="Item" col2="Media"/>                        
                                {newMedia}
                            </Accordion.Body>
                            : null
                    }
                    
                </Accordion.Item>

                <Accordion.Item eventKey="1">
                    <Accordion.Header>
                        {updatedMedia?.length || 0} Updated Media
                    </Accordion.Header>

                    {
                        ( !!updatedMedia && updatedMedia.length > 0 )
                            ? <Accordion.Body className={styles.importResultContainer}>
                                <ResultsHeader col1="Old" col2="New"/>
                                {updatedMedia}
                            </Accordion.Body>
                            : null
                    }

                </Accordion.Item>

                <Accordion.Item eventKey="2">
                    <Accordion.Header>
                        {failedItems?.length || 0} Failed Items
                    </Accordion.Header>

                    {
                        ( !!failedItems && failedItems.length > 0 )
                            ? <Accordion.Body className={styles.importResultContainer}>
                                <ResultsHeader col1="Item" col2="Attempted Search"/>
                                {failedItems}
                            </Accordion.Body>
                            : null
                    }
                </Accordion.Item>
                
            </Accordion>
        );
    }
        
    return (
        <div className={`container p-0 ${styles.success}`}>
            {content}
        </div>
    );
}


export function ImportResultsDisplay(args: { 
    show: boolean, 
    onSubmit: (x?: any) => void, 
    onDismiss: () => void,
    results: ImportResults, 
}) {

    const { show, onSubmit, onDismiss, results } = args;
    
    return (
        <Modal
            show={show} 
            onHide={onDismiss} 
            contentClassName={styles.main}
            centered>

            <Modal.Header closeButton>Import Results</Modal.Header>

            <Modal.Body>
                { 
                    ( !results.success && results.failMessage !== undefined )
                        ? <Fail reason={results.failMessage}/>
                        : <Success results={results}/>
                }
                
                {/* <p>{JSON.stringify(results, null, 2)}</p> */}
            </Modal.Body>
            
            <Modal.Footer className="d-flex align-items-center justify-content-center">
                <Button type="submit" onClick={onSubmit}>Okay</Button>    
            </Modal.Footer>
        </Modal>
    );
}


export default ImportResultsDisplay;