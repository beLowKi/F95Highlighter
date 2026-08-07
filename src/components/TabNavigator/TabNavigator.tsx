import { Image, Nav, OverlayTrigger, Tooltip } from "react-bootstrap";

export function TabNavigator(args: {
    eventKey:   string,
    tooltip:    string,
    icon:       string,
    disabled?:   boolean,
}) {
    return (
        <Nav.Item className="p-0">
            <Nav.Link className='pt-1 pb-1 px-2 rounded-0' eventKey={args.eventKey} disabled={!!args.disabled}>
                <OverlayTrigger
                    placement='top'
                    delay={{ show: 450, hide: 300 }}
                    overlay={<Tooltip id={`${args.eventKey}-tooltip`}>{args.tooltip}</Tooltip>}
                    >

                    <Image style={{ height: '35px' }} src={args.icon}/>

                </OverlayTrigger>
            </Nav.Link>
        </Nav.Item>
    );
}

export default TabNavigator;
