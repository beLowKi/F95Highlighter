import type { ImportResults } from "types/data";

import styles from "./ImportResultsDisplay.module.css";
import { Button, Modal } from "react-bootstrap";


export function ImportResultsDisplay(args: { 
    show: boolean, 
    onSubmit: (x?: any) => void, 
    onDismiss: () => void,
    results: ImportResults
}) {

    const { show, onSubmit, onDismiss, results } = args;
    
    return (
        <Modal show={show} onHide={onDismiss} centered className={styles.main}>
            <Modal.Header closeButton>Import Results</Modal.Header>

            <Modal.Body>
                <p>{JSON.stringify(results, null, 2)}</p>
            </Modal.Body>
            
            <Modal.Footer className="d-flex align-items-center justify-content-center">
                <Button type="submit" onClick={onSubmit}>Okay</Button>    
            </Modal.Footer>
        </Modal>
    );
}


export default ImportResultsDisplay;