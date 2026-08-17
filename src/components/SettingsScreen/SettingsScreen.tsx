import { useState } from "react";
import { Button, Col, Form, OverlayTrigger, Row, Tooltip } from "react-bootstrap";
import meta, { Settings, SETTINGS_DESCRIPTIONS } from "utils/meta";


const FORM_IDS = {
    STRICT_MODE:                'strict-mode',
    SEARCH_SAMPLE_SIZE:         'search-sample-size',
    UNCERTAIN_COLOR:            'uncertain-highlight',
    LOW_CERTAINTY_COLOR:        'lowCertainty-highlight',
    MID_CERTAINTY_COLOR:        'midCertainty-highlight',
    HIGH_CERTAINTY_COLOR:       'highCertainty-highlight',
} as const;


export function SettingsScreen(args: { settings: Settings }) {
    const [settingData, setSettingData] = useState(() => structuredClone(args.settings));
    

    async function handleSubmit( event: React.FormEvent ): Promise<void> {
        // Stops app from trying to reload the page
        // commenting this will just make it go back to downloads 
        // (or whatever page is default tab)
        event.preventDefault();
        // console.log(`Submitted settings: ${JSON.stringify(settingData, null, 2)}`);
        
        // Converting searchDepth to number
        settingData.searchDepth = +settingData.searchDepth;
        
        // Updates storage
        await chrome.storage.local.set({ [meta.LOCAL_STORAGE_KEYS.SETTINGS]: settingData });
    }
    
    function handleReset(): void {
        setSettingData(() => structuredClone(args.settings));
    }
    
    function handleChange( event: any ) {
        const data: Settings = { ...settingData };
        
        // Checking if changed value is a highlight; in which case,
        // it needs to go inside the 'highlights' property.
        const key = event.target.name;
        if ( !( key in Settings.shape.highlights.shape ) ) {
            (data as any)[event.target.name] = event.target.value;
        } else {
            data.highlights[key as keyof Settings['highlights']] = event.target.value;
        }

        // Double-checking that it's still valid Settings
        const { data: parsed, error, success } = Settings.safeParse(data);
        if ( !success ) {
            console.error(`Settings form gave broken data:\n${error.message}`);
            return;
        }

        setSettingData(data);
    }

    
    return (
        <Form className="p-4 text-lg" onSubmit={handleSubmit} onReset={handleReset}>

            <Row xs={8}>

                {/* Strict mode flag */}
                <Form.Group>
                    <Row>
                        <Col xs={6}>
                            <OverlayTrigger
                                delay={{ show: 350, hide: 200 }}
                                placement="bottom"
                                overlay={<Tooltip>{SETTINGS_DESCRIPTIONS.strictMode}</Tooltip>}>

                                <Form.Label>
                                    Strict Mode:
                                </Form.Label>
                                
                            </OverlayTrigger>
                        </Col>

                        <Col className="d-flex justify-content-center">
                            <Form.Switch id={FORM_IDS.STRICT_MODE}
                                name="strictMode"
                                value={(settingData.strictMode) ? 'true' : 'false'}
                                onChange={handleChange}/>
                        </Col>
                    </Row>
                </Form.Group>
                
                {/* Search Depth */}
                <Form.Group>
                    <Row>
                        <Col xs={6}>
                            <OverlayTrigger
                                delay={{ show: 350, hide: 200 }}
                                placement="bottom"
                                overlay={<Tooltip>{SETTINGS_DESCRIPTIONS.searchDepth}</Tooltip>}>

                                <Form.Label>
                                    Search Depth: {settingData.searchDepth}
                                </Form.Label>
                                
                            </OverlayTrigger>
                        </Col>
                        
                        <Col>
                            <Form.Range id={FORM_IDS.SEARCH_SAMPLE_SIZE} 
                                name="searchDepth"
                                value={settingData.searchDepth}
                                onChange={handleChange}
                                min={1} max={10}/>
                        </Col>
                    </Row>

                    <Row>
                        <Col>
                            {
                                settingData.searchDepth > 7
                                    ? <p className="text-center" style={{ fontSize: '15px' }}>
                                        <b>**WARNING**</b> Larger values slow importing
                                    </p>
                                    : null
                            }
                        </Col>
                    </Row>
                </Form.Group>
                
                {/* Highlight Colors */}
                <Form.Group>
                    <OverlayTrigger
                        delay={{ show: 350, hide: 200 }}
                        overlay={<Tooltip>{SETTINGS_DESCRIPTIONS.highlights}</Tooltip>}>

                        <Form.Label>Highlights</Form.Label>
                        
                    </OverlayTrigger>
                    
                    
                    <Col className="ps-5 text-md">
                        <Form.Group as={Row}>
                            <Row>
                                <Col className="d-flex align-items-center">
                                    <Form.Label>Uncertain</Form.Label>
                                </Col>
                                <Col className="d-flex justify-content-begin align-items-center">
                                    <Form.Control
                                        className="bg-dark"
                                        type="color"                                        
                                        name="uncertainColor"
                                        value={settingData.highlights.uncertainColor}
                                        onChange={handleChange}
                                        title="Pick a color for uncertain downloads"/>
                                </Col>
                            </Row>
                        </Form.Group>
                        
                        <Form.Group as={Row}>
                            <Row>
                                <Col className="d-flex align-items-center">
                                    <Form.Label>Low</Form.Label>
                                </Col>
                                <Col className="d-flex justify-content-begin align-items-center">
                                    <Form.Control
                                        className="bg-dark"
                                        type="color"
                                        name="lowCertaintyColor"
                                        value={settingData.highlights.lowCertaintyColor}
                                        onChange={handleChange}
                                        title="Pick a color for low-certainty downloads"/>
                                </Col>
                            </Row>
                        </Form.Group>

                        <Form.Group as={Row}>
                            <Row>
                                <Col className="d-flex align-items-center">
                                    <Form.Label>Mid</Form.Label>
                                </Col>
                                <Col className="d-flex justify-content-begin align-items-center">
                                    <Form.Control
                                        className="bg-dark"
                                        type="color"
                                        name="midCertaintyColor"
                                        value={settingData.highlights.midCertaintyColor}
                                        onChange={handleChange}
                                        title="Pick a color for mid-certainty downloads"/>
                                </Col>
                            </Row>
                        </Form.Group>
                        
                        <Form.Group as={Row}>
                            <Row>
                                <Col className="d-flex align-items-center">
                                    <Form.Label>High</Form.Label>
                                </Col>
                                <Col className="d-flex justify-content-begin align-items-center">
                                    <Form.Control
                                        className="bg-dark"
                                        type="color"
                                        name="highCertaintyColor"
                                        value={settingData.highlights.highCertaintyColor}
                                        onChange={handleChange}
                                        title="Pick a color for high-certainty downloads"/>
                                </Col>
                            </Row>
                        </Form.Group>
                    </Col>

                </Form.Group>
            </Row>
            
            <Row xs={2} className="m-0 pt-4">
                <Col>
                    <Button className="w-100" 
                        variant="outline-primary" type="submit">
                        Save
                    </Button>
                </Col>
                
                <Col>
                    <Button className="w-100" 
                        variant="outline-secondary" type="reset">
                        Cancel
                    </Button>
                </Col>
            </Row>

        </Form>
    );
}

export default SettingsScreen;
