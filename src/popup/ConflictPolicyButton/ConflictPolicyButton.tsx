import { Button, Row, Col } from "react-bootstrap";
import { ConflictResolutionPolicy } from "types/data";
import { CONFLICT_POLICY_DESCRIPTIONS } from "utils/const";
import { toTitle } from "utils/func";

import styles from "./ConflictPolicyButton.module.css";

export function ConflictPolicyButton(args: { 
    policy: string, 
    onClick: React.MouseEventHandler<HTMLButtonElement> 
}) {

    const title = toTitle(args.policy);
    const desc = CONFLICT_POLICY_DESCRIPTIONS[args.policy as ConflictResolutionPolicy];
    
    return (
        <Button as='div' className={`${styles.main}`} onClick={args.onClick}>
            <Row className="g-2 p-5">
                {/* TODO image here */}

                <Col>
                    <h2>{title}</h2>
                </Col>
                <Col>
                    <p>{desc}</p>
                </Col>
            </Row>
        </Button>
    );
}

export default ConflictPolicyButton;