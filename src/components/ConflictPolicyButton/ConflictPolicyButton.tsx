import { Button, OverlayTrigger, Tooltip } from "react-bootstrap";
import { ConflictResolutionPolicy } from "types/data";
import { CONFLICT_POLICY_DESCRIPTIONS } from "utils/meta";
import { toTitle } from "utils/func";


export function ConflictPolicyButton(args: { 
    policy: string, 
    onClick: React.MouseEventHandler<HTMLButtonElement> 
}) {

    const title = toTitle(args.policy);
    const desc = CONFLICT_POLICY_DESCRIPTIONS[args.policy as ConflictResolutionPolicy];
    
    return (
        <OverlayTrigger 
            placement="auto"
            delay={{ show: 250, hide: 400 }}
            overlay={<Tooltip id={`${title}-tooltip`}>{desc}</Tooltip>}>

            <Button className="w-100" onClick={args.onClick}>
                {title}
            </Button>
            
        </OverlayTrigger>
    );
}

export default ConflictPolicyButton;