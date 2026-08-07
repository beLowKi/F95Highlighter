import { ButtonGroup, Col, Modal, Row } from "react-bootstrap";
import { ConflictResolutionPolicy } from "types/data";
import ConflictPolicyButton from "../ConflictPolicyButton/ConflictPolicyButton";
import type { GetConflictPolicyMessage } from "types/message";

import styles from "./ConflictPolicyDialogue.module.css";

export function ConflictResolutionDialogue(args: {
    show: boolean, 
    onSubmit: (value: ConflictResolutionPolicy) => void, 
    onDismiss: () => void,
    conflicts?: GetConflictPolicyMessage['payload']
}) {
    
    // TODO 'compare each conflict' option like in Windows
    
    console.log('Creating conflict policy dialogue');
    
    const numConflicts = ( args.conflicts !== undefined )
        ? Object.keys(args.conflicts).length
        : undefined;
    
    // console.log('Creating policy buttons');
    const policyButtons = Object.keys(ConflictResolutionPolicy.enum).map(policy => (
        <ConflictPolicyButton 
            key={policy}
            policy={policy}
            onClick={() => args.onSubmit(policy as ConflictResolutionPolicy)}
        />
    ));

    // console.log('Creating modal');    
    return(
        <Modal 
            show={args.show} 
            onHide={args.onDismiss}
            size="sm"
            centered>
            
            <Modal.Header closeButton>
                <Modal.Title className="text-2xl text-center">Replace or Skip Downloads</Modal.Title>
            </Modal.Header>
            
            <Modal.Body className="p-6">
                <Col>
                    <Row>
                        {!!numConflicts
                            ? <p>Detected {numConflicts} duplicate download(s)</p>
                            : <p>Detected duplicate download(s)</p>
                        }
                        {/* TBD expandable list of duplicates? */}
                    </Row>

                    <Row>
                        {/* Policy buttons */}
                        <ButtonGroup className='p-2'>
                            {policyButtons}
                        </ButtonGroup>
                    </Row>
                </Col>
            </Modal.Body>

        </Modal>
    );
};

export default ConflictResolutionDialogue;